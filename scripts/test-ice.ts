import assert from 'node:assert/strict';
import {LEVELS, attemptMove, createState, isIce, solve, type Level, type State} from '../src/puzzle.ts';

const shell = (map: string[], ice: {x:number;z:number}[], extra: Partial<Level> = {}): Level => ({
  name: 'Ice rule fixture', subtitle: '', hint: '', map, ice, ...extra,
});

function fixture(level: Level, check: (index: number) => void): void {
  const index = LEVELS.length;
  LEVELS.push(level);
  try { check(index); } finally { LEVELS.pop(); }
}

const move = (state: State, dx: number, dz: number): State => {
  const next = attemptMove(state, dx, dz);
  assert.ok(next, `expected ${dx},${dz} to be legal`);
  return next;
};

fixture(shell([
  '########',
  '#@     #',
  '########',
], [{x:2,z:1},{x:3,z:1},{x:4,z:1}]), index => {
  const level=LEVELS[index], initial=createState(index), snapshot=structuredClone(initial);
  assert.equal(isIce(level,{x:2,z:1}),true);
  assert.equal(isIce(level,{x:5,z:1}),false);
  const slid=move(initial,1,0);
  assert.deepEqual(slid.player,{x:5,z:1},'one command glides through all ice and stops on first dry tile');
  assert.equal(slid.moves,1);
  assert.equal(slid.pushes,0);
  assert.deepEqual(initial,snapshot,'sliding does not mutate the undo snapshot');
  assert.deepEqual(attemptMove(structuredClone(initial),1,0),slid,'one undo snapshot replays the whole slide');
});

fixture(shell([
  '#####',
  '#@ ##',
  '#####',
], [{x:2,z:1}]), index => {
  assert.deepEqual(move(createState(index),1,0).player,{x:2,z:1},'a wall immediately beyond the first ice tile catches the player there');
});

fixture(shell([
  '#######',
  '#@ $  #',
  '#######',
], [{x:2,z:1},{x:3,z:1}]), index => {
  assert.deepEqual(move(createState(index),1,0).player,{x:2,z:1},'a crate catches player momentum on ice');
});

fixture(shell([
  '########',
  '#@     #',
  '#      #',
  '########',
], [{x:2,z:1},{x:3,z:1}], {robots:[{x:4,z:1,direction:0}]}), index => {
  const moved=move(createState(index),1,0);
  assert.deepEqual(moved.player,{x:3,z:1},'another actor catches player momentum on the last open ice tile');
  assert.deepEqual(moved.robots?.[0],{x:5,z:1,direction:1,blocked:false},'the robot still resolves its one copied command afterward');
});

fixture(shell([
  '#########',
  '#@$    .#',
  '#########',
], [{x:3,z:1},{x:4,z:1},{x:5,z:1}]), index => {
  const initial=createState(index), snapshot=structuredClone(initial), pushed=move(initial,1,0);
  assert.deepEqual(pushed.boxes,[{x:6,z:1}],'a pushed crate slides to the first dry tile');
  assert.deepEqual(pushed.player,{x:2,z:1});
  assert.equal(pushed.pushes,1,'a long ice push counts once');
  assert.equal(pushed.moves,1,'a long ice push is one command');
  assert.deepEqual(initial,snapshot);
});

fixture(shell([
  '#########',
  '#@ $ $  #',
  '#########',
], [{x:3,z:1},{x:4,z:1}]), index => {
  const staged: State={...createState(index),player:{x:2,z:1}};
  const pushed=move(staged,1,0);
  assert.deepEqual(pushed.boxes,[{x:4,z:1},{x:5,z:1}],'sliding cargo stops behind another crate without chain-pushing it');
  assert.equal(pushed.pushes,1);
});

fixture(shell([
  '#########',
  '#@$     #',
  '#########',
], [{x:2,z:1},{x:3,z:1},{x:4,z:1},{x:5,z:1}]), index => {
  const pushed=move(createState(index),1,0);
  assert.deepEqual(pushed.boxes,[{x:6,z:1}]);
  assert.deepEqual(pushed.player,{x:5,z:1},'player enters the vacated icy crate cell, then slides and stops behind the crate');
});

fixture(shell([
  '~~~~~~',
  '~@   ~',
  '~~~~~~',
], [{x:2,z:1},{x:3,z:1},{x:4,z:1}]), index => {
  const fallen=move(createState(index),1,0);
  assert.deepEqual(fallen.player,{x:5,z:1});
  assert.deepEqual(fallen.fall,{kind:'player',index:-1},'player momentum can carry off the platform');
});

fixture(shell([
  '~~~~~~~',
  '~@$   ~',
  '~~~~~~~',
], [{x:3,z:1},{x:4,z:1},{x:5,z:1}]), index => {
  const fallen=move(createState(index),1,0);
  assert.deepEqual(fallen.boxes,[{x:6,z:1}]);
  assert.deepEqual(fallen.fall,{kind:'box',index:0},'crate momentum can carry off the platform');
  assert.equal(fallen.pushes,1);
});

fixture(shell([
  '#######',
  '#@    #',
  '#######',
], [{x:2,z:1},{x:3,z:1}], {
  heights:[[0,0,0,0,0,0,0],[0,0,0,1,1,0,0],[0,0,0,0,0,0,0]],
}), index => {
  assert.deepEqual(move(createState(index),1,0).player,{x:2,z:1},'ice momentum cannot climb a height change');
});

fixture(shell([
  '#####',
  '#@ E#',
  '# . #',
  '#####',
], [{x:2,z:1}]), index => {
  const initial=createState(index);
  const locked=move(initial,1,0);
  assert.deepEqual(locked.player,{x:2,z:1},'locked exit catches a slide on the last ice tile');
  assert.equal(locked.won,false);
  const solvedState: State={...initial,boxes:[{x:2,z:2}]};
  const won=move(solvedState,1,0);
  assert.deepEqual(won.player,{x:3,z:1},'unlocked exit accepts sliding entry');
  assert.equal(won.won,true);
});

fixture(shell([
  '#######',
  '# @   #',
  '#     #',
  '#######',
], [{x:2,z:1},{x:3,z:1},{x:4,z:1}]), index => {
  let state=createState(index);
  state=move(state,1,0);
  assert.deepEqual(state.player,{x:5,z:1},'starting on ice preserves the commanded direction');
  state=move(state,0,1);
  assert.deepEqual(state.player,{x:5,z:2},'a new command after stopping turns normally');
});

fixture(shell([
  '########',
  '#@     #',
  '#      #',
  '########',
], [{x:3,z:2},{x:4,z:2}], {robots:[{x:2,z:2,direction:3}]}), index => {
  const moved=move(createState(index),1,0);
  assert.deepEqual(moved.player,{x:2,z:1});
  assert.deepEqual(moved.robots?.[0],{x:5,z:2,direction:1,blocked:false},'robot receives one heading, enters ice, and glides to dry floor');
  assert.equal(moved.moves,1);
});

fixture(shell([
  '#########',
  '#@      #',
  '#       #',
  '#########',
], [{x:2,z:1},{x:3,z:1},{x:4,z:1},{x:3,z:2},{x:4,z:2}], {robots:[{x:2,z:2,direction:0}]}), index => {
  const moved=move(createState(index),1,0);
  assert.deepEqual(moved.player,{x:5,z:1},'player completes the full slide before helper state resolves');
  assert.deepEqual(moved.robots?.[0],{x:5,z:2,direction:1,blocked:false},'robot copies the command once, then its own ice momentum resolves');
});

fixture(shell([
  '~~~~~~~',
  '~@    ~',
  '~     ~',
  '~~~~~~~',
], [{x:3,z:2},{x:4,z:2},{x:5,z:2}], {robots:[{x:2,z:2,direction:0}]}), index => {
  const moved=move(createState(index),1,0);
  assert.deepEqual(moved.robots?.[0],{x:5,z:2,direction:1,blocked:false},'robot brakes on the last ice tile at an edge');
  assert.equal(moved.fall,null);
});

fixture(shell([
  '~~~~~~~~',
  '~@     ~',
  '~      ~',
  '~~~~~~~~',
], [{x:4,z:2},{x:5,z:2},{x:6,z:2}], {robots:[{x:2,z:2,direction:0}]}), index => {
  const staged: State={...createState(index),boxes:[{x:3,z:2}]};
  const moved=move(staged,1,0);
  assert.deepEqual(moved.robots?.[0],{x:3,z:2,direction:1,blocked:false},'robot advances only through the initial push');
  assert.deepEqual(moved.boxes,[{x:7,z:2}]);
  assert.deepEqual(moved.fall,{kind:'box',index:0},'robot cargo can slide off an edge even though the robot brakes there');
});

fixture(shell([
  '########',
  '#     E#',
  '#@$  . #',
  '#      #',
  '########',
], [{x:3,z:2},{x:4,z:2}]), index => {
  const initial=createState(index), path=solve(initial);
  assert.ok(path?.length,'solver finds a fixture whose crate must slide to dry floor');
  let state=initial, sawSlide=false;
  for(const direction of path!) {
    const before=state, next=attemptMove(state,direction.x,direction.z);
    assert.ok(next&&!next.fall,'solver path consists only of legal non-falling commands');
    if(Math.abs(next.boxes[0].x-before.boxes[0].x)+Math.abs(next.boxes[0].z-before.boxes[0].z)>1) sawSlide=true;
    state=next;
  }
  assert.equal(sawSlide,true,'solver replay uses ice momentum');
  assert.equal(state.won,true);
  assert.deepEqual(state.boxes,[{x:5,z:2}], 'crate stops on the first dry target');
});

console.log('Ice movement, stopping, falls, robot timing, exits, height limits, history, and solver replay pass.');
