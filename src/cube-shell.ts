import * as THREE from 'three';
import {CELL} from './art.ts';
import {CUBE_BASES,cubeCellPosition,cubeFace,cubeStep} from './cube-topology.ts';
import type {Level} from './puzzle.ts';

// Build the boundary of a single shell. Radial corner vertices give perpendicular
// tiles matching miters, rather than intersecting rectangular slabs.
export function buildCubeShellGeometry(level:Level) {
  const n=level.cube!.size,half=n*CELL/2,triangles:number[]=[];
  const segments=new Map<string,{a:THREE.Vector3;b:THREE.Vector3;rim:boolean}>();
  const vertexKey=(v:THREE.Vector3)=>v.toArray().map(x=>Math.round(x*1e6)).join(',');
  function line(a:THREE.Vector3,b:THREE.Vector3,rim=false) {
    const key=[vertexKey(a),vertexKey(b)].sort().join('|'),previous=segments.get(key);
    if(!previous||rim&&!previous.rim)segments.set(key,{a,b,rim});
  }
  function quad(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,d:THREE.Vector3) {
    for(const v of [a,b,c,a,c,d])triangles.push(...v.toArray());
  }
  const corners=[[-1,-1],[-1,1],[1,1],[1,-1]],directions=[[-1,0],[0,1],[1,0],[0,-1]];
  const solid=(x:number,z:number)=>!['~','#'].includes(level.map[z][x]);
  for(let z=0;z<n;z++)for(let x=0;x<n*6;x++){
    if(!solid(x,z))continue;
    const p={x,z},basis=CUBE_BASES[cubeFace(n,p)],center=new THREE.Vector3(...cubeCellPosition(n,p,CELL));
    const boundary=corners.map(([u,v])=>center.clone().addScaledVector(new THREE.Vector3(...basis.u),u*CELL/2).addScaledVector(new THREE.Vector3(...basis.v),v*CELL/2));
    const outer=boundary.map(v=>v.clone().multiplyScalar((half-.05)/half));
    const inner=boundary.map(v=>v.clone().multiplyScalar((half-.25)/half));
    quad(outer[0],outer[1],outer[2],outer[3]);
    quad(inner[3],inner[2],inner[1],inner[0]);
    for(let i=0;i<4;i++){
      const j=(i+1)%4,[dx,dz]=directions[i],next=cubeStep(n,p,dx,dz),exposed=!solid(next.point.x,next.point.z);
      line(outer[i],outer[j],exposed||next.crossed);
      if(exposed){
        quad(outer[i],inner[i],inner[j],outer[j]);
        line(inner[i],inner[j],true);line(outer[i],inner[i],true);line(outer[j],inner[j],true);
        // Short engraving stays within its own exposed side, away from corners.
        for(let k=0;k<6;k++){
          const a=outer[i].clone().lerp(outer[j],.12+k*.13).lerp(inner[i].clone().lerp(inner[j],.12+k*.13),.2);
          const b=outer[i].clone().lerp(outer[j],.18+k*.13).lerp(inner[i].clone().lerp(inner[j],.18+k*.13),.8);
          line(a,b);
        }
      }else if(next.crossed)line(inner[i],inner[j]);
    }
  }
  const geometry=(positions:number[])=>new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const fine:number[]=[],rim:number[]=[];
  for(const s of segments.values())(s.rim?rim:fine).push(...s.a.toArray(),...s.b.toArray());
  return {surface:geometry(triangles),fineEdges:geometry(fine),rimEdges:geometry(rim)};
}
