import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CELL} from '../src/art.ts';
import {buildCubeShellGeometry} from '../src/cube-shell.ts';
import {CUBE_BASES,cubeFace,cubeStep} from '../src/cube-topology.ts';
import {LEVELS,type Level,type Point} from '../src/puzzle.ts';

const precision=1e5;
const key=(v:THREE.Vector3)=>v.toArray().map(n=>Math.round(n*precision)).join(',');
const edgeKey=(a:THREE.Vector3,b:THREE.Vector3)=>[key(a),key(b)].sort().join('|');
const triangleKey=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3)=>[key(a),key(b),key(c)].sort().join('|');
const safe=(level:Level,p:Point)=>!['~','#'].includes(level.map[p.z]?.[p.x]??'#')&&!level.bridges?.some(b=>b.x===p.x&&b.z===p.z);
const directions=[[0,-1],[1,0],[0,1],[-1,0]] as const;

function vectors(geometry:THREE.BufferGeometry):THREE.Vector3[] {
  assert.equal(geometry.index,null,'cube shell geometries stay nonindexed');
  const position=geometry.getAttribute('position');
  assert.ok(position instanceof THREE.BufferAttribute,'geometry has a position buffer');
  return Array.from({length:position.count},(_,i)=>new THREE.Vector3(position.getX(i),position.getY(i),position.getZ(i)));
}

function verify(level:Level,label:string) {
  const n=level.cube?.size;
  assert.ok(n,`${label}: cube size exists`);
  assert.equal(level.map.length,n,`${label}: cube map has the declared height`);
  assert.ok(level.map.every(row=>row.length===n*6),`${label}: cube map has six complete faces`);
  const shell=buildCubeShellGeometry(level),vertices=[...vectors(shell.surface),...vectors(shell.iceSurface)];
  assert.equal(vertices.length%3,0,`${label}: surface contains complete triangles`);

  let cells=0,exposed=0;
  for(let z=0;z<n;z++)for(let x=0;x<n*6;x++)if(safe(level,{x,z})){
    cells++;
    for(const [dx,dz] of directions)if(!safe(level,cubeStep(n,{x,z},dx,dz).point))exposed++;
  }
  assert.equal(vertices.length/3,cells*4+exposed*2,`${label}: exactly two outer, two inner, and two triangles per exposed wall`);

  const triangles=new Set<string>(),directed=new Map<string,{forward:number;reverse:number}>();
  let signedVolume=0;
  const outer=n*CELL/2-.05,inner=n*CELL/2-.25;
  for(let i=0;i<vertices.length;i+=3){
    const a=vertices[i],b=vertices[i+1],c=vertices[i+2];
    const normal=new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a));
    assert.ok(normal.lengthSq()>1e-10,`${label}: triangle ${i/3} is nondegenerate`);
    const tKey=triangleKey(a,b,c);
    assert.ok(!triangles.has(tKey),`${label}: triangle ${i/3} does not duplicate another triangle`);
    triangles.add(tKey);
    signedVolume+=a.dot(new THREE.Vector3().crossVectors(b,c))/6;

    const radii=[a,b,c].map(v=>Math.max(...v.toArray().map(Math.abs)));
    const centroid=a.clone().add(b).add(c).multiplyScalar(1/3);
    if(radii.every(r=>Math.abs(r-outer)<2e-5))assert.ok(normal.dot(centroid)>0,`${label}: outer face points away from the cube`);
    if(radii.every(r=>Math.abs(r-inner)<2e-5))assert.ok(normal.dot(centroid)<0,`${label}: inner face points into the cube cavity`);

    for(const [from,to] of [[a,b],[b,c],[c,a]] as const){
      const canonical=edgeKey(from,to),forward=key(from)<key(to),counts=directed.get(canonical)??{forward:0,reverse:0};
      if(forward)counts.forward++;else counts.reverse++;
      directed.set(canonical,counts);
    }
  }
  for(const [edge,counts] of directed){
    assert.equal(counts.forward,counts.reverse,`${label}: closed boundary has balanced winding at ${edge}`);
    assert.ok(counts.forward>0,`${label}: boundary edge is used`);
  }
  if(cells)assert.ok(signedVolume>1e-7,`${label}: closed shell has outward winding`);
  else assert.equal(vertices.length,0,`${label}: empty occupancy has no surface`);

  const lineKeys=new Set<string>();
  for(const [kind,geometry] of [['fine',shell.fineEdges],['rim',shell.rimEdges]] as const){
    const points=vectors(geometry);
    assert.equal(points.length%2,0,`${label}: ${kind} buffer contains complete line segments`);
    for(let i=0;i<points.length;i+=2){
      assert.ok(points[i].distanceToSquared(points[i+1])>1e-10,`${label}: ${kind} line ${i/2} is nondegenerate`);
      const segment=edgeKey(points[i],points[i+1]);
      assert.ok(!lineKeys.has(segment),`${label}: ${kind} line ${i/2} is globally deduplicated`);
      lineKeys.add(segment);
    }
  }
  for(const geometry of Object.values(shell))geometry.dispose();
  return {cells,triangles:triangles.size,lines:lineKeys.size};
}

function fixture(n:number,occupied:Point[],name:string):Level {
  const map=Array.from({length:n},()=>Array(n*6).fill('~'));
  for(const p of occupied)map[p.z][p.x]=' ';
  return {name,subtitle:'',hint:'',cube:{size:n},map:map.map(row=>row.join(''))};
}

const results=[];
for(const [index,level] of LEVELS.entries())if(level.cube)results.push(verify(level,`room ${index+1} ${level.name}`));
assert.equal(results.length,8,'four introductory and four challenge cube rooms');

const n=3,all=Array.from({length:n},(_,z)=>Array.from({length:n*6},(_,x)=>({x,z}))).flat();
results.push(verify(fixture(n,all,'full cube'),'full cube'));

// Exercise every occupancy combination around each of the four corners of every face.
// cubeStep supplies the correct neighbors across seams, including reversed edge coordinates.
for(let face=0;face<6;face++)for(const u of [0,n-1])for(const z of [0,n-1]){
  const center={x:face*n+u,z},neighbors=directions.map(([dx,dz])=>cubeStep(n,center,dx,dz).point);
  for(let mask=0;mask<16;mask++){
    const occupied=[center,...neighbors.filter((_,i)=>mask&(1<<i))];
    results.push(verify(fixture(n,occupied,`corner neighbors ${face}/${u}/${z}/${mask}`),`corner neighbors ${face}/${u}/${z}/${mask}`));
  }
}

// A geometric cube corner has one corner cell on each of three faces. Test all
// eight occupancy arrangements at every cube vertex, including vertex-only contact.
const cornerGroups=new Map<string,Point[]>();
for(let face=0;face<6;face++)for(const u of [0,n-1])for(const z of [0,n-1]){
  const p={x:face*n+u,z},basis=CUBE_BASES[cubeFace(n,p)];
  const signs=basis.normal.map((v,i)=>v+basis.u[i]*(u?1:-1)+basis.v[i]*(z?1:-1));
  const cKey=signs.map(v=>Math.sign(v)).join(',');
  cornerGroups.set(cKey,[...(cornerGroups.get(cKey)??[]),p]);
}
assert.equal(cornerGroups.size,8);
for(const [corner,cells] of cornerGroups){
  assert.equal(cells.length,3,`cube corner ${corner} belongs to three faces`);
  for(let mask=0;mask<8;mask++)results.push(verify(fixture(n,cells.filter((_,i)=>mask&(1<<i)),`vertex ${corner}/${mask}`),`vertex ${corner}/${mask}`));
}

console.log(`Cube shell geometry passed: ${results.length} room and occupancy fixtures; no duplicate triangles or lines; closed, consistently wound, nondegenerate surfaces.`);
