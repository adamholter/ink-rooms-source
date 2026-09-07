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
}

export const HUB_AREAS: HubArea[] = [
  { id: 'courtyard', name: 'Courtyard', center: { x: 0, z: 0 }, spawn: { x: 0, z: 1 }, levels: range(0, 11) },
  { id: 'heights', name: 'Heights', center: { x: -24, z: 0 }, spawn: { x: -24, z: 0 }, levels: range(12, 16) },
  { id: 'lifts', name: 'Lifts', center: { x: 24, z: 0 }, spawn: { x: 24, z: 0 }, levels: range(17, 20) },
  { id: 'bridges', name: 'Bridges', center: { x: 0, z: -24 }, spawn: { x: 0, z: -24 }, levels: range(21, 26) },
  { id: 'robots', name: 'Robots', center: { x: -24, z: 24 }, spawn: { x: -24, z: 24 }, levels: range(27, 30) },
  { id: 'ice', name: 'Ice', center: { x: -24, z: -24 }, spawn: { x: -24, z: -24 }, levels: range(31, 35) },
  { id: 'rotation', name: 'Rotation', center: { x: 0, z: 24 }, spawn: { x: 0, z: 24 }, levels: [36, 37, 38, 39, 42, 43] },
  { id: 'remix', name: 'Remix', center: { x: 24, z: 24 }, spawn: { x: 24, z: 24 }, levels: [40, 41] },
  { id: 'cube', name: 'Cube', center: { x: 24, z: -24 }, spawn: { x: 24, z: -18 }, levels: range(44, 47) },
];

export const HUB_SWITCH: Point = { x: 0, z: -6 };
export const HUB_CUBE_ENTRY: Point = { x: 24, z: -19 };

export const HUB_GATES: Array<{ level: number; point: Point; area: string }> = HUB_AREAS
  .filter((area) => area.id !== 'cube')
  .flatMap((area) => doorPoints(area.levels.length, area.center).map((point, index) => ({
    level: area.levels[index],
    point,
    area: area.id,
  })));

const tileMap = new Map<string, HubTileKind>();

for (const area of HUB_AREAS.filter((candidate) => candidate.id !== 'cube')) {
  fillRect(area.center.x - 10, area.center.x + 10, area.center.z - 7, area.center.z + 7, area.id === 'ice' ? 'ice' : 'floor');
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
fillRect(11, 13, 23, 25, 'floor'); // rotation to remix
fillRect(23, 25, 8, 16, 'floor'); // lifts to remix
fillRect(-13, -11, 23, 25, 'floor'); // robots to rotation
fillRect(23, 25, -16, -8, 'floor'); // lifts to cube
fillRect(-1, 1, -16, -8, 'bridge'); // courtyard to bridges

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
  const area = HUB_AREAS.find((candidate) => candidate.id === areaId);
  if (!area) throw new Error(`Unknown hub area: ${areaId}`);
  return {
    player: { ...area.spawn },
    crate: { x: 0, z: -5 },
    bridgeOpen: false,
  };
}

export function stepHub(
  state: HubState,
  dx: number,
  dz: number,
): { state: HubState; gate: number | null; enterCube: boolean; slide: boolean } | null {
  if (!Number.isInteger(dx) || !Number.isInteger(dz) || Math.abs(dx) + Math.abs(dz) !== 1) return null;

  const first = { x: state.player.x + dx, z: state.player.z + dz };
  if (samePoint(first, state.crate)) {
    const crateTarget = { x: state.crate.x + dx, z: state.crate.z + dz };
    if (dx !== 0 || dz !== -1 || !samePoint(crateTarget, HUB_SWITCH)) return null;
    const pushed: HubState = {
      player: first,
      crate: crateTarget,
      bridgeOpen: true,
    };
    return resultAt(pushed, false);
  }

  if (!canEnter(first, state)) return null;
  let nextState: HubState = { ...state, player: first };
  let gate = gateAt(first);
  let enterCube = samePoint(first, HUB_CUBE_ENTRY);
  let slid = false;

  // Ice adds a short, predictable glide. Stop at gates, the cube door, or open ground.
  if (hubTile(first.x, first.z) === 'ice' && gate === null && !enterCube) {
    for (let extra = 0; extra < 2; extra += 1) {
      const target = { x: nextState.player.x + dx, z: nextState.player.z + dz };
      if (!canEnter(target, nextState) || samePoint(target, nextState.crate)) break;
      nextState = { ...nextState, player: target };
      slid = true;
      gate = gateAt(target);
      enterCube = samePoint(target, HUB_CUBE_ENTRY);
      if (gate !== null || enterCube || hubTile(target.x, target.z) !== 'ice') break;
    }
  }

  return { state: nextState, gate, enterCube, slide: slid };
}

function resultAt(state: HubState, slide: boolean) {
  return {
    state,
    gate: gateAt(state.player),
    enterCube: samePoint(state.player, HUB_CUBE_ENTRY),
    slide,
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

function doorPoints(count: number, center: Point): Point[] {
  const firstRow = Math.ceil(count / 2);
  const secondRow = count - firstRow;
  return [
    ...centeredXs(firstRow).map((x) => ({ x: center.x + x, z: center.z - 5 })),
    ...centeredXs(secondRow).map((x) => ({ x: center.x + x, z: center.z + 5 })),
  ];
}

function centeredXs(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * 4);
}

function fillRect(minX: number, maxX: number, minZ: number, maxZ: number, kind: HubTileKind): void {
  for (let z = minZ; z <= maxZ; z += 1) {
    for (let x = minX; x <= maxX; x += 1) tileMap.set(key(x, z), kind);
  }
}

function key(x: number, z: number): string {
  return `${x},${z}`;
}
