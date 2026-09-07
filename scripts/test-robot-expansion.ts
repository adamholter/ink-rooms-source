import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS,createState,attemptMove,solve,channelActive,type State} from '../src/puzzle.ts';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));
const baseline=read('mirror-robot-baseline');
assert.equal(LEVELS.length,44);
for(let i=0;i<27;i++)assert.deepEqual(LEVELS[i],{...baseline[i],name:({11:'Cargo Exchange',26:'Coupled Circuit'} as Record<number,string>)[i]??baseline[i].name},`Room ${i+1} preserved`);
const replacement=read('room26-design'),r26=LEVELS[25];assert.deepEqual(r26,replacement.level);
let transfer=createState(25);const transferPath=solve(transfer)!;assert.ok(transferPath);assert.equal(transferPath.length,45);
for(const d of transferPath.slice(0,replacement.deadlockWitness.solutionPrefixMoves))transfer=attemptMove(transfer,d.x,d.z)!;
assert.ok(solve(transfer));const trapped=attemptMove(transfer,-1,0)!;assert.ok(trapped&&!trapped.fall);assert.equal(solve(trapped),null,'wrong keeper order locks cargo');
for(const neighbor of [24,26])assert.notDeepEqual(transferPath,solve(createState(neighbor)),'replacement has a different solution');
// Exhaust the disabled-robot state graph, with an explicit guard against mistaking a cutoff for proof.
function exhaustedWithoutRobot(index:number){
 const level=LEVELS[index];LEVELS[index]={...level,robots:[]};
 try{const initial=createState(index),queue=[initial],seen=new Set<string>();
  const key=(s:State)=>`${s.player.x},${s.player.z}|${s.boxes.map(b=>`${b.x},${b.z}`).sort().join(';')}`;seen.add(key(initial));
  for(let c=0;c<queue.length;c++){assert.ok(queue.length<100000,'disabled search must exhaust within bound');const s=queue[c];assert.equal(s.won,false,'robot must be necessary');
   for(const [dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){const n=attemptMove(s,dx,dz);if(!n||n.fall)continue;const k=key(n);if(!seen.has(k)){seen.add(k);queue.push(n);}}
  }return queue.length;
 }finally{LEVELS[index]=level;}
}
for(const design of read('robot-room-design')){
 const i=design.room-1,level=LEVELS[i];assert.deepEqual(level,design.level);
 assert.notDeepEqual(level.map,baseline[i].map,'every patrol layout rebuilt');
 assert.equal('arrows' in level,false,'no steering-arrow rules remain');
 assert.equal([...level.map.join('')].filter(c=>!'#~E'.includes(c)).length,design.metrics.floorCellsExcludingExit);
 for(const d of [...level.elevators||[],...level.bridges||[]])assert.equal(level.map[d.z][d.x],' ','machines use separate floor cells');
 for(const r of level.robots||[])assert.ok(!['#','~','E','$','@'].includes(level.map[r.z][r.x]),'robot starts unobstructed');
 const initial=createState(i),path=solve(initial);assert.ok(path);assert.deepEqual(path,design.path);
 let state=initial,robotPushes=0;
 for(const d of path){const before=state,mid=attemptMove(before,d.x,d.z,false)!;state=attemptMove(before,d.x,d.z)!;assert.ok(state&&!state.fall);robotPushes+=state.pushes-mid.pushes;
  const direction=[{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}].findIndex(p=>p.x===d.x&&p.z===d.z);
  state.robots!.forEach((r,j)=>{assert.equal(r.direction,direction);assert.ok(r.blocked?(r.x===before.robots![j].x&&r.z===before.robots![j].z):(r.x===before.robots![j].x+d.x&&r.z===before.robots![j].z+d.z));});}
 assert.ok(state.won);assert.equal(state.pushes,design.metrics.pushes);assert.equal(robotPushes,design.metrics.robotPushes);
 const w=design.designWitness;if(w){let s=initial;for(const d of design.path.slice(0,w.afterMoves))s=attemptMove(s,d.x,d.z)!;
  const n=attemptMove(s,w.action.x,w.action.z)!;assert.ok(n&&!n.fall,'staging mistake is legal without an immediate fall');
  // Relax actor coordination and other crates. If cargo still cannot reach any goal, the full puzzle cannot either.
  const floor=(x:number,z:number)=>level.map[z]?.[x]!==undefined&&!'#~E'.includes(level.map[z][x]);
  const queue:{x:number;z:number}[]=[];level.map.forEach((row,z)=>[...row].forEach((c,x)=>{if(c==='.')queue.push({x,z});}));
  const reach=new Set(queue.map(p=>`${p.x},${p.z}`));
  for(let q=0;q<queue.length;q++)for(const [dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){const x=queue[q].x-dx,z=queue[q].z-dz,k=`${x},${z}`;if(floor(x,z)&&floor(x-dx,z-dz)&&!reach.has(k)){reach.add(k);queue.push({x,z});}}
  assert.ok(n.boxes.some(b=>b.x===w.strandedBox.x&&b.z===w.strandedBox.z&&!reach.has(`${b.x},${b.z}`)),'stranded cargo is unreachable even under relaxed controls');
 }
 const c=design.coordinationWitness;if(c){let s=initial;for(const d of path.slice(0,c.afterMoves))s=attemptMove(s,d.x,d.z)!;const n=attemptMove(s,c.action.x,c.action.z)!;assert.ok(n&&!n.fall);assert.equal(n.pushes,s.pushes);assert.ok(n.robots!.some(r=>r.blocked));assert.equal(solve(s)!.length,c.optimalRemaining);assert.equal(1+solve(n)!.length,c.detourRemaining);assert.ok(c.detourRemaining-c.optimalRemaining>=4);}
 const exhausted=exhaustedWithoutRobot(i);assert.equal(exhausted,design.robotDisabled.states);
 console.log(`${design.room} ${level.name}: ${path.length} moves, ${state.pushes} pushes, ${robotPushes} robot pushes; robot-disabled graph exhausted ${exhausted} states`);
}
console.log('Original rooms preserved, room26 circuit trap, mirror chapter routes and coordination proofs pass.');
