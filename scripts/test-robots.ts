import assert from 'node:assert/strict';
import {LEVELS, attemptMove, channelActive, createState, solve, type Level, type State} from '../src/puzzle.ts';

function fixture(level: Level, check: (index: number) => void): void {
  const index = LEVELS.length;
  LEVELS.push(level);
  try { check(index); } finally { LEVELS.pop(); }
}

const shell = (map: string[], extra: Partial<Level> = {}): Level => ({name:'Robot rule fixture', subtitle:'', hint:'', map, ...extra});

fixture(shell([
  '#######',
  '#     #',
  '# @   #',
  '#     #',
  '#     #',
  '#######',
], {robots:[{x:3,z:3,direction:2}]}), index => {
  let state=createState(index);
  const initial=structuredClone(state);
  state=attemptMove(state,1,0)!;
  assert.deepEqual(state.robots?.[0],{x:4,z:3,direction:1,blocked:false},'east input moves east regardless of old facing');
  state=attemptMove(state,-1,0)!;
  assert.deepEqual(state.robots?.[0],{x:3,z:3,direction:3,blocked:false},'immediate reversal reverses the robot');
  state=attemptMove(state,0,-1)!;
  assert.deepEqual(state.robots?.[0],{x:3,z:2,direction:0,blocked:false},'north input moves north');
  state=attemptMove(state,0,1)!;
  assert.deepEqual(state.robots?.[0],{x:3,z:3,direction:2,blocked:false},'south input moves south');
  assert.deepEqual(createState(index),initial,'level state remains immutable');
});

fixture(shell([
  '######',
  '#@   #',
  '# #  #',
  '#    #',
  '######',
], {robots:[{x:1,z:2,direction:3}]}), index => {
  const initial=createState(index);
  const snapshot=structuredClone(initial);
  const east=attemptMove(initial,1,0)!;
  assert.deepEqual(east.robots?.[0],{x:1,z:2,direction:1,blocked:true},'blocked robot still turns to the attempted heading');
  assert.deepEqual(east.player,{x:2,z:1},'player moves while the robot independently brakes');
  const fartherEast=attemptMove(east,1,0)!;
  const south=attemptMove(fartherEast,0,1)!;
  assert.deepEqual(south.robots?.[0],{x:1,z:3,direction:2,blocked:false},'later input changes the player robot offset');
  assert.deepEqual(south.player,{x:3,z:2});
  assert.equal(attemptMove(initial,-1,0),null,'blocked player input creates no robot tick');
  assert.deepEqual(initial,snapshot,'turns do not mutate prior history');
  const staged=attemptMove(initial,1,0,false)!;
  assert.deepEqual(staged.robots,initial.robots,'animation staging moves only the player');
  assert.equal(staged.moves,1);
  assert.deepEqual(attemptMove(structuredClone(initial),1,0),east,'undo and replay reproduce the same turn');
});

fixture(shell([
  '#######',
  '#     #',
  '# @   #',
  '#     #',
  '#     #',
  '#######',
], {robots:[{x:3,z:3,direction:0}]}), index => {
  const initial=createState(index);
  const otherFacing: State={...initial,robots:initial.robots!.map(r=>({...r,direction:2}))};
  assert.deepEqual(attemptMove(initial,1,0)?.robots,attemptMove(otherFacing,1,0)?.robots,'old facing has no effect on the next command');
  assert.deepEqual(attemptMove(initial,0,-1)?.robots?.[0],{x:3,z:2,direction:0,blocked:false},'input is a world-space direction');
});

fixture(shell([
  '######',
  '#   @#',
  '# $  #',
  '######',
], {robots:[{x:3,z:2,direction:1}]}), index => {
  const moved=attemptMove(createState(index),-1,0)!;
  assert.deepEqual(moved.player,{x:3,z:1});
  assert.deepEqual(moved.robots?.[0],{x:2,z:2,direction:3,blocked:false},'input opposite the old facing reverses and moves immediately');
});

fixture(shell([
  '######',
  '#@   #',
  '# $  #',
  '######',
], {
  robots:[{x:1,z:2,direction:0}],
  heights:[[0,0,0,0,0,0],[0,0,0,0,0,0],[0,1,1,0,0,0],[0,0,0,0,0,0]],
}), index => {
  const moved=attemptMove(createState(index),1,0)!;
  assert.deepEqual(moved.robots?.[0],{x:2,z:2,direction:1,blocked:false},'robot enters the crate old cell');
  assert.deepEqual(moved.boxes,[{x:3,z:2}],'robot can push one crate downhill');
  assert.equal(moved.pushes,1);
});

fixture(shell([
  '#######',
  '#@    #',
  '# $$  #',
  '#######',
], {robots:[{x:1,z:2,direction:0}]}), index => {
  const moved=attemptMove(createState(index),1,0)!;
  assert.equal(moved.robots?.[0].blocked,true,'robot cannot push two crates');
  assert.deepEqual(moved.boxes,[{x:2,z:2},{x:3,z:2}]);
  assert.equal(moved.pushes,0);
});

fixture(shell([
  '#######',
  '#@    #',
  '# $   #',
  '#######',
], {
  robots:[{x:1,z:2,direction:0}],
  heights:[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,1,2,0,0,0],[0,0,0,0,0,0,0]],
}), index => {
  const moved=attemptMove(createState(index),1,0)!;
  assert.equal(moved.robots?.[0].blocked,true,'robot cannot push cargo uphill');
  assert.deepEqual(moved.boxes,[{x:2,z:2}]);
});

fixture(shell([
  '#######',
  '#@    #',
  '#     #',
  '#######',
], {robots:[{x:1,z:2,direction:0},{x:2,z:2,direction:0}]}), index => {
  const moved=attemptMove(createState(index),1,0)!;
  assert.equal(moved.robots?.[0].blocked,true,'robot treats another robot as solid');
  assert.deepEqual(moved.robots?.map(({x,z})=>({x,z})),[{x:1,z:2},{x:3,z:2}],'robots never overlap');
  const beside: State={...createState(index),player:{x:1,z:1}};
  assert.equal(attemptMove(beside,0,1),null,'player cannot enter a robot cell');
});

fixture(shell([
  '#######',
  '#@    #',
  '#     #',
  '#######',
], {robots:[{x:3,z:2,direction:0}],switches:[{x:3,z:2,channel:7}]}), index => {
  const initial=createState(index);
  assert.equal(channelActive(LEVELS[index],7,initial),true,'robot occupancy powers a switch');
  const moved=attemptMove(initial,0,1)!;
  assert.deepEqual(moved.robots?.[0],{x:3,z:2,direction:2,blocked:true},'robot brakes at a platform edge');
  assert.equal(channelActive(LEVELS[index],7,moved),true,'braking keeps the switch held');
});

fixture(shell([
  '#######',
  '#@    #',
  '#     #',
  '#######',
], {
  robots:[{x:2,z:2,direction:0}],
  heights:[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,1,2,1,0,0,0],[0,0,0,0,0,0,0]],
}), index => {
  const moved=attemptMove(createState(index),1,0)!;
  assert.deepEqual(moved.robots?.[0],{x:2,z:2,direction:1,blocked:true},'robot brakes at a height change');
});

fixture(shell([
  '#####',
  '#@  #',
  '#  ##',
  '#####',
], {
  robots:[{x:3,z:1,direction:0}],
  switches:[{x:1,z:1,channel:4}],
  bridges:[{x:3,z:1,height:0,channel:4}],
}), index => {
  const initial=createState(index);
  assert.equal(channelActive(LEVELS[index],4,initial),true);
  const released=attemptMove(initial,0,1)!;
  assert.deepEqual(released.fall,{kind:'robot',index:0},'released bridge checks robot occupancy');
  assert.equal(initial.fall,null,'machinery fall remains undoable');
});

fixture(shell([
  '########',
  '## $ .##',
  '########',
  '#@    E#',
  '########',
], {robots:[{x:2,z:1,direction:3}]}), index => {
  const initial=createState(index);
  const first=attemptMove(initial,1,0)!;
  assert.deepEqual(first.boxes,[{x:4,z:1}],'player command remotely pushes inaccessible cargo');
  assert.deepEqual(first.robots?.[0],{x:3,z:1,direction:1,blocked:false});
  const path=solve(initial);
  assert.ok(path?.length,'solver finds a room requiring mirror control');
  let replay=initial;
  for(const step of path!){
    const next=attemptMove(replay,step.x,step.z);
    assert.ok(next&&!next.fall,'solver path replays under mirror controls');
    replay=next;
  }
  assert.equal(replay.won,true);
  assert.deepEqual(replay.boxes,[{x:5,z:1}]);
  assert.equal(solve({...initial,robots:undefined}),null,'fixture cannot be solved without robot control');
});

console.log('Robot mirror movement, blocking, cargo, occupancy, machinery, history, and solver replay pass.');
