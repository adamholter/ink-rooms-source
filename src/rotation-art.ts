import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL, edge, fine, ink, paper } from './art';

export type RotatorArt = {
  root: THREE.Group;
  setMotion(angleRadians: number, lift: number): void;
  dispose(): void;
};

/** A floor-independent turntable mechanism. The caller supplies the carried tiles. */
export function createRotatorArt(radius: number, channel: number): RotatorArt {
  const owned = new Set<THREE.BufferGeometry>();
  const own = <T extends THREE.BufferGeometry>(geometry: T): T => {
    owned.add(geometry);
    return geometry;
  };
  const root = new THREE.Group();
  root.name = 'room-turntable';

  function mesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material = paper,
    outlined = true,
  ) {
    const stored = own(geometry);
    const object = new THREE.Mesh(stored, material);
    parent.add(object);
    if (outlined)
      parent.add(
        new THREE.LineSegments(own(new THREE.EdgesGeometry(stored, 24)), edge),
      );
    return object;
  }
  function box(
    parent: THREE.Object3D,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material = paper,
    outlined = true,
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    mesh(
      group,
      new THREE.BoxGeometry(width, height, depth),
      material,
      outlined,
    );
    return group;
  }
  function cylinder(
    parent: THREE.Object3D,
    r: number,
    height: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material = paper,
    segments = 24,
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    mesh(group, new THREE.CylinderGeometry(r, r, height, segments), material);
    return group;
  }
  function torus(
    parent: THREE.Object3D,
    major: number,
    tube: number,
    y: number,
    material: THREE.Material = ink,
  ) {
    const geometry = new THREE.TorusGeometry(major, tube, 6, 64);
    geometry.rotateX(Math.PI / 2);
    const object = mesh(parent, geometry, material, false);
    object.position.y = y;
    return object;
  }
  function stroke(
    parent: THREE.Object3D,
    points: number[],
    material: THREE.Material = fine,
  ) {
    const pairs: number[] = [];
    for (let i = 3; i < points.length; i += 3)
      pairs.push(...points.slice(i - 3, i + 3));
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(pairs, 3),
    );
    parent.add(new THREE.LineSegments(geometry, material));
  }
  function batch(group: THREE.Group) {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert();
    const sets = new Map<
      string,
      {
        material: THREE.Material;
        lines: boolean;
        geometries: THREE.BufferGeometry[];
      }
    >();
    const old = new Set<THREE.BufferGeometry>();
    group.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)
      )
        return;
      const material = object.material as THREE.Material;
      const lines = object instanceof THREE.LineSegments;
      const key = `${material.uuid}:${lines}`;
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      geometry.deleteAttribute('normal');
      geometry.deleteAttribute('uv');
      if (!sets.has(key)) sets.set(key, { material, lines, geometries: [] });
      sets.get(key)!.geometries.push(geometry);
      old.add(object.geometry);
    });
    group.clear();
    for (const set of sets.values()) {
      const geometry = mergeGeometries(set.geometries);
      set.geometries.forEach((source) => source.dispose());
      if (!geometry) continue;
      own(geometry);
      group.add(
        set.lines
          ? new THREE.LineSegments(geometry, set.material)
          : new THREE.Mesh(geometry, set.material),
      );
    }
    for (const geometry of old) {
      geometry.dispose();
      owned.delete(geometry);
    }
  }

  const fixed = new THREE.Group();
  fixed.name = 'fixed-bearing-base';
  root.add(fixed);
  const requestedTrack = (Math.max(0, radius) + 0.5) * CELL;
  const trackRadius = Math.min(2.35, Math.max(1.05, requestedTrack));

  // Twin rails and individual rollers leave the floor voids visible from above.
  torus(fixed, trackRadius, 0.065, -0.3, ink);
  torus(fixed, trackRadius - 0.16, 0.026, -0.292, paper);
  torus(fixed, trackRadius + 0.16, 0.026, -0.292, paper);
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const x = Math.cos(angle) * trackRadius;
    const z = Math.sin(angle) * trackRadius;
    const roller = cylinder(
      fixed,
      0.057,
      0.16,
      x,
      -0.285,
      z,
      i % 2 ? paper : ink,
      12,
    );
    roller.rotation.z = Math.PI / 2;
    roller.rotation.y = -angle;
  }
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const x = Math.cos(angle) * (trackRadius + 0.24);
    const z = Math.sin(angle) * (trackRadius + 0.24);
    const bolt = cylinder(fixed, 0.035, 0.018, x, -0.274, z, ink, 6);
    bolt.rotation.y = angle;
    stroke(fixed, [x - 0.022, -0.263, z, x + 0.022, -0.263, z], fine);
  }

  // Central bearing, toothed drive wheel and floor-anchored telescoping sleeve.
  cylinder(fixed, 0.48, 0.14, 0, -0.37, 0, paper, 36);
  cylinder(fixed, 0.34, 0.18, 0, -0.31, 0, ink, 32);
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const tooth = box(
      fixed,
      0.13,
      0.09,
      0.16,
      Math.cos(angle) * 0.51,
      -0.35,
      Math.sin(angle) * 0.51,
      paper,
    );
    tooth.rotation.y = -angle;
  }
  cylinder(fixed, 0.22, 0.28, 0, -0.28, 0, paper, 28);
  cylinder(fixed, 0.16, 0.29, 0, -0.275, 0, ink, 28);

  // Clockwise quarter arc, four registration ticks, and a compact channel numeral.
  const arc: number[] = [];
  for (let i = 0; i <= 18; i++) {
    const angle = Math.PI * 0.12 + (i / 18) * Math.PI * 0.48;
    arc.push(Math.cos(angle) * 0.69, -0.178, Math.sin(angle) * 0.69);
  }
  stroke(fixed, arc, edge);
  const arrowAngle = Math.PI * 0.6;
  const ax = Math.cos(arrowAngle) * 0.69;
  const az = Math.sin(arrowAngle) * 0.69;
  stroke(
    fixed,
    [
      ax,
      -0.178,
      az,
      ax + 0.13,
      -0.178,
      az + 0.015,
      ax,
      -0.178,
      az,
      ax + 0.035,
      -0.178,
      az - 0.125,
    ],
    edge,
  );
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    stroke(
      fixed,
      [
        Math.cos(angle) * 0.76,
        -0.178,
        Math.sin(angle) * 0.76,
        Math.cos(angle) * 0.88,
        -0.178,
        Math.sin(angle) * 0.88,
      ],
      edge,
    );
  }
  const numeral = String(Math.max(0, Math.round(channel))).slice(-1);
  const digitSegments: Record<string, number[]> = {
    '0': [-1, -1, 1, -1, 1, 1, -1, 1, -1, -1],
    '1': [0, -1, 0, 1],
    '2': [-1, -1, 1, -1, 1, 0, -1, 1, 1, 1],
    '3': [-1, -1, 1, -1, 0, 0, 1, 0, 0, 0, 1, 1, -1, 1],
  };
  const glyph = digitSegments[numeral] ?? digitSegments['1'];
  const glyphPoints: number[] = [];
  for (let i = 0; i < glyph.length; i += 2)
    glyphPoints.push(
      0.09 + glyph[i] * 0.055,
      -0.177,
      -0.78 + glyph[i + 1] * 0.08,
    );
  stroke(fixed, glyphPoints, edge);
  batch(fixed);

  const moving = new THREE.Group();
  moving.name = 'rotating-undercarriage';
  root.add(moving);
  // Open lattice framing supports a 3x3 section without filling holes in its floor plan.
  const span = Math.min(trackRadius * 1.72, CELL * 2.82);
  for (const offset of [-CELL, 0, CELL]) {
    box(moving, span, 0.085, 0.11, 0, -0.28, offset, paper);
    box(moving, 0.11, 0.085, span, offset, -0.28, 0, paper);
  }
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const brace = box(
      moving,
      span * 1.23,
      0.055,
      0.075,
      0,
      -0.335,
      0,
      ink,
      false,
    );
    brace.rotation.y = angle;
  }
  for (const x of [-CELL, 0, CELL])
    for (const z of [-CELL, 0, CELL]) {
      cylinder(moving, 0.052, 0.1, x, -0.225, z, ink, 8);
    }
  for (let i = -6; i <= 6; i++) {
    const d = i * 0.31;
    stroke(
      moving,
      [-span / 2, -0.231, d - 0.05, -span / 2 + 0.18, -0.231, d + 0.05],
      fine,
    );
  }
  cylinder(moving, 0.29, 0.1, 0, -0.235, 0, paper, 32);
  cylinder(moving, 0.12, 0.16, 0, -0.185, 0, ink, 24);

  // This narrow lip remains visible when the carried floor hides the bearings.
  // It occupies only the outside few centimeters of the 3x3 footprint.
  const rimHalf = CELL * 1.5 - 0.045;
  const rimSpan = rimHalf * 2;
  for (const side of [-1, 1]) {
    box(moving, rimSpan, 0.035, 0.055, 0, -0.026, side * rimHalf, paper);
    box(moving, 0.055, 0.035, rimSpan, side * rimHalf, -0.026, 0, paper);
  }
  for (const x of [-rimHalf, rimHalf])
    for (const z of [-rimHalf, rimHalf]) {
      cylinder(moving, 0.035, 0.018, x, -0.001, z, ink, 6);
      stroke(moving, [x - 0.02, 0.009, z, x + 0.02, 0.009, z], fine);
    }

  // Compact clockwise engraving on the near rim, clear of crate and target centers.
  const topArc: number[] = [];
  const topArcRadius = 0.29;
  const topArcCenterZ = rimHalf;
  for (let i = 0; i <= 12; i++) {
    const angle = Math.PI * 0.12 + (i / 12) * Math.PI * 0.76;
    topArc.push(
      Math.cos(angle) * topArcRadius,
      0.012,
      topArcCenterZ + Math.sin(angle) * 0.034,
    );
  }
  stroke(moving, topArc, ink);
  const arrowX = Math.cos(Math.PI * 0.88) * topArcRadius;
  const arrowZ = topArcCenterZ + Math.sin(Math.PI * 0.88) * 0.034;
  stroke(
    moving,
    [
      arrowX,
      0.012,
      arrowZ,
      arrowX + 0.075,
      0.012,
      arrowZ - 0.035,
      arrowX,
      0.012,
      arrowZ,
      arrowX + 0.085,
      0.012,
      arrowZ + 0.018,
    ],
    ink,
  );
  batch(moving);

  // This shaft is kept separate because lift changes its height every frame.
  const liftShaft = cylinder(root, 0.115, 1, 0, -0.205, 0, paper, 20);
  liftShaft.name = 'telescoping-lift-shaft';

  function setMotion(angleRadians: number, lift: number) {
    const height = Math.max(0, lift);
    moving.rotation.y = angleRadians;
    moving.position.y = height;
    liftShaft.scale.y = Math.max(0.04, height + 0.04);
    liftShaft.position.y = -0.205 + height / 2;
  }
  setMotion(0, 0);

  return {
    root,
    setMotion,
    dispose() {
      for (const geometry of owned) geometry.dispose();
      owned.clear();
    },
  };
}
