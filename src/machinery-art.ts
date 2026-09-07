import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL, TIER_HEIGHT, edge, fine, ink, paper } from './art';

const red = new THREE.MeshBasicMaterial({ color: 0xc88683 });
const green = new THREE.MeshBasicMaterial({ color: 0x80b99a });
const geometries = new Set<THREE.BufferGeometry>();
const own = <T extends THREE.BufferGeometry>(geometry: T): T => {
  geometries.add(geometry);
  return geometry;
};

export function disposeMachineryArt() {
  for (const geometry of geometries) geometry.dispose();
  geometries.clear();
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
  const geometry = own(new THREE.BoxGeometry(width, height, depth));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  if (outlined) {
    const lines = new THREE.LineSegments(own(new THREE.EdgesGeometry(geometry)), edge);
    lines.position.copy(mesh.position);
    parent.add(lines);
  }
  return mesh;
}

function cylinder(
  parent: THREE.Object3D,
  radius: number,
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
  const geometry = own(new THREE.CylinderGeometry(radius, radius, height, segments));
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);
  const lines = new THREE.LineSegments(own(new THREE.EdgesGeometry(geometry, 22)), edge);
  group.add(lines);
  return group;
}

function stroke(parent: THREE.Object3D, points: number[], material: THREE.Material = fine) {
  const segments: number[] = [];
  for (let i = 3; i < points.length; i += 3) segments.push(...points.slice(i - 3, i + 3));
  const geometry = own(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
  const lines = new THREE.LineSegments(geometry, material);
  parent.add(lines);
  return lines;
}

function bolt(parent: THREE.Object3D, x: number, y: number, z: number, radius = 0.026) {
  const head = cylinder(parent, radius, 0.014, x, y, z, ink, 6);
  head.rotation.z = 0;
  stroke(parent, [x - radius * 0.58, y + 0.009, z, x + radius * 0.58, y + 0.009, z], fine);
}

function batch(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<string, { material: THREE.Material; lines: boolean; sources: THREE.BufferGeometry[] }>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    const material = object.material as THREE.Material;
    const lines = object instanceof THREE.LineSegments;
    const key = `${material.uuid}:${lines}`;
    if (!groups.has(key)) groups.set(key, { material, lines, sources: [] });
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    if (!lines) {
      geometry.deleteAttribute('uv');
      geometry.deleteAttribute('normal');
    }
    groups.get(key)!.sources.push(geometry);
  });
  const old = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) old.add(object.geometry);
  });
  root.clear();
  for (const group of groups.values()) {
    const geometry = own(mergeGeometries(group.sources)!);
    group.sources.forEach((source) => source.dispose());
    root.add(group.lines ? new THREE.LineSegments(geometry, group.material) : new THREE.Mesh(geometry, group.material));
  }
  for (const geometry of old) {
    geometry.dispose();
    geometries.delete(geometry);
  }
  return root;
}

function addChannelGlyph(parent: THREE.Object3D, channel: number, y: number, z = 0, material: THREE.Material = ink) {
  const n = ((Math.round(channel) - 1) % 3 + 3) % 3 + 1;
  const glyph = new THREE.Group();
  glyph.position.set(0, y, z);
  parent.add(glyph);
  const s = 0.09;
  if (n === 1) stroke(glyph, [-s * 0.35, 0, -s, s * 0.25, 0, -s * 1.35, s * 0.25, 0, s * 1.15, -s * 0.45, 0, s * 1.15, s * 0.65, 0, s * 1.15], material);
  if (n === 2) stroke(glyph, [-s * 0.7, 0, -s, -s * 0.35, 0, -s * 1.35, s * 0.45, 0, -s * 1.35, s * 0.7, 0, -s, s * 0.65, 0, -s * 0.55, -s * 0.65, 0, s * 1.15, s * 0.75, 0, s * 1.15], material);
  if (n === 3) stroke(glyph, [-s * 0.65, 0, -s * 1.25, s * 0.45, 0, -s * 1.25, s * 0.72, 0, -s * 0.65, s * 0.25, 0, 0, s * 0.72, 0, s * 0.65, s * 0.42, 0, s * 1.2, -s * 0.65, 0, s * 1.2], material);
  return glyph;
}

export function createSwitchArt(channel: number): { root: THREE.Group; setActive(active: boolean): void } {
  const root = new THREE.Group();
  const staticPart = new THREE.Group();
  root.add(staticPart);

  box(staticPart, CELL - 0.13, 0.08, CELL - 0.13, 0, -0.035, 0, paper);
  box(staticPart, CELL - 0.23, 0.025, CELL - 0.23, 0, 0.018, 0, ink, false);
  box(staticPart, CELL - 0.34, 0.025, CELL - 0.34, 0, 0.036, 0, paper);
  for (const x of [-0.61, 0.61]) for (const z of [-0.61, 0.61]) bolt(staticPart, x, 0.022, z, 0.025);
  for (let i = -2; i <= 2; i++) stroke(staticPart, [-0.59, 0.054, i * 0.18, -0.52, 0.054, i * 0.18, -0.47, 0.054, i * 0.18], fine);

  const consolePart = new THREE.Group();
  consolePart.position.set(0, 0, -0.49);
  root.add(consolePart);
  box(consolePart, 0.42, 0.16, 0.2, 0, 0.1, 0, paper);
  box(consolePart, 0.31, 0.016, 0.115, 0, 0.19, 0.005, ink, false);
  addChannelGlyph(consolePart, channel, 0.201, 0.006, paper);
  const lamp = new THREE.Mesh(own(new THREE.SphereGeometry(0.047, 16, 10)), red);
  lamp.position.set(0.15, 0.205, 0.015);
  consolePart.add(lamp);
  for (const x of [-0.16, 0.16]) bolt(consolePart, x, 0.192, -0.06, 0.014);

  const plate = new THREE.Group();
  root.add(plate);
  box(plate, 0.86, 0.035, 0.69, 0, 0.071, 0.08, paper);
  box(plate, 0.72, 0.012, 0.55, 0, 0.095, 0.08, paper);
  for (const x of [-0.35, 0.35]) for (const z of [-0.245, 0.405]) bolt(plate, x, 0.105, z, 0.017);
  stroke(plate, [-0.25, 0.104, -0.08, 0.25, 0.104, -0.08, 0.31, 0.104, 0.08, 0.25, 0.104, 0.24, -0.25, 0.104, 0.24, -0.31, 0.104, 0.08, -0.25, 0.104, -0.08], fine);
  addChannelGlyph(plate, channel, 0.107, 0.08, ink);

  batch(staticPart);
  batch(plate);
  return {
    root,
    setActive(active: boolean) {
      plate.position.y = active ? -0.035 : 0;
      lamp.material = active ? green : red;
    },
  };
}

function beam(parent: THREE.Object3D, length: number, thickness = 0.055) {
  const group = new THREE.Group();
  parent.add(group);
  box(group, length, thickness, thickness, 0, 0, 0, paper);
  cylinder(group, thickness * 0.62, thickness * 1.25, -length / 2, 0, 0, ink, 12).rotation.z = Math.PI / 2;
  cylinder(group, thickness * 0.62, thickness * 1.25, length / 2, 0, 0, ink, 12).rotation.z = Math.PI / 2;
  return group;
}

function placeBeam(beamGroup: THREE.Group, x1: number, y1: number, x2: number, y2: number, z: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  beamGroup.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
  beamGroup.rotation.z = Math.atan2(dy, dx);
  beamGroup.scale.x = Math.hypot(dx, dy);
}

export function createElevatorArt(low: number, high: number, channel: number): { root: THREE.Group; setProgress(t: number): void } {
  const root = new THREE.Group();
  const lowY = low * TIER_HEIGHT;
  const highY = high * TIER_HEIGHT;
  const travel = Math.max(0.001, highY - lowY);
  const staticPart = new THREE.Group();
  root.add(staticPart);
  box(staticPart, CELL - 0.12, 0.11, CELL - 0.12, 0, lowY - 0.115, 0, paper);
  box(staticPart, CELL - 0.28, 0.028, CELL - 0.28, 0, lowY - 0.046, 0, ink, false);
  for (const x of [-0.6, 0.6]) for (const z of [-0.6, 0.6]) bolt(staticPart, x, lowY - 0.045, z, 0.023);
  // Corner guide posts leave all four cell centerlines clear for cargo movement.
  for (const x of [-0.63, 0.63]) for (const z of [-0.57, 0.57]) {
    box(staticPart, 0.055, travel + 0.12, 0.055, x, lowY + travel / 2 - 0.03, z, paper);
    for (let y = lowY + 0.08; y < highY; y += 0.16) stroke(staticPart, [x - 0.03, y, z + 0.03, x + 0.03, y + 0.055, z + 0.03], fine);
  }
  const motor = new THREE.Group();
  motor.position.set(0.51, lowY + 0.03, -0.51);
  staticPart.add(motor);
  cylinder(motor, 0.115, 0.25, 0, 0, 0, paper, 20).rotation.z = Math.PI / 2;
  cylinder(motor, 0.055, 0.28, 0, 0, 0, ink, 14).rotation.z = Math.PI / 2;
  addChannelGlyph(staticPart, channel, lowY + 0.012, -0.55);
  batch(staticPart);

  const platform = new THREE.Group();
  root.add(platform);
  // Keep the base top below the black inset. Coplanar top faces flicker while orbiting.
  box(platform, CELL - 0.18, 0.11, CELL - 0.18, 0, -0.083, 0, paper);
  box(platform, CELL - 0.31, 0.018, CELL - 0.31, 0, -0.027, 0, ink, false);
  box(platform, CELL - 0.42, 0.013, CELL - 0.42, 0, -0.0065, 0, paper);
  for (const x of [-0.57, 0.57]) for (const z of [-0.57, 0.57]) bolt(platform, x, -0.011, z, 0.022);
  for (let i = -2; i <= 2; i++) stroke(platform, [-0.45, 0.006, i * 0.19, 0.45, 0.006, i * 0.19], fine);
  addChannelGlyph(platform, channel, 0.012, -0.44, ink);
  batch(platform);

  const scissors = new THREE.Group();
  root.add(scissors);
  const arms: THREE.Group[] = [];
  const centerPins: THREE.Group[] = [];
  for (const z of [-0.47, 0.47]) {
    arms.push(beam(scissors, 1), beam(scissors, 1));
    const pin = cylinder(scissors, 0.045, 0.145, 0, 0, z, ink, 14);
    pin.rotation.x = Math.PI / 2;
    centerPins.push(pin);
  }
  const pistons: { outer: THREE.Group; rod: THREE.Group }[] = [];
  for (const z of [-0.29, 0.29]) {
    const outer = new THREE.Group();
    const rod = new THREE.Group();
    scissors.add(outer, rod);
    box(outer, 0.38, 0.075, 0.075, 0.19, 0, z, ink);
    box(rod, 0.38, 0.035, 0.035, -0.19, 0, z, paper);
    pistons.push({ outer, rod });
  }

  const setProgress = (value: number) => {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    const top = THREE.MathUtils.lerp(lowY, highY, t);
    platform.position.y = top;
    const lift = Math.max(0.12, top - lowY + 0.08);
    let index = 0;
    for (const z of [-0.47, 0.47]) {
      placeBeam(arms[index++], -0.53, lowY - 0.035, 0.53, top - 0.08, z - 0.035);
      placeBeam(arms[index++], 0.53, lowY - 0.035, -0.53, top - 0.08, z + 0.035);
    }
    const centerY = (lowY - 0.035 + top - 0.08) / 2;
    centerPins.forEach((pin) => { pin.position.y = centerY; });
    const angle = Math.atan2(lift * 0.55, 0.62);
    for (const [i, piston] of pistons.entries()) {
      piston.outer.position.set(-0.18, lowY + 0.01, 0);
      piston.outer.rotation.z = i ? angle : Math.PI - angle;
      piston.rod.position.set(i ? 0.12 : -0.12, lowY + lift * 0.27, 0);
      piston.rod.rotation.z = i ? angle : Math.PI - angle;
    }
  };
  setProgress(0);
  return { root, setProgress };
}

function bridgePanel(length: number) {
  const root = new THREE.Group();
  box(root, CELL - 0.2, 0.1, length - 0.035, 0, -0.068, length / 2, paper);
  box(root, CELL - 0.31, 0.018, length - 0.11, 0, -0.027, length / 2, ink, false);
  box(root, CELL - 0.4, 0.013, length - 0.15, 0, -0.0065, length / 2, paper, false);
  for (const x of [-0.56, 0.56]) box(root, 0.055, 0.075, length - 0.04, x, 0.025, length / 2, paper);
  for (let z = 0.12; z < length; z += 0.18) stroke(root, [-0.48, 0.023, z, 0.48, 0.023, z], fine);
  return root;
}

export function createBridgeArt(channel: number): { root: THREE.Group; setProgress(t: number): void } {
  const root = new THREE.Group();
  const staticPart = new THREE.Group();
  root.add(staticPart);
  const hingeZ = -CELL / 2 + 0.08;
  box(staticPart, CELL - 0.08, 0.14, 0.27, 0, -0.11, hingeZ - 0.08, paper);
  box(staticPart, CELL - 0.22, 0.028, 0.2, 0, -0.022, hingeZ - 0.07, ink, false);
  for (const x of [-0.58, 0.58]) {
    cylinder(staticPart, 0.105, 0.11, x, 0, hingeZ, paper, 20).rotation.z = Math.PI / 2;
    bolt(staticPart, x, 0.02, hingeZ - 0.12, 0.02);
  }
  const housing = new THREE.Group();
  housing.position.set(0, 0.09, hingeZ - 0.2);
  staticPart.add(housing);
  box(housing, 0.45, 0.22, 0.18, 0, 0, 0, paper);
  addChannelGlyph(housing, channel, 0.12, 0);
  batch(staticPart);
  const lamp = new THREE.Mesh(own(new THREE.SphereGeometry(0.04, 14, 8)), red);
  lamp.position.set(0.17, 0.215, hingeZ - 0.18);
  root.add(lamp);

  const panelLength = (CELL - 0.16) / 2;
  const firstPivot = new THREE.Group();
  firstPivot.position.z = hingeZ;
  root.add(firstPivot);
  const first = bridgePanel(panelLength);
  batch(first);
  firstPivot.add(first);
  const secondPivot = new THREE.Group();
  secondPivot.position.z = panelLength;
  firstPivot.add(secondPivot);
  const second = bridgePanel(panelLength);
  batch(second);
  secondPivot.add(second);

  const barrel = cylinder(root,.035,1,0,0,0,ink,16);
  const rod = cylinder(root,.019,1,0,0,0,paper,16);
  const anchor=new THREE.Vector3(-.49,-.14,hingeZ-.12),axis=new THREE.Vector3(0,1,0);
  const setProgress = (value: number) => {
    const t = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(value, 0, 1), 0, 1);
    firstPivot.rotation.x = -Math.PI / 2 * (1 - t);
    secondPivot.rotation.x = Math.PI * (1 - t);
    const angle=Math.PI/2*(1-t);
    const tip=new THREE.Vector3(-.49,Math.sin(angle)*panelLength*.5,hingeZ+Math.cos(angle)*panelLength*.5);
    const delta=tip.clone().sub(anchor),length=delta.length(),direction=delta.clone().normalize();
    barrel.position.copy(anchor).addScaledVector(direction,length*.29);
    rod.position.copy(tip).addScaledVector(direction,-length*.29);
    for(const part of [barrel,rod]){part.scale.y=length*.58;part.quaternion.setFromUnitVectors(axis,direction);}
    lamp.material = t > 0.96 ? green : red;
  };
  setProgress(0);
  return { root, setProgress };
}
