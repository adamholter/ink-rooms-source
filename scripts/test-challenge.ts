import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS,createState,attemptMove,solve,channelActive,type State,type Level} from '../src/puzzle.ts';
import {cubeFace,cubeCellPosition,cubeDirection,CUBE_BASES} from '../src/cube-topology.ts';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));
const rows=[...read('challenge-flat-design'),...read('challenge-cube-design')];
assert.equal(LEVELS.length,58);assert.deepEqual(LEVELS.slice(0,48),read('pre-challenge-levels'),'existing puzzles stay unchanged');
assert.equal(rows.length,10);assert.equal(new Set(LEVELS.map(l=>l.name)).size,58);
const directions=[{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}],letters='URDL';
// Walking and rotating are free in this search; corridor length cannot raise the push score.
function minimumPushes(initial:State){
 const key=(s:State)=>JSON.stringify([s.player,s.boxes.map(b=>`${b.x},${b.z}`).sort(),s.robots?.map(r=>[r.x,r.z]),s.rotations,s.cubeTurn]);
 const buckets:State[][]=[[initial]],best=new Map([[key(initial),0]]);
 for(let cost=0;cost<buckets.length;cost++){const q=buckets[cost]||[];for(let i=0;i<q.length;i++){
  const s=q[i];if(best.get(key(s))!==cost)continue;if(s.won)return cost;
  for(const d of directions){const next=attemptMove(s,d.x,d.z);if(!next||next.fall)continue;const score=cost+next.pushes-s.pushes,k=key(next);if((best.get(k)??Infinity)<=score)continue;best.set(k,score);(buckets[score]??=[]).push(next);}
  assert(best.size<350000,'push proof must complete within a bounded search');
 }}throw Error('No winning route');
}
for(let j=0;j<rows.length;j++){
 const row=rows[j],index=48+j,level=LEVELS[index];assert.deepEqual(level,{...row.level,challenge:true});
 assert(level.ice?.length);assert(level.cube||level.rotators?.length||level.robots?.length,'ice must interact with another mechanic');
 const initial=createState(index),moves=solve(initial);assert(moves);assert.equal(moves.length,row.moves??row.metrics.moves,'production hint finds proven shortest route');
 let state=initial,bridgeUses=0;
 for(const c of row.path){const d=directions[letters.indexOf(c)],before=structuredClone(state),next=attemptMove(state,d.x,d.z);assert(next&&!next.fall);assert.deepEqual(state,before,'moves leave undo snapshots intact');state=next;
  bridgeUses+=(level.bridges||[]).filter(p=>state.player.x===p.x&&state.player.z===p.z||state.boxes.some(b=>b.x===p.x&&b.z===p.z)).length;
 }
 assert(state.won);assert.equal(state.moves,moves.length);assert(row.minimumPushes>=12);assert.equal(minimumPushes(initial),row.minimumPushes);
 if(level.bridges?.length)assert(bridgeUses>0,'bridge is used in the winning route');
 try{
  if(level.cube){
   LEVELS[index]={...level,ice:[]};assert.equal(solve(initial),null,'cube ice is necessary');
   if(level.bridges?.length){LEVELS[index]={...level,bridges:level.bridges.map(b=>({...b,channel:-999}))};assert.equal(solve(initial),null,'cube bridges cannot be bypassed');}
  }else{
   LEVELS[index]=level.rotators?.length?{...level,rotators:[]}:{...level,robots:[]};
   const noPrimary={...initial,...(level.robots?.length?{robots:[]}:{}),...(level.rotators?.length?{rotations:[]}:{})};assert.equal(solve(noPrimary),null,'primary mechanic cannot be bypassed');
  }
 }finally{LEVELS[index]=level;}
 console.log(`${index+1} ${level.name}: ${moves.length} shortest moves, ${row.minimumPushes} minimum pushes, replay and mechanic necessity pass`);
}
// Physical cube rotations must not disguise a reused floor layout.
function signature(level:Level){const n=level.cube!.size,variants:string[]=[];for(const basis of CUBE_BASES)for(let turn=0;turn<4;turn++){
 const r=cubeDirection(1,0,turn),d=cubeDirection(0,1,turn),right=basis.u.map((v,i)=>v*r.x+basis.v[i]*r.z),down=basis.u.map((v,i)=>v*d.x+basis.v[i]*d.z),cells:string[]=[];
 for(let z=0;z<n;z++)for(let x=0;x<n*6;x++)if(!['#','~'].includes(level.map[z][x])){const p=cubeCellPosition(n,{x,z});const dot=(axis:readonly number[])=>Math.round(2*axis.reduce((sum,v,i)=>sum+v*p[i],0));cells.push(`${dot(right)},${dot(basis.normal)},${dot(down)}`)}variants.push(cells.sort().join('|'));}return variants.sort()[0];}
const cubes=LEVELS.filter(l=>l.cube);assert.equal(new Set(cubes.map(signature)).size,cubes.length,'all cube floor layouts differ under all24 orientations');
