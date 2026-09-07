import assert from 'node:assert/strict';
import { buildHubCatalog, type HubCatalogArea } from '../src/hub-catalog.ts';
import { HUB_AREAS, HUB_GATES } from '../src/hub-world.ts';
import { LEVELS, type Level } from '../src/puzzle.ts';

const baseAreas: HubCatalogArea[] = HUB_AREAS.map((area) => ({ ...area, center: { ...area.center }, spawn: { ...area.spawn }, levels: [...area.levels] }));
const base = buildHubCatalog(LEVELS, baseAreas);
assert.deepEqual(base.areas, baseAreas, 'the existing 48 area assignments and positions stay unchanged');
assert.deepEqual(base.flatGates, HUB_GATES, 'the existing 44 flat gate positions stay unchanged');
assert.deepEqual(base.cubeGates.map(({ level, face, point }) => ({ level, face, point })), [
  { level: 44, face: 1, point: { x: 10, z: 3 } },
  { level: 45, face: 2, point: { x: 17, z: 3 } },
  { level: 46, face: 3, point: { x: 24, z: 3 } },
  { level: 47, face: 4, point: { x: 31, z: 3 } },
], 'the original cube rooms stay centered on faces 1 through 4');

const flat = synthetic({ ice: [{ x: 1, z: 1 }] });
const cube = synthetic({ cube: { size: 4 } });
const expandedLevels = [...LEVELS, flat, flat, cube, flat, cube];
const expanded = buildHubCatalog(expandedLevels, baseAreas);
const represented = [...expanded.flatGates, ...expanded.cubeGates].map((gate) => gate.level).sort((a, b) => a - b);
assert.deepEqual(represented, expandedLevels.map((_, index) => index), 'every appended level appears exactly once');
assert.equal(new Set(expanded.flatGates.map((gate) => `${gate.point.x},${gate.point.z}`)).size, expanded.flatGates.length, 'flat gates never overlap');
assert.equal(new Set(expanded.cubeGates.map((gate) => `${gate.point.x},${gate.point.z}`)).size, expanded.cubeGates.length, 'cube gates never overlap');
assert.deepEqual(expanded.flatGates.slice(0, HUB_GATES.length), HUB_GATES, 'new rooms never move old flat gates');
assert(expanded.additions.areas.every((area) => area.levels.length <= 12), 'extension islands stay within door capacity');
assert(expanded.additions.connectingTiles.length > 0, 'extension islands include connecting paths');
assert(expanded.cubeGates.filter((gate) => gate.level >= LEVELS.length).every((gate) => gate.face >= 0 && gate.face < 6), 'future cube gates use walkable faces');
assert.deepEqual(expanded.areas.find((area) => area.id === 'cube')!.levels, [44, 45, 46, 47, 50, 52], 'future cube rooms join the cube area');

const bridge = synthetic({ bridges: [{ x: 1, z: 1, height: 0, channel: 1 }] });
const lift = synthetic({ elevators: [{ x: 1, z: 1, low: 0, high: 2, channel: 1 }] });
const remix = synthetic({ ice: [{ x: 1, z: 1 }], robots: [{ x: 2, z: 1, direction: 0 }] });
const manyExtensions = buildHubCatalog([
  ...LEVELS,
  ...Array.from({ length: 13 }, () => bridge),
  ...Array.from({ length: 13 }, () => lift),
  ...Array.from({ length: 13 }, () => remix),
], baseAreas);
assert(manyExtensions.additions.areas.some((area) => area.id.startsWith('bridges-extension') && area.name.startsWith('Bridges')), 'pure bridge rooms get Bridges islands');
assert(manyExtensions.additions.areas.some((area) => area.id.startsWith('lifts-extension') && area.name.startsWith('Lifts')), 'pure elevator rooms get Lifts islands');
assert(manyExtensions.additions.areas.some((area) => area.id.startsWith('remix-extension') && area.name.startsWith('Remix')), 'mixed mechanics get Remix islands');
assertExtensionSpawnsReachable(manyExtensions);

const tooManyCubes = [...LEVELS, ...Array.from({ length: 21 }, () => cube)];
assert.throws(() => buildHubCatalog(tooManyCubes, baseAreas), /supports 24 levels/, 'unsupported cube capacity fails loudly');

console.log('hub catalog tests passed');

function synthetic(overrides: Partial<Level>): Level {
  return { name: 'Synthetic', subtitle: '', hint: '', map: ['@ E'], ...overrides };
}

function assertExtensionSpawnsReachable(catalog: ReturnType<typeof buildHubCatalog>): void {
  const walkable = new Set(catalog.additions.connectingTiles.map((tile) => `${tile.x},${tile.z}`));
  for (const area of catalog.additions.areas) {
    for (let z = area.center.z - 7; z <= area.center.z + 7; z += 1) {
      for (let x = area.center.x - 10; x <= area.center.x + 10; x += 1) walkable.add(`${x},${z}`);
    }
  }
  const terminals = new Set(catalog.flatGates.map((gate) => `${gate.point.x},${gate.point.z}`));
  const start = '0,32';
  assert(walkable.has(start), 'extension road connects to the north edge of the base world');
  const seen = new Set<string>(), queue = [start];
  while (queue.length) {
    const encoded = queue.shift()!;
    if (seen.has(encoded)) continue;
    seen.add(encoded);
    if (terminals.has(encoded)) continue;
    const [x, z] = encoded.split(',').map(Number);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = `${x + dx},${z + dz}`;
      if (walkable.has(next) && !seen.has(next)) queue.push(next);
    }
  }
  for (const area of catalog.additions.areas) assert(seen.has(`${area.spawn.x},${area.spawn.z}`), `${area.id} remains reachable past terminal doors`);
}
