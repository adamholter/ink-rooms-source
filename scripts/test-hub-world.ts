import assert from 'node:assert/strict';
import {LEVELS} from '../src/puzzle.ts';
import {
  HUB_AREAS,
  HUB_CUBE_ENTRY,
  HUB_GATES,
  HUB_SWITCH,
  HUB_ROTATION_SWITCH,
  traceHubIce,
  HUB_TILES,
  HUB_CUBE_GATES,
  createHubState,
  hubTile,
  stepHub,
  type HubState,
} from '../src/hub-world.ts';

const levels = HUB_AREAS.flatMap((area) => area.levels).sort((a, b) => a - b);
assert.deepEqual(levels, Array.from({ length: LEVELS.length }, (_, index) => index), 'areas cover each level exactly once');
assert.deepEqual(HUB_GATES.map((gate) => gate.level).sort((a, b) => a - b), levels.filter(i=>!LEVELS[i].cube), 'flat rooms have one gate each');
assert.equal(new Set(HUB_GATES.map((gate) => `${gate.point.x},${gate.point.z}`)).size, HUB_GATES.length, 'gate points are unique');
assert.equal(HUB_GATES.some((gate) => LEVELS[gate.level].cube), false, 'cube rooms do not use flat gates');

const closed = createHubState();
assert.equal(walk(closed, [0, -1], 9), null, 'closed bridge cannot be crossed');
assert.deepEqual(closed, createHubState(), 'movement does not mutate hub state');

let pushed = createHubState();
for (let i = 0; i < 6; i += 1) pushed = mustStep(pushed, 0, -1).state;
assert.deepEqual(pushed.crate, HUB_SWITCH, 'one north push places crate on switch');
assert.equal(pushed.bridgeOpen, true, 'switch permanently opens bridge');
assert.equal(mustStep(mustStep(pushed, 1, 0).state, -1, 0).state.bridgeOpen, true, 'bridge stays latched');

const reachableClosed = reachable(createHubState(), false);
for (const gate of HUB_GATES.filter((gate) => gate.area !== 'bridges')) {
  assert(reachableClosed.has(`${gate.point.x},${gate.point.z}`), `gate ${gate.level} is reachable without a puzzle`);
}
for (const gate of HUB_GATES.filter((gate) => gate.area === 'bridges')) {
  assert(!reachableClosed.has(`${gate.point.x},${gate.point.z}`), `bridge gate ${gate.level} stays isolated while closed`);
}

const reachableOpen = reachable(pushed);
for (const gate of HUB_GATES) {
  assert(reachableOpen.has(`${gate.point.x},${gate.point.z}`), `gate ${gate.level} is reachable after the single push`);
}
assert(reachableOpen.has(`${HUB_CUBE_ENTRY.x},${HUB_CUBE_ENTRY.z}`), 'cube entrance is reachable after one push');

const cubeApproach = createHubState('cube');
const cubeResult = walkTo(cubeApproach, HUB_CUBE_ENTRY);
assert.equal(cubeResult.enterCube, true, 'walking into cube entrance signals cube mode');
assert.equal(cubeResult.gate, null, 'cube entrance is not a flat-room gate');

const iceSouth = createHubState('ice');
const iceMove = mustStep(iceSouth, 0, 1);
assert.equal(iceMove.slide,true);
assert.equal(iceMove.state.player.z,iceSouth.player.z+2,'one ice tile slides onto its dry neighbor');
const island=HUB_AREAS.find(a=>a.id==='ice')!;
const isOnIceIsland=(p:{x:number;z:number})=>Math.abs(p.x-island.center.x)<=10&&Math.abs(p.z-island.center.z)<=7;
for(const tile of HUB_TILES.filter(isOnIceIsland)){
 const border=Math.abs(tile.x-island.center.x)===10||Math.abs(tile.z-island.center.z)===7;
 assert.equal(tile.kind,border?'floor':(tile.x+tile.z)%2!==0?'ice':'floor','checkerboard has a dry perimeter');
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const moved=stepHub({...iceSouth,player:{x:tile.x,z:tile.z}},dx,dz);
  if(moved)assert(!moved.fall,'all hub ice routes stop safely before the edge');
 }
}
const longIce=(x:number,z:number)=>z===0&&x>=0&&x<=20?(x<20?'ice':'floor'):null;
assert.deepEqual(traceHubIce({x:0,z:0},1,0,longIce),{point:{x:20,z:0},fall:false},'ice never stops after an artificial step count');
assert.deepEqual(traceHubIce({x:0,z:0},1,0,(x,z)=>longIce(x,z)==='floor'?null:longIce(x,z)),{point:{x:20,z:0},fall:true},'unbroken ice can slide into the void');
let rotation=createHubState('rotation');
rotation=mustStep(rotation,0,-1).state;rotation=mustStep(rotation,0,-1).state;
const activation=mustStep(rotation,0,-1);assert(activation.rotate);assert.equal(activation.state.rotation,1);assert.deepEqual(activation.state.player,HUB_ROTATION_SWITCH);
const away=mustStep(activation.state,1,0);assert(!away.rotate);const again=mustStep(away.state,-1,0);assert(again.rotate);assert.equal(again.state.rotation,2);
assert.deepEqual([...HUB_GATES,...HUB_CUBE_GATES].map(g=>g.level).sort((a,b)=>a-b),levels,'every campaign room has a rendered door');

for (const start of [createHubState(), createHubState('heights'), createHubState('cube')]) {
  const edge = findEdge(reachable(start));
  assert(edge, 'reachable island has an edge');
  const blocked = stepHub({ ...start, player: edge!.point }, edge!.dx, edge!.dz);
  assert.equal(blocked, null, 'stepping off a hub edge is blocked');
}

console.log('hub world tests passed');

function mustStep(state: HubState, dx: number, dz: number) {
  const result = stepHub(state, dx, dz);
  assert(result, `expected move ${dx},${dz} from ${state.player.x},${state.player.z}`);
  return result;
}

function walk(state: HubState, direction: [number, number], count: number): HubState | null {
  let current = state;
  for (let i = 0; i < count; i += 1) {
    const result = stepHub(current, direction[0], direction[1]);
    if (!result) return null;
    current = result.state;
  }
  return current;
}

function reachable(start: HubState, allowPush = true): Set<string> {
  const seen = new Set<string>();
  const queue: HubState[] = [start];
  while (queue.length) {
    const state = queue.shift()!;
    const id = `${state.player.x},${state.player.z}|${state.crate.x},${state.crate.z}|${Number(state.bridgeOpen)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if(HUB_GATES.some(g=>g.point.x===state.player.x&&g.point.z===state.player.z)||(state.player.x===HUB_CUBE_ENTRY.x&&state.player.z===HUB_CUBE_ENTRY.z))continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const move = stepHub(state, dx, dz);
      const pushedCrate = move && (move.state.crate.x !== state.crate.x || move.state.crate.z !== state.crate.z);
      if (move && (allowPush || !pushedCrate)) queue.push(move.state);
    }
  }
  return new Set([...seen].map((id) => id.split('|')[0]));
}

function walkTo(start: HubState, target: { x: number; z: number }) {
  const seen = new Set<string>();
  const queue: HubState[] = [start];
  while (queue.length) {
    const state = queue.shift()!;
    const id = `${state.player.x},${state.player.z}`;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const move = stepHub(state, dx, dz);
      if (!move) continue;
      if (move.state.player.x === target.x && move.state.player.z === target.z) return move;
      queue.push(move.state);
    }
  }
  throw new Error(`cannot reach ${target.x},${target.z}`);
}

function findEdge(points: Set<string>): { point: { x: number; z: number }; dx: number; dz: number } | null {
  for (const encoded of points) {
    const [x, z] = encoded.split(',').map(Number);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (hubTile(x + dx, z + dz) === null) return { point: { x, z }, dx, dz };
    }
  }
  return null;
}
