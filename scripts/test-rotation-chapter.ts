import assert from 'node:assert/strict';
import {minimumPushes,permanentGoalProof} from './lib/rotation-quality.ts';
import {readFileSync} from 'node:fs';
import {LEVELS,createState,attemptMove,solve,rotorIndex,tileAt,type State,type Level} from '../src/puzzle.ts';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));
const clean=(v:unknown)=>JSON.parse(JSON.stringify(v));
assert.equal(LEVELS.length,58);
assert.deepEqual(LEVELS.slice(0,36),read('pre-rotation-levels'),'earlier 36 rooms remain identical');
for(const [offset,level] of read('pre-rotation-difficulty').entries()) {
 if(offset!==2) assert.deepEqual(LEVELS[36+offset],level,'existing rotation tutorials and other rooms remain unchanged');
}
assert.equal(new Set(LEVELS.map(l=>l.name)).size,LEVELS.length,'room names are unique');
const dirs=[{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
function exhaust(initial:State){
 const key=(s:State)=>JSON.stringify([s.player,s.boxes.map(p=>`${p.x},${p.z}`).sort(),s.robots?.map(p=>[p.x,p.z]),s.rotations]);
 const queue=[initial],seen=new Set([key(initial)]);
 for(let c=0;c<queue.length;c++){
  assert.ok(queue.length<350000,'proof must exhaust, not hit budget');const s=queue[c];if(s.won)return {unsolvable:false,states:queue.length};
  for(const d of dirs){const n=attemptMove(s,d.x,d.z);if(!n||n.fall)continue;const k=key(n);if(!seen.has(k)){seen.add(k);queue.push(n);}}
 }return {unsolvable:true,states:queue.length,exhaustive:true};
}
function withLevel(index:number,l:Level,fn:()=>void){const old=LEVELS[index];try{LEVELS[index]=l;fn();}finally{LEVELS[index]=old;}}
for(const design of read('rotation-room-design')){
 const index=design.id-1,l=LEVELS[index];assert.deepEqual(l,design.level);let s=createState(index);
 if(index===38||index===43) {
  assert.ok(design.difficulty,'hard rotation rooms include independent difficulty proofs');
  const pushes=minimumPushes(s);
  assert.equal(pushes,design.difficulty.minimumPushes);
  assert.ok(pushes>=(index===38?8:10),'push requirement cannot be padded by extra walking');
  assert.ok(design.moves>=44);
  assert.equal(permanentGoalProof(s).unsolvable,true,'every solution requires repositioning cargo from a filled mark');
 }
 for(const r of l.rotators||[]){assert.ok(Number.isInteger(r.radius)&&r.radius>=1);assert.ok(l.switches?.some(p=>p.channel===r.channel));
  for(const p of [...l.switches||[],...l.elevators||[],...l.bridges||[]])assert.equal(rotorIndex(l,p),-1,'fixed machinery outside rotator');
  for(let z=r.z-r.radius;z<=r.z+r.radius;z++)for(let x=r.x-r.radius;x<=r.x+r.radius;x++){assert.notEqual(l.map[z]?.[x],undefined);assert.notEqual(l.map[z][x],'E');}
 }
 assert.equal(solve(s)?.length,design.moves,'independent shortest-move solver agrees');
 for(const d of design.path){s=attemptMove(s,d.x,d.z)!;assert.ok(s&&!s.fall);for(const p of [s.player,...s.boxes,...s.robots||[]])assert.ok(!['#','~'].includes(tileAt(l,p.x,p.z,s)),'actors rest on valid floor');}
 assert.ok(s.won);assert.equal(s.moves,design.moves);assert.equal(s.pushes,design.pushes);
 const necessity=design.rotationNecessity||design.secondaryNecessity;
 if(necessity){const disabled=l.rotators?.length?{...l,rotators:[]}:l.elevators?.length?{...l,elevators:l.elevators.map(e=>({...e,high:e.low}))}:{...l,robots:[]};withLevel(index,disabled,()=>assert.deepEqual(exhaust(createState(index)),necessity));}
 if(l.bridges?.length)withLevel(index,{...l,bridges:l.bridges.map(b=>({...b,channel:-99}))},()=>assert.ok(exhaust(createState(index)).unsolvable,'bridge essential'));
 if(design.iceCounterfactual)withLevel(index,{...l,ice:[]},()=>{assert.equal(solve(createState(index))?.length,design.iceCounterfactual.moves);assert.notEqual(design.moves,design.iceCounterfactual.moves,'ice changes optimal route');});
 for(const w of [...design.mechanicWitnesses||[],...design.wrongStagingWitness?[design.wrongStagingWitness]:[]]){
  let before=createState(index);for(const d of design.path.slice(0,w.afterMoves))before=attemptMove(before,d.x,d.z)!;
  assert.deepEqual(clean(before),{...w.before,level:index});const after=attemptMove(before,w.action.x,w.action.z)!;assert.ok(after&&!after.fall);assert.deepEqual(clean(after),{...w.after,level:index});
  if(w.proof)assert.deepEqual(exhaust(after),w.proof,'wrong staging exhaustively unsolvable');
 }
 console.log(`${design.id} ${l.name}: ${s.moves} moves, ${s.pushes} pushes; necessity, staging and counterfactual proofs passed`);
}
console.log('Rotation chapter passed; first36 unchanged.');
