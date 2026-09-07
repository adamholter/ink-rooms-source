import {LEVELS} from './puzzle.ts';
import {buildHubCatalog} from './hub-catalog.ts';
export type Point = { x: number; z: number };

export interface HubArea {
  id: string;
  name: string;
  center: Point;
  spawn: Point;
  levels: number[];
}

export type HubTileKind = 'floor' | 'ice' | 'bridge';
export interface HubTile extends Point { kind: HubTileKind }

export interface HubState {
  player: Point;
  crate: Point;
  bridgeOpen: boolean;
  rotation?:number;
  fall?:boolean;
}

export const BASE_HUB_AREAS: HubArea[] = [
  { id: 'courtyard', name: 'Courtyard', center: { x: 0, z: 0 }, spawn: { x: 0, z: 1 }, levels: range(0, 11) },
  { id: 'heights', name: 'Heights', center: { x: -24, z: 0 }, spawn: { x: -24, z: 0 }, levels: range(12, 16) },
  { id: 'lifts', name: 'Lifts', center: { x: 24, z: 0 }, spawn: { x: 24, z: 0 }, levels: range(17, 20) },
  { id: 'bridges', name: 'Bridges', center: { x: 0, z: -24 }, spawn: { x: 0, z: -24 }, levels: range(21, 26) },
  { id: 'robots', name: 'Robots', center: { x: -24, z: 24 }, spawn: { x: -24, z: 24 }, levels: range(27, 30) },
  { id: 'ice', name: 'Ice', center: { x: -24, z: -24 }, spawn: { x: -24, z: -24 }, levels: range(31, 35) },
  { id: 'rotation', name: 'Rotation', center: { x: 0, z: 24 }, spawn: { x: 0, z: 27 }, levels: [36, 37, 38, 39, 42, 43] },
  { id: 'challenge', name: 'Challenge', center: { x: 24, z: 24 }, spawn: { x: 24, z: 24 }, levels: [40, 41] },
  { id: 'cube', name: 'Cube', center: { x: 24, z: -24 }, spawn: { x: 24, z: -18 }, levels: range(44, 47) },
];

export const HUB_ROTATION_CENTER:Point={x:0,z:24};
export const HUB_ROTATION_SWITCH:Point={x:0,z:24};
export function onHubRotator(p:Point){return Math.abs(p.x-HUB_ROTATION_CENTER.x)<=1&&Math.abs(p.z-HUB_ROTATION_CENTER.z)<=1;}

export const HUB_SWITCH: Point = { x: 0, z: -6 };
export const HUB_CUBE_ENTRY: Point = { x: 24, z: -19 };

const catalog=buildHubCatalog(LEVELS,BASE_HUB_AREAS);
export const HUB_AREAS=catalog.areas;
export const HUB_GATES=catalog.flatGates;
export const HUB_CUBE_GATES=catalog.cubeGates;

const tileMap = new Map<string, HubTileKind>();

for (const area of HUB_AREAS.filter((candidate) => candidate.id !== 'cube')) {
  fillRect(area.center.x - 10, area.center.x + 10, area.center.z - 7, area.center.z + 7, 'floor');
  if(area.id==='ice'||area.id.startsWith('ice-extension-'))for(let z=area.center.z-6;z<=area.center.z+6;z++)for(let x=area.center.x-9;x<=area.center.x+9;x++)if((x+z)%2!==0)tileMap.set(key(x,z),'ice');
}

// The cube pavilion floats north of its arrival plaza, with clearance for
// its rotating corners. The entrance gate transports the player onto its top.
fillRect(14, 34, -20, -17, 'floor');

// Open causeways. The Bridges island deliberately has no side connection.
fillRect(-13, -11, -1, 1, 'floor'); // courtyard to heights
fillRect(11, 13, -1, 1, 'floor'); // courtyard to lifts
fillRect(-1, 1, 8, 16, 'floor'); // courtyard to rotation
fillRect(-25, -23, 8, 16, 'floor'); // heights to robots
fillRect(-25, -23, -16, -8, 'floor'); // heights to ice
fillRect(11, 13, 23, 25, 'floor'); // rotation to challenge
fillRect(23, 25, 8, 16, 'floor'); // lifts to challenge
fillRect(-13, -11, 23, 25, 'floor'); // robots to rotation
fillRect(23, 25, -16, -8, 'floor'); // lifts to cube
fillRect(-1, 1, -16, -8, 'bridge'); // courtyard to bridges

for(const tile of catalog.additions.connectingTiles)tileMap.set(key(tile.x,tile.z),tile.kind);

export const HUB_TILES: HubTile[] = [...tileMap]
  .map(([key, kind]) => {
    const [x, z] = key.split(',').map(Number);
    return { x, z, kind };
  })
  .sort((a, b) => a.z - b.z || a.x - b.x);

export function hubTile(x: number, z: number): HubTileKind | null {
  if (!Number.isInteger(x) || !Number.isInteger(z)) return null;
  return tileMap.get(key(x, z)) ?? null;
}

export function createHubState(areaId = 'courtyard'): HubState {
  if (areaId === 'remix') areaId = 'challenge';
  const area = HUB_AREAS.find((candidate) => candidate.id === areaId);
  if (!area) throw new Error(`Unknown hub area: ${areaId}`);
  return {
    player: { ...area.spawn },
    crate: { x: 0, z: -5 },
    bridgeOpen: false,
    rotation:0,
  };
}

export function stepHub(
  state: HubState,
  dx: number,
  dz: number,
): { state: HubState; gate: number | null; enterCube: boolean; slide: boolean; rotate:boolean; fall:boolean } | null {
  if(state.fall)return null;
  if (!Number.isInteger(dx) || !Number.isInteger(dz) || Math.abs(dx) + Math.abs(dz) !== 1) return null;

  const first = { x: state.player.x + dx, z: state.player.z + dz };
  if (samePoint(first, state.crate)) {
    const crateTarget = { x: state.crate.x + dx, z: state.crate.z + dz };
    if (dx !== 0 || dz !== -1 || !samePoint(crateTarget, HUB_SWITCH)) return null;
    const pushed: HubState = {
      player: first,
      crate: crateTarget,
      bridgeOpen: true,
      rotation:state.rotation??0,
    };
    return resultAt(pushed, false);
  }

  if (!canEnter(first, state)) return null;
  let nextState: HubState = { ...state, player: first };
  let gate = gateAt(first);
  let enterCube = samePoint(first, HUB_CUBE_ENTRY);
  let slid = false;

  // Ice has no distance cap. A dry checkerboard and rim make this island safe.
  const landing=traceHubIce(first,dx,dz,hubTile,p=>samePoint(p,state.crate)||hubTile(p.x,p.z)==='bridge'&&!state.bridgeOpen,p=>gateAt(p)!==null||samePoint(p,HUB_CUBE_ENTRY));
  nextState={...state,player:landing.point,...(landing.fall?{fall:true}:{})};
  gate=gateAt(landing.point);enterCube=samePoint(landing.point,HUB_CUBE_ENTRY);slid=!samePoint(first,landing.point);
  const rotate=samePoint(nextState.player,HUB_ROTATION_SWITCH)&&!samePoint(state.player,HUB_ROTATION_SWITCH);
  if(rotate)nextState.rotation=(state.rotation??0)+1;
  return {state:nextState,gate,enterCube,slide:slid,rotate,fall:landing.fall};
}

function resultAt(state: HubState, slide: boolean) {
  return {
    state,
    gate: gateAt(state.player),
    enterCube: samePoint(state.player, HUB_CUBE_ENTRY),
    slide,
    rotate:false,
    fall:false,
  };
}

function canEnter(point: Point, state: HubState): boolean {
  const tile = hubTile(point.x, point.z);
  return tile !== null && (tile !== 'bridge' || state.bridgeOpen);
}

function gateAt(point: Point): number | null {
  return HUB_GATES.find((gate) => samePoint(gate.point, point))?.level ?? null;
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.z === b.z;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function fillRect(minX: number, maxX: number, minZ: number, maxZ: number, kind: HubTileKind): void {
  for (let z = minZ; z <= maxZ; z += 1) {
    for (let x = minX; x <= maxX; x += 1) tileMap.set(key(x, z), kind);
  }
}

function key(x: number, z: number): string {
  return `${x},${z}`;
}

/** Continue until dry ground, a blocker, a door, or the void, just like room ice. */
export function traceHubIce(start:Point,dx:number,dz:number,tile:(x:number,z:number)=>HubTileKind|null,blocked:(p:Point)=>boolean=()=>false,door:(p:Point)=>boolean=()=>false):{point:Point;fall:boolean}{
  if(!Number.isInteger(dx)||!Number.isInteger(dz)||Math.abs(dx)+Math.abs(dz)!==1)throw Error('Ice direction must be cardinal');
  let p={...start};
  while(tile(p.x,p.z)==='ice'&&!door(p)){
    const next={x:p.x+dx,z:p.z+dz};if(blocked(next))break;
    p=next;if(tile(p.x,p.z)===null)return {point:p,fall:true};
  }
  return {point:p,fall:false};
}
