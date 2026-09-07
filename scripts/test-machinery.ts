import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {LEVELS,createState,attemptMove,solve,heightAt,channelActive,type Level} from '../src/puzzle.ts';
const accepted=JSON.parse(readFileSync(new URL('./fixtures/accepted-first17.json',import.meta.url),'utf8'));
for (const index of [0,1,2,3,12,13]) assert.deepEqual(LEVELS[index],accepted[index],`Accepted tutorial ${index+1} stays unchanged`);
function fixture(level:Level,check:(index:number)=>void){const i=LEVELS.length;LEVELS.push(level);try{check(i);}finally{LEVELS.pop();}}
fixture({name:'Lift handoff',subtitle:'',hint:'',jumping:true,map:['     ',' @$ .','    E'],heights:[[0,0,0,0,0],[0,2,0,2,2],[0,0,0,0,0]],switches:[{x:1,z:1,channel:1}],elevators:[{x:2,z:1,low:0,high:2,channel:1}]},i=>{
 const s=createState(i),before=structuredClone(s),l=LEVELS[i];assert.ok(channelActive(l,1,s),'player activates switch');
 assert.equal(heightAt(l,s.boxes[0],s),2,'powered elevator raises its cargo');
 const n=attemptMove(s,1,0)!;assert.ok(n&&!n.fall);assert.equal(heightAt(l,n.boxes[0],n),2,'unloaded crate stays upstairs');assert.equal(heightAt(l,n.player,n),0,'player rides down when leaving the switch');assert.deepEqual(s,before,'move and power resolution immutable');
 const held={...s,player:{x:0,z:1},boxes:[{x:1,z:1}]};assert.ok(channelActive(l,1,held),'crate also activates switch');assert.equal(channelActive(l,2,held),false,'circuits are independent');
});
fixture({name:'Bridge release',subtitle:'',hint:'',jumping:true,map:['     ',' @$ .','    E'],switches:[{x:1,z:1,channel:1}],bridges:[{x:2,z:1,height:0,channel:1}]},i=>{
 const s=createState(i),n=attemptMove(s,-1,0)!;assert.equal(n.fall?.kind,'box','releasing occupied bridge is an undoable fall');assert.equal(s.fall,null,'original state survives release');
 const off={...s,player:{x:1,z:2},boxes:[{x:4,z:0}]};assert.equal(attemptMove(off,1,0)?.fall,null);assert.equal(attemptMove({...off,player:{x:1,z:1}},1,0)?.fall?.kind,'player','bridge folds if its only holder steps onto it');
});
if(LEVELS.length>17){
 assert.equal(LEVELS.length,58);
 const output=[];
 for(let i=17;i<27;i++){
  const level=LEVELS[i],initial=createState(i);assert.equal(initial.boxes.length,level.map.join('').split('.').length-1,'one target per crate');
  for(const s of level.switches||[])assert.ok(!['#','~'].includes(level.map[s.z][s.x]),'switch on solid floor');
  for(const e of [...level.elevators||[],...level.bridges||[]])assert.equal(level.map[e.z][e.x],' ','machine on its own floor cell');
  const start=performance.now(),path=solve(initial);assert.ok(path,`${i+1} ${level.name} has a direction-only solution`);let state=initial,raises=0,bridges=0,drops=0,releasedTemporary=false;
  for(const d of path){const old=state;state=attemptMove(state,d.x,d.z)!;assert.ok(state&&!state.fall);assert.equal('jump' in d,false);
   for(const e of level.elevators||[])if(!channelActive(level,e.channel,old)&&channelActive(level,e.channel,state)&&state.boxes.some(b=>b.x===e.x&&b.z===e.z))raises++;
   if(level.bridges?.some(b=>b.x===state.player.x&&b.z===state.player.z))bridges++;
   releasedTemporary ||= (level.switches||[]).some(p=>level.map[p.z][p.x]!=='.'&&old.boxes.some(b=>b.x===p.x&&b.z===p.z)&&!state.boxes.some(b=>b.x===p.x&&b.z===p.z));
   drops+=state.boxes.filter((b,j)=>heightAt(level,b,state)<heightAt(level,old.boxes[j],old)&&!level.elevators?.some(e=>e.x===b.x&&e.z===b.z)).length;
  }
  assert.ok(state.won);if(level.elevators?.length)assert.ok(raises>0,`${level.name} must transport a crate upstairs`);if(level.bridges?.length)assert.ok(bridges>0,`${level.name} must cross a powered bridge`);
  if(i>=24){assert.ok(releasedTemporary,`${level.name} reuses a temporary switch crate`);if(i!==25)assert.ok(drops>0,`${level.name} requires a lower-floor delivery`);}
  try {
   if(level.elevators?.length){LEVELS[i]={...level,elevators:level.elevators.map(e=>({...e,high:e.low}))};assert.equal(solve(initial),null,`${level.name} cannot bypass the lifts`);}
   if(level.bridges?.length){LEVELS[i]={...level,bridges:level.bridges.map(b=>({...b,channel:-99}))};assert.equal(solve(initial),null,`${level.name} cannot bypass the bridges`);}
  }finally{LEVELS[i]=level;}
  output.push({room:i+1,name:level.name,moves:path.length,pushes:state.pushes,raises,bridges,drops,path});console.log(`${i+1} ${level.name}: ${path.length} moves, ${state.pushes} pushes, ${raises} cargo lifts, ${bridges} bridge crossings, ${drops} drops, ${Math.round(performance.now()-start)}ms`);
 }
 writeFileSync(new URL('./fixtures/machinery-solutions.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
}
console.log('Machinery rules, occupancy, independent circuits, undo snapshots, and original room preservation pass.');
