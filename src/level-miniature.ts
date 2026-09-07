import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL, edge, fine, ink, paper } from './art.ts';
import { iceSurface } from './ice-art.ts';
import { CUBE_BASES, cubeCellPosition, cubeFace } from './cube-topology.ts';
import { buildCubeShellGeometry } from './cube-shell.ts';
import type { Level, Point } from './puzzle.ts';

type Bucket = { material: THREE.Material; lines: boolean; geometries: THREE.BufferGeometry[] };

/** A small, batched, theme-aware model of a room's starting layout. */
export function createLevelMiniature(level: Level): { root: THREE.Group; dispose(): void } {
  const root = new THREE.Group();
  root.name = `level-miniature-${level.name}`;
  const content = new THREE.Group();
  root.add(content);
  const owned = new Set<THREE.BufferGeometry>();
  const buckets = new Map<string, Bucket>([
    ['paper', { material: paper, lines: false, geometries: [] }],
    ['ink', { material: ink, lines: false, geometries: [] }],
    ['ice', { material: iceSurface, lines: false, geometries: [] }],
    ['edge', { material: edge, lines: true, geometries: [] }],
    ['fine', { material: fine, lines: true, geometries: [] }],
  ]);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  function add(key: string, geometry: THREE.BufferGeometry, transform = new THREE.Matrix4()) {
    if (!geometry.getAttribute('position')?.count) { geometry.dispose(); return; }
    geometry.applyMatrix4(transform);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    buckets.get(key)!.geometries.push(geometry.index ? geometry.toNonIndexed() : geometry);
    if (geometry.index) geometry.dispose();
  }
  function transform(x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, q = quaternion.identity()) {
    return matrix.compose(position.set(x, y, z), q, scale.set(sx, sy, sz)).clone();
  }
  function box(key: string, x: number, y: number, z: number, w: number, h: number, d: number, outline = true, q?: THREE.Quaternion) {
    const m = transform(x, y, z, 1, 1, 1, q);
    const g = new THREE.BoxGeometry(w, h, d);
    add(key, g, m);
    if (outline) {
      const source = new THREE.BoxGeometry(w, h, d);
      add('edge', new THREE.EdgesGeometry(source), m);
      source.dispose();
    }
  }
  function cylinder(key: string, x: number, y: number, z: number, radius: number, height: number, segments = 12, q?: THREE.Quaternion) {
    const m = transform(x, y, z, 1, 1, 1, q);
    add(key, new THREE.CylinderGeometry(radius, radius, height, segments), m);
  }
  function ring(x: number, y: number, z: number, radius: number, q?: THREE.Quaternion) {
    const orient = (q ?? new THREE.Quaternion()).clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    add('ink', new THREE.TorusGeometry(radius, .025, 4, 16), transform(x, y, z, 1, 1, 1, orient));
  }
  const has = (items: Point[] | undefined, x: number, z: number) => !!items?.some(p => p.x === x && p.z === z);
  const machineryAt = (x: number, z: number) => level.bridges?.some(p => p.x === x && p.z === z);

  if (level.cube) {
    const n = level.cube.size, cell = .46;
    const shell = buildCubeShellGeometry(level);
    const shellScale = new THREE.Matrix4().makeScale(cell / CELL, cell / CELL, cell / CELL);
    add('paper', shell.surface, shellScale);
    add('ice', shell.iceSurface, shellScale);
    add('fine', shell.fineEdges, shellScale);
    add('edge', shell.rimEdges, shellScale);
    const facePose = (point: Point) => {
      const basis = CUBE_BASES[cubeFace(n, point)];
      const center = new THREE.Vector3(...cubeCellPosition(n, point, cell));
      const faceMatrix = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(...basis.u), new THREE.Vector3(...basis.normal), new THREE.Vector3(...basis.v),
      );
      const q = new THREE.Quaternion().setFromRotationMatrix(faceMatrix);
      const normal = new THREE.Vector3(...basis.normal);
      return { basis, q, normal, marker: center.addScaledVector(normal, .09) };
    };
    for (let z = 0; z < n; z++) for (let x = 0; x < n * 6; x++) {
      const tile = level.map[z]?.[x] ?? '~';
      if (tile === '~' || tile === '#') continue;
      const { basis, q, marker } = facePose({ x, z });
      if (tile === '.') ring(marker.x, marker.y, marker.z, .105, q);
      if (tile === 'E') {
        box('ink', marker.x, marker.y, marker.z, .23, .025, .23, false, q);
        const inset = marker.clone().addScaledVector(new THREE.Vector3(...basis.normal), .01);
        box('paper', inset.x, inset.y, inset.z, .12, .03, .12, false, q);
      }
      if (tile === '$') box('paper', marker.x, marker.y, marker.z, .25, .25, .25, true, q);
      if (tile === '@') cylinder('ink', marker.x, marker.y, marker.z, .105, .28, 10, q);
    }
    for (const sw of level.switches ?? []) {
      const { q, normal, marker } = facePose(sw);
      cylinder('ink', marker.x, marker.y, marker.z, cell * .21, .035, 12, q);
      const cap = marker.clone().addScaledVector(normal, .025);
      cylinder('paper', cap.x, cap.y, cap.z, cell * .09, .045, 10, q);
    }
    for (const bridge of level.bridges ?? []) {
      const { basis, q, normal, marker } = facePose(bridge);
      const deck = marker.clone().addScaledVector(normal, -.04);
      box('paper', deck.x, deck.y, deck.z, cell * .84, .055, cell * .90, true, q);
      const u = new THREE.Vector3(...basis.u);
      for (const side of [-1, 1]) {
        const rail = marker.clone().addScaledVector(u, side * cell * .40).addScaledVector(normal, .045);
        box('ink', rail.x, rail.y, rail.z, .025, .13, cell * .88, false, q);
      }
    }
  } else {
    const cell = .30;
    const rows = level.map.length, cols = Math.max(...level.map.map(row => row.length));
    const cx = (cols - 1) / 2, cz = (rows - 1) / 2;
    const tierAt = (x: number, z: number) => level.elevators?.find(p => p.x === x && p.z === z)?.low ?? level.bridges?.find(p => p.x === x && p.z === z)?.height ?? level.heights?.[z]?.[x] ?? 0;
    for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
      const tile = level.map[z]?.[x] ?? '~';
      const solid = tile !== '~' || machineryAt(x, z);
      if (!solid) continue;
      const px = (x - cx) * cell, pz = (z - cz) * cell, tier = tierAt(x, z), top = tier * .115;
      const slabHeight = .10 + top;
      box(has(level.ice, x, z) ? 'ice' : 'paper', px, top - slabHeight / 2, pz, cell * .94, slabHeight, cell * .94, true);
      if (tile === '#') box('paper', px, top + .065, pz, cell * .88, .13, cell * .88, true);
      if (tile === '.') ring(px, top + .025, pz, cell * .25);
      if (tile === 'E') {
        box('ink', px, top + .026, pz, cell * .52, .025, cell * .52, false);
        box('paper', px, top + .042, pz, cell * .27, .03, cell * .27, false);
      }
      if (tile === '$') box('paper', px, top + .15, pz, cell * .55, .29, cell * .55, true);
      if (tile === '@') cylinder('ink', px, top + .15, pz, cell * .19, .30, 10);
    }
    for (const sw of level.switches ?? []) {
      const x = (sw.x - cx) * cell, z = (sw.z - cz) * cell, y = tierAt(sw.x, sw.z) * .115 + .035;
      cylinder('ink', x, y, z, cell * .21, .035, 12);
      cylinder('paper', x, y + .022, z, cell * .09, .045, 10);
    }
    for (const lift of level.elevators ?? []) {
      const x = (lift.x - cx) * cell, z = (lift.z - cz) * cell, y = lift.low * .115 + .025;
      box('ink', x, y, z, cell * .72, .05, cell * .72, true);
    }
    for (const bridge of level.bridges ?? []) {
      const x = (bridge.x - cx) * cell, z = (bridge.z - cz) * cell, y = bridge.height * .115 + .075;
      box('ink', x - cell * .38, y, z, .025, .13, cell * .88, false);
      box('ink', x + cell * .38, y, z, .025, .13, cell * .88, false);
    }
    for (const rotor of level.rotators ?? []) {
      const x = (rotor.x - cx) * cell, z = (rotor.z - cz) * cell;
      ring(x, .045, z, (rotor.radius + .42) * cell);
      cylinder('ink', x, .04, z, cell * .09, .055, 10);
    }
    for (const robot of level.robots ?? []) {
      const x = (robot.x - cx) * cell, z = (robot.z - cz) * cell, y = tierAt(robot.x, robot.z) * .115;
      box('paper', x, y + .13, z, cell * .42, .22, cell * .48, true);
      const angle = -robot.direction * Math.PI / 2;
      box('ink', x + Math.sin(angle) * cell * .22, y + .15, z + Math.cos(angle) * cell * .22, cell * .18, .07, .06, false);
    }
  }

  for (const [key, bucket] of buckets) {
    if (!bucket.geometries.length) continue;
    const merged = mergeGeometries(bucket.geometries, false);
    for (const geometry of bucket.geometries) geometry.dispose();
    if (!merged) continue;
    owned.add(merged);
    const object = bucket.lines ? new THREE.LineSegments(merged, bucket.material) : new THREE.Mesh(merged, bucket.material);
    object.name = `miniature-${key}`;
    content.add(object);
  }

  content.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(content);
  if (!bounds.isEmpty()) {
    const size = bounds.getSize(new THREE.Vector3());
    const horizontalScale = Math.min(1, 2.2 / Math.max(size.x, size.z, .001));
    if (level.cube) {
      const uniform = Math.min(horizontalScale, 1.4 / Math.max(size.y, .001));
      content.scale.setScalar(uniform);
    } else {
      const desiredHeight = THREE.MathUtils.clamp(size.y * horizontalScale, .4, 1.4);
      content.scale.set(horizontalScale, desiredHeight / Math.max(size.y, .001), horizontalScale);
    }
    content.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(content);
    const center = fitted.getCenter(new THREE.Vector3());
    content.position.x -= center.x;
    content.position.z -= center.z;
    content.position.y -= fitted.min.y;
  }

  let disposed = false;
  return { root, dispose() { if (disposed) return; disposed = true; for (const geometry of owned) geometry.dispose(); owned.clear(); } };
}
