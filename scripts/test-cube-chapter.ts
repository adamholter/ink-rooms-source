import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS,createState,attemptMove,solve,type State} from '../src/puzzle.ts';
import {cubeFace,cubeCellPosition,cubeDirection,CUBE_BASES} from '../src/cube-topology.ts';
const read=(f:string)=>JSON.parse(readFileSync(new URL(`./fixtures/${f}.json`,import.meta.url),'utf8'));
const designs=read('cube-room-design').levels;
assert.equal(LEVELS.length,58);
assert.deepEqual(LEVELS.slice(0,44),read('pre-cube-levels'),'all previous44 layouts stay identical');
assert.equal(new Set(LEVELS.map(l=>l.name)).size,LEVELS.length);
const dirs:Record<string,{x:number;z:number}>={R:{x:1,z:0},D:{x:0,z:1},L:{x:-1,z:0},U:{x:0,z:-1}};
const key=(s:State)=>JSON.stringify([s.player,s.boxes.map(b=>`${b.x},${b.z}`).sort()]);
function pushProof(initial:State,disableCargoEdges=false) {
 const size=LEVELS[initial.level].cube!.size,buckets:State[][]=[[initial]],best=new Map([[key(initial),0]]);
 for(let cost=0;cost<buckets.length;cost++){
  const q=buckets[cost]||[];
  for(let c=0;c<q.length;c++){
   const s=q[c];if(best.get(key(s))!==cost)continue;if(s.won)return {unsolvable:false,pushes:cost};
   for(const d of Object.values(dirs)){
    const n=attemptMove(s,d.x,d.z);if(!n||n.fall)continue;
    if(disableCargoEdges&&n.boxes.some((p,i)=>cubeFace(size,p)!==cubeFace(size,s.boxes[i])))continue;
    const score=cost+n.pushes-s.pushes,k=key(n);if((best.get(k)??Infinity)<=score)continue;
    best.set(k,score);(buckets[score]??=[]).push(n);
   }
   assert.ok(best.size<350000,'proof must exhaust within budget');
  }
 }
 return {unsolvable:true,pushes:null};
}
for(const f of designs){
 const index=f.room-1,l=LEVELS[index],size=l.cube!.size;
 assert.ok(size>=3);assert.equal(l.map.length,size);assert.ok(l.map.every(row=>row.length===size*6&&/^[ ~.$@E]+$/.test(row)));assert.ok(!l.map.join('').includes('#'),'cube blockers are holes');
 assert.deepEqual(l.map,f.map);assert.equal(l.name,f.name);assert.equal(l.map.join('').split('@').length-1,1);assert.equal(l.map.join('').split('E').length-1,1);
 assert.ok(!l.rotators&&!l.ice&&!l.elevators&&!l.robots,'cube chapter introduces its own mechanic');
 const initial=createState(index);assert.equal(initial.cubeTurn,0);
 assert.equal(l.map.join('').split('.').length-1,initial.boxes.length);
 assert.equal(solve(initial)?.length,f.moves,'production hint solver finds shortest winning route');
 let state=initial,playerCrossings=0,crateCrossings=0;const faces=new Set([cubeFace(size,state.player)]);
 for(const code of f.winningPath){const d=dirs[code],before=structuredClone(state),next=attemptMove(state,d.x,d.z);assert.deepEqual(state,before,'moves are immutable');assert.ok(next&&!next.fall);playerCrossings+=Number(cubeFace(size,state.player)!==cubeFace(size,next.player));crateCrossings+=next.boxes.filter((p,i)=>cubeFace(size,p)!==cubeFace(size,state.boxes[i])).length;state=next;faces.add(cubeFace(size,state.player));}
 assert.deepEqual(state,f.finalState);assert.ok(state.won);assert.equal(playerCrossings,f.playerCrossings);assert.equal(crateCrossings,f.crateCrossings);assert.equal(faces.size,f.playerFacesVisited.length);
 assert.deepEqual(pushProof(initial),{unsolvable:false,pushes:f.minimumPushes});assert.equal(pushProof(initial,true).unsolvable,true,'crate edge crossings must be necessary');
 if(index>44){assert.equal(faces.size,6);assert.ok(f.minimumPushes>=7);}
 console.log(`${f.room} ${l.name}: ${f.moves} moves, minimum ${f.minimumPushes} pushes, ${crateCrossings} cargo crossings; engine replay and necessity proofs passed`);
}

// Compare authored cube layouts under all 24 physical cube orientations.
function cubeSignature(index:number,pieces:boolean) {
 const l=LEVELS[index],n=l.cube!.size,variants:string[]=[];
 for(const basis of CUBE_BASES)for(let turn=0;turn<4;turn++){
  const r=cubeDirection(1,0,turn),d=cubeDirection(0,1,turn);
  const right=basis.u.map((v,i)=>v*r.x+basis.v[i]*r.z),down=basis.u.map((v,i)=>v*d.x+basis.v[i]*d.z);
  const cells:string[]=[];
  for(let z=0;z<n;z++)for(let x=0;x<n*6;x++)if(!['#','~'].includes(l.map[z][x])){
   const p=cubeCellPosition(n,{x,z});
   const dot=(axis:readonly number[])=>Math.round(2*axis.reduce((sum,v,i)=>sum+v*p[i],0));
   cells.push(`${dot(right)},${dot(basis.normal)},${dot(down)}:${pieces?l.map[z][x]:' '}`);
  }
  variants.push(cells.sort().join('|'));
 }
 return variants.sort()[0];
}
for(const pieces of [false,true])assert.equal(new Set(designs.map((d:{room:number})=>cubeSignature(d.room-1,pieces))).size,4,'cube layouts differ under all24 rotations');
