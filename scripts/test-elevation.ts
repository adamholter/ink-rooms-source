import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS,createState,attemptMove,solve,heightAt,type Level} from '../src/puzzle.ts';

const originalCount=LEVELS.length;
function fixture(map:string[],heights:number[][],fn:(index:number)=>void){
  const index=LEVELS.length;LEVELS.push({name:'Rules fixture',subtitle:'',hint:'',jumping:true,map,heights});
  try{fn(index);}finally{LEVELS.pop();}
}
fixture(['@   .E',' $    ','      '],[[0,1,2,2,2,2],[0,0,0,0,0,0],[0,0,0,0,0,0]],index=>{
  const initial=createState(index),snap=structuredClone(initial);
  const step=attemptMove(initial,1,0)!;assert.ok(step);assert.equal(heightAt(LEVELS[index],step.player),1,'half-steps auto climb');
  assert.deepEqual(initial,snap,'climbing is immutable');
  const rise={...initial,player:{x:2,z:1}};
  const climbed=attemptMove(rise,0,-1)!;assert.ok(climbed);assert.equal(heightAt(LEVELS[index],climbed.player),2,'two-tier ledges auto climb');
  LEVELS[index].heights![0][2]=3;assert.equal(attemptMove(rise,0,-1),null,'climbing cannot exceed two tiers');
});
fixture(['@~ .E','   $ '],[[0,0,2,2,2],[0,0,0,0,0]],index=>{
  const initial=createState(index),snap=structuredClone(initial);
  assert.equal(attemptMove(initial,1,0)?.fall?.kind,'player');
  assert.deepEqual(initial,snap);
  LEVELS[index].map[0]='@# .E';assert.equal(attemptMove(initial,1,0),null,'solid obstacles remain blocked');
});
fixture(['     ',' @$ .','    E'],[[2,2,2,0,0],[2,2,2,0,0],[2,2,2,0,0]],index=>{
  const initial=createState(index),snap=structuredClone(initial);
  const dropped=attemptMove(initial,1,0)!;
  assert.equal(dropped.fall,null,'landing on a lower floor is permanent, not an off-world fall');
  assert.equal(heightAt(LEVELS[index],dropped.boxes[0]),0);assert.equal(heightAt(LEVELS[index],dropped.player),2);
  assert.deepEqual(initial,snap);
  assert.equal(attemptMove(dropped,1,0),null,'must regain pushing access on the lower floor');
  const uphill={...dropped,player:{x:4,z:1}};
  assert.equal(attemptMove(uphill,-1,0),null,'crate cannot be pushed back upstairs');
  const below={...initial,player:{x:3,z:1}};
  assert.equal(attemptMove(below,-1,0),null,'player cannot push an upper crate from below');
});
fixture(['     ',' @$ .','    E'],[[2,2,2,0,2],[2,2,2,0,2],[2,2,2,0,2]],index=>{
  const dropped=attemptMove(createState(index),1,0)!;
  assert.equal(dropped.fall,null);assert.equal(solve(dropped),null,'dropping the only upper crate loses the upper target');
});
assert.equal(LEVELS.length,originalCount);
console.log('Elevation rules pass: automatic ledges, climb limits, crate collisions, persistent drops, uphill rejection, immutable states.');

const fixtures=JSON.parse(readFileSync(new URL('./fixtures/elevation-solutions.json',import.meta.url),'utf8'));
const directions:Record<string,[number,number]>={U:[0,-1],R:[1,0],D:[0,1],L:[-1,0]};
for(let offset=0;offset<2;offset++){
  const index=12+offset,level=LEVELS[index],entry=fixtures.levels[offset];
  let state=createState(index),drops=0;
  for(const label of entry.actions){
    const [dx,dz]=directions[label];
    const before=structuredClone(state),next=attemptMove(state,dx,dz);
    assert.ok(next&&!next.fall,`${level.name} legal solution action ${label}`);
    assert.deepEqual(state,before,'movement must be immutable');
    drops+=next.boxes.filter((box,i)=>heightAt(level,box)<heightAt(level,state.boxes[i])).length;
    state=next;
  }
  assert.equal(state.won,true,`${level.name} exits after filling every target`);
  assert.equal(state.pushes,entry.pushes);
  if(offset>0)assert.ok(drops>0,'each later room must require dropping a crate');
  if(entry.trapActions){
    let trapped=createState(index),dropped=false,beforeFinal=trapped;
    for(const label of entry.trapActions){
      const [dx,dz]=directions[label];
      const next=attemptMove(trapped,dx,dz);assert.ok(next&&!next.fall,'wrong drops must land on floor');
      beforeFinal=trapped;dropped=next.boxes.some((b,i)=>heightAt(level,b)<heightAt(level,trapped.boxes[i]));trapped=next;
    }
    assert.ok(dropped,'last trap action must be a floor-to-floor drop');assert.ok(solve(beforeFinal),`${level.name} must be solvable immediately before the bad drop`);assert.equal(solve(trapped),null,`${level.name} premature drop must lose a required route`);
  }
}
for(let index=12;index<17;index++){
  const path=solve(createState(index));assert.ok(path);
  let state=createState(index);
  for(const d of path){assert.equal('jump' in d,false);state=attemptMove(state,d.x,d.z)!;assert.ok(state&&!state.fall);}
  assert.ok(state.won,'every elevated room is playable with directions alone');
}
for(let z=1;z<=4;z++){assert.equal(LEVELS[12].map[z][3],' ','room 13 gap is filled');assert.equal(LEVELS[12].heights![z][3],2,'filled strip joins upper terrace');}
console.log('All elevated rooms finish with directional movement only; permanent-drop traps pass.');
