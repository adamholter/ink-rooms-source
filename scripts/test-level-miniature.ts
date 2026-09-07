import assert from 'node:assert/strict';
import * as THREE from 'three';
import { edge, fine, ink, paper } from '../src/art.ts';
import { CUBE_BASES, cubeCellPosition, cubeFace } from '../src/cube-topology.ts';
import { iceSurface } from '../src/ice-art.ts';
import { createLevelMiniature } from '../src/level-miniature.ts';
import { LEVELS } from '../src/puzzle.ts';

assert.equal(LEVELS.length, 48, 'the hub has one miniature for every room');
const shared = [paper, ink, edge, fine, iceSurface];
const sharedDisposals = new Map(shared.map(material => [material, 0]));
for (const material of shared) material.addEventListener('dispose', () => sharedDisposals.set(material, sharedDisposals.get(material)! + 1));

for (const [index, level] of LEVELS.entries()) {
  const miniature = createLevelMiniature(level);
  miniature.root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(miniature.root);
  const size = bounds.getSize(new THREE.Vector3());
  const renderables: THREE.Object3D[] = [];
  miniature.root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) renderables.push(object);
  });

  assert.ok(!bounds.isEmpty(), `room ${index + 1} ${level.name}: nonempty geometry`);
  assert.ok(size.x <= 2.2001 && size.z <= 2.2001, `room ${index + 1} ${level.name}: at most 2.2 units wide`);
  assert.ok(size.y <= 1.4001, `room ${index + 1} ${level.name}: at most 1.4 units tall`);
  assert.ok(renderables.length > 0 && renderables.length <= 6, `room ${index + 1} ${level.name}: one to six draw calls`);
  assert.ok(renderables.every(object => (object as THREE.Mesh | THREE.LineSegments).geometry.getAttribute('position').count > 0), `room ${index + 1} ${level.name}: every batch has vertices`);

  if (level.cube) {
    const content = miniature.root.children[0];
    assert.ok(Math.abs(content.scale.x - content.scale.y) < 1e-8 && Math.abs(content.scale.y - content.scale.z) < 1e-8, `room ${index + 1}: cube proportions stay isotropic`);
    assert.ok(level.map.some(row => row.includes('~')), `room ${index + 1}: source cube has shell holes`);
    const paperMesh = renderables.find(object => object instanceof THREE.Mesh && object.material === paper) as THREE.Mesh;
    assert.ok(paperMesh, `room ${index + 1}: cube has a paper shell batch`);
    const positions = paperMesh.geometry.getAttribute('position');
    const triangleCenters: THREE.Vector3[] = [];
    for (let vertex = 0; vertex < positions.count; vertex += 3) {
      triangleCenters.push(new THREE.Vector3(
        (positions.getX(vertex) + positions.getX(vertex + 1) + positions.getX(vertex + 2)) / 3,
        (positions.getY(vertex) + positions.getY(vertex + 1) + positions.getY(vertex + 2)) / 3,
        (positions.getZ(vertex) + positions.getZ(vertex + 1) + positions.getZ(vertex + 2)) / 3,
      ));
    }
    const cell = .46, n = level.cube.size;
    for (let z = 0; z < n; z++) for (let x = 0; x < n * 6; x++) if (level.map[z][x] === '~') {
      const center = new THREE.Vector3(...cubeCellPosition(n, { x, z }, cell));
      const basis = CUBE_BASES[cubeFace(n, { x, z })];
      const u = new THREE.Vector3(...basis.u), v = new THREE.Vector3(...basis.v), normal = new THREE.Vector3(...basis.normal);
      const coversHole = triangleCenters.some(point => {
        const delta = point.clone().sub(center);
        return Math.abs(delta.dot(u)) < cell * .22 && Math.abs(delta.dot(v)) < cell * .22 && Math.abs(delta.dot(normal)) < cell * .12;
      });
      assert.ok(!coversHole, `room ${index + 1}: cube hole ${x},${z} has no shell face`);
    }
  }

  let geometryDisposals = 0;
  for (const object of renderables) (object as THREE.Mesh | THREE.LineSegments).geometry.addEventListener('dispose', () => geometryDisposals++);
  miniature.dispose();
  miniature.dispose();
  assert.equal(geometryDisposals, renderables.length, `room ${index + 1}: owned batches dispose exactly once`);
}

for (const [material, count] of sharedDisposals) assert.equal(count, 0, `${material.uuid}: shared material remains live`);
console.log('Level miniatures passed: 48 bounded, nonempty, batched rooms; cube proportions and disposal ownership verified.');
