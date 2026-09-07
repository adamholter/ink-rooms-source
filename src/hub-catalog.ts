import type { Level } from './puzzle.ts';

export type HubCatalogPoint = { x: number; z: number };

export interface HubCatalogArea {
  id: string;
  name: string;
  center: HubCatalogPoint;
  spawn: HubCatalogPoint;
  levels: number[];
}

export interface HubCatalogGate {
  level: number;
  point: HubCatalogPoint;
  area: string;
}

export interface HubCatalogCubeGate {
  level: number;
  face: number;
  point: HubCatalogPoint;
}

export interface HubCatalogTile extends HubCatalogPoint {
  kind: 'floor';
}

export interface HubCatalog {
  areas: HubCatalogArea[];
  flatGates: HubCatalogGate[];
  cubeGates: HubCatalogCubeGate[];
  additions: {
    areas: HubCatalogArea[];
    connectingTiles: HubCatalogTile[];
  };
}

const AREA_CAPACITY = 12;
const CUBE_SIZE = 7;
const CUBE_CAPACITY = 24;

/**
 * Builds the complete hub index from the campaign and the hand-authored base
 * areas. Existing assignments and coordinates are never changed. New flat
 * rooms get themed extension islands; cube rooms get walkable pavilion cells.
 */
export function buildHubCatalog(
  levels: readonly Level[],
  existingAreas: readonly HubCatalogArea[],
): HubCatalog {
  const areas = existingAreas.map(cloneArea);
  const assigned = new Set<number>();
  for (const area of areas) {
    if (area.levels.length > AREA_CAPACITY && area.id !== 'cube') {
      throw new RangeError(`Hub area ${area.id} exceeds ${AREA_CAPACITY} flat gates`);
    }
    for (const level of area.levels) {
      if (!Number.isInteger(level) || level < 0 || level >= levels.length) {
        throw new RangeError(`Hub area ${area.id} references missing level ${level}`);
      }
      if (assigned.has(level)) throw new Error(`Level ${level} appears in more than one hub area`);
      assigned.add(level);
    }
  }

  const additions: HubCatalogArea[] = [];
  const challengeArea = areas.find((area) => area.id === 'challenge');
  const explicitChallenge = levels.flatMap((level, index) => !assigned.has(index) && level.challenge ? [index] : []);
  if (explicitChallenge.length) {
    if (!challengeArea) throw new Error('Challenge levels require a challenge hub area');
    const inMainArea = explicitChallenge.slice(0, AREA_CAPACITY - challengeArea.levels.length);
    challengeArea.levels.push(...inMainArea);
    inMainArea.forEach((level) => assigned.add(level));
  }
  const unassignedFlat = levels.flatMap((level, index) => !assigned.has(index) && (!level.cube || level.challenge) ? [{ level, index }] : []);
  const themes = new Map<string, { name: string; entries: number[] }>();
  for (const entry of unassignedFlat) {
    const theme = levelTheme(entry.level);
    const bucket = themes.get(theme.id) ?? { name: theme.name, entries: [] };
    bucket.entries.push(entry.index);
    themes.set(theme.id, bucket);
  }

  let extensionIndex = 0;
  for (const [theme, bucket] of themes) {
    for (let offset = 0; offset < bucket.entries.length; offset += AREA_CAPACITY) {
      const sequence = Math.floor(offset / AREA_CAPACITY) + 1;
      const center = extensionCenter(existingAreas, extensionIndex++);
      const area: HubCatalogArea = {
        id: uniqueAreaId(`${theme}-extension-${sequence}`, areas),
        name: `${bucket.name} ${roman(sequence + 1)}`,
        center,
        spawn: { ...center },
        levels: bucket.entries.slice(offset, offset + AREA_CAPACITY),
      };
      additions.push(area);
      areas.push(area);
      area.levels.forEach((level) => assigned.add(level));
    }
  }

  const newCubeLevels = levels.flatMap((level, index) => !assigned.has(index) && level.cube ? [index] : []);
  const cubeArea = areas.find((area) => area.id === 'cube');
  if (newCubeLevels.length && !cubeArea) throw new Error('Cube levels require a cube hub area');
  const existingCube = cubeArea?.levels ?? [];
  const cubeLevels = [...existingCube, ...newCubeLevels];
  if (cubeLevels.length > CUBE_CAPACITY) {
    throw new RangeError(`Cube pavilion supports ${CUBE_CAPACITY} levels; received ${cubeLevels.length}`);
  }
  if (existingCube.some((level) => !levels[level]?.cube)) throw new Error('Cube area contains a flat level');
  for (const index of newCubeLevels) cubeArea!.levels.push(index);
  for (const index of newCubeLevels) assigned.add(index);

  if (assigned.size !== levels.length) throw new Error('Hub catalog did not assign every level');
  const flatGates = areas
    .filter((area) => area.id !== 'cube')
    .flatMap((area) => doorPoints(area.levels.length, area.center).map((point, index) => ({
      level: area.levels[index], point, area: area.id,
    })));
  const cubeGates = cubeGatePoints().slice(0, cubeLevels.length).map(({ face, point }, index) => ({
    level: cubeLevels[index], face, point,
  }));

  validateUniqueLevels(levels.length, flatGates, cubeGates);
  return {
    areas,
    flatGates,
    cubeGates,
    additions: { areas: additions, connectingTiles: connectingTiles(existingAreas, additions) },
  };
}

function levelTheme(level: Level): { id: string; name: string } {
  if (level.challenge) return { id: 'challenge', name: 'Challenge' };
  const mechanics = [
    { active: Boolean(level.ice?.length), theme: { id: 'ice', name: 'Ice' } },
    { active: Boolean(level.rotators?.length), theme: { id: 'rotation', name: 'Rotation' } },
    { active: Boolean(level.robots?.length), theme: { id: 'robots', name: 'Robots' } },
    { active: Boolean(level.bridges?.length), theme: { id: 'bridges', name: 'Bridges' } },
    { active: Boolean(level.elevators?.length), theme: { id: 'lifts', name: 'Lifts' } },
    { active: Boolean(level.heights?.length || level.jumping), theme: { id: 'heights', name: 'Heights' } },
  ].filter((entry) => entry.active);
  if (mechanics.length > 1) return { id: 'challenge', name: 'Challenge' };
  if (mechanics.length === 1) return mechanics[0].theme;
  if (level.switches?.length) return { id: 'machinery', name: 'Machinery' };
  return { id: 'courtyard', name: 'Courtyard' };
}

function extensionCenter(existing: readonly HubCatalogArea[], index: number): HubCatalogPoint {
  const maxZ = Math.max(...existing.map((area) => area.center.z + 7));
  const columns = [-48, -24, 0, 24, 48];
  return { x: columns[index % columns.length], z: maxZ + 24 + Math.floor(index / columns.length) * 24 };
}

function connectingTiles(existing: readonly HubCatalogArea[], additions: readonly HubCatalogArea[]): HubCatalogTile[] {
  if (!additions.length) return [];
  const top = Math.max(...existing.map((area) => area.center.z + 7));
  const backboneZ = top + 8;
  const minX = Math.min(0, ...additions.map((area) => area.center.x));
  const maxX = Math.max(0, ...additions.map((area) => area.center.x));
  const points = new Set<string>();
  addLine(points, { x: 0, z: top + 1 }, { x: 0, z: backboneZ });
  addLine(points, { x: minX, z: backboneZ }, { x: maxX + 12, z: backboneZ });
  for (const area of additions) {
    const corridorX = area.center.x + 12;
    addLine(points, { x: corridorX, z: backboneZ }, { x: corridorX, z: area.center.z });
    addLine(points, { x: corridorX, z: area.center.z }, area.center);
  }
  return [...points].map((encoded) => {
    const [x, z] = encoded.split(',').map(Number);
    return { x, z, kind: 'floor' as const };
  });
}

function addLine(points: Set<string>, a: HubCatalogPoint, b: HubCatalogPoint): void {
  if (a.x !== b.x && a.z !== b.z) throw new Error('Hub paths must be straight');
  const dx = Math.sign(b.x - a.x), dz = Math.sign(b.z - a.z);
  for (let point = { ...a };; point = { x: point.x + dx, z: point.z + dz }) {
    points.add(`${point.x},${point.z}`);
    if (point.x === b.x && point.z === b.z) break;
  }
}

function cubeGatePoints(): Array<{ face: number; point: HubCatalogPoint }> {
  const fixed = [1, 2, 3, 4].map((face) => ({ face, point: { x: face * CUBE_SIZE + 3, z: 3 } }));
  const extras = [0, 1, 2, 3, 4, 5].flatMap((face) => [[1, 1], [5, 1], [1, 5], [5, 5]].map(([x, z]) => ({
    face, point: { x: face * CUBE_SIZE + x, z },
  })));
  return [...fixed, ...extras].slice(0, CUBE_CAPACITY);
}

function doorPoints(count: number, center: HubCatalogPoint): HubCatalogPoint[] {
  const firstRow = Math.ceil(count / 2);
  return [
    ...centeredXs(firstRow).map((x) => ({ x: center.x + x, z: center.z - 5 })),
    ...centeredXs(count - firstRow).map((x) => ({ x: center.x + x, z: center.z + 5 })),
  ];
}

function centeredXs(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * 4);
}

function validateUniqueLevels(total: number, flat: readonly HubCatalogGate[], cube: readonly HubCatalogCubeGate[]): void {
  const all = [...flat.map((gate) => gate.level), ...cube.map((gate) => gate.level)];
  if (all.length !== total || new Set(all).size !== total || all.some((level) => level < 0 || level >= total)) {
    throw new Error('Every campaign level must have exactly one hub gate');
  }
  const positions = flat.map((gate) => `${gate.point.x},${gate.point.z}`);
  if (new Set(positions).size !== positions.length) throw new Error('Flat hub gates overlap');
  const cubePositions = cube.map((gate) => `${gate.point.x},${gate.point.z}`);
  if (new Set(cubePositions).size !== cubePositions.length) throw new Error('Cube hub gates overlap');
}

function cloneArea(area: HubCatalogArea): HubCatalogArea {
  return { ...area, center: { ...area.center }, spawn: { ...area.spawn }, levels: [...area.levels] };
}

function uniqueAreaId(candidate: string, areas: readonly HubCatalogArea[]): string {
  let id = candidate, suffix = 2;
  while (areas.some((area) => area.id === id)) id = `${candidate}-${suffix++}`;
  return id;
}

function roman(value: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][value - 1] ?? String(value);
}
