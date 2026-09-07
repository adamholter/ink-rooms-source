import * as THREE from 'three';
import { CUBE_BASES, cubeFace, cubeCellPosition, cubeDirection } from './cube-topology.ts';
import { CELL, paper, fine, floorTile, obstacle, createPad, batchArt, type PadArt } from './art.ts';
import type { Level, Point, State } from './puzzle.ts';
const vector=(v:readonly number[])=>new THREE.Vector3(v[0],v[1],v[2]);
const up=new THREE.Vector3(0,1,0);
const ease=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function cubeFaceQuaternion(size:number,p:Point) {
  const b=CUBE_BASES[cubeFace(size,p)];
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(vector(b.u),vector(b.normal),vector(b.v)));
}
export function cubeOrientation(level:Level,state:State) {
  const b=CUBE_BASES[cubeFace(level.cube!.size,state.player)];
  const right=cubeDirection(1,0,state.cubeTurn??0), down=cubeDirection(0,1,state.cubeTurn??0);
  const tangent=(p:Point)=>vector(b.u).multiplyScalar(p.x).addScaledVector(vector(b.v),p.z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent(right),vector(b.normal),tangent(down))).invert();
}
export function cubeWorldPoint(level:Level,p:Point,state:State) {
  return vector(cubeCellPosition(level.cube!.size,p,CELL)).applyQuaternion(cubeOrientation(level,state));
}
export type CubeMotion={direction:Point;crateOrientations:THREE.Quaternion[]};
export function createCubeView(level:Level,parent:THREE.Group) {
  const size=level.cube!.size,half=size*CELL/2,root=new THREE.Group();parent.add(root);
  const geometry:THREE.BufferGeometry[]=[];
  const own=<T extends THREE.BufferGeometry>(g:T)=>{geometry.push(g);return g;};
  // Recess the core behind the tiled shell, avoiding coplanar overlapping faces.
  root.add(new THREE.Mesh(own(new THREE.BoxGeometry(half*2-.14,half*2-.14,half*2-.14)),paper));
  const staticArt=new THREE.Group();root.add(staticArt);
  const pads:(PadArt&{point:Point})[]=[];let exit:PadArt|undefined;
  const place=(object:THREE.Object3D,p:Point)=>{
    object.position.fromArray(cubeCellPosition(size,p,CELL));object.quaternion.copy(cubeFaceQuaternion(size,p));
  };
  for(let z=0;z<size;z++)for(let x=0;x<size*6;x++){
    const p={x,z},tile=level.map[z][x],cell=new THREE.Group();place(cell,p);staticArt.add(cell);
    cell.add(floorTile([true,true,true,true]));
    if(tile==='#')cell.add(obstacle());
    if(tile==='.'||tile==='E'){
      const art=createPad(tile==='E');place(art.root,p);root.add(art.root);
      if(tile==='.')pads.push({...art,point:p});else exit=art;
    }
    // Engraved chevrons identify traversable seams, without a rail across them.
    if(tile!=='#')for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      if((dx===1&&x%size!==size-1)||(dx===-1&&x%size!==0)||(dz===1&&z!==size-1)||(dz===-1&&z!==0))continue;
      const marks=new THREE.Group();marks.rotation.y=Math.atan2(dx,dz);cell.add(marks);
      const coords:number[]=[];
      for(const offset of [.48,.60])coords.push(-.075,-.044,offset-.05,0,-.044,offset,0,-.044,offset,.075,-.044,offset-.05);
      const g=own(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));marks.add(new THREE.LineSegments(g,fine));
    }
  }
  // Thin corner joints make the six connected faces read as a single object.
  const outline=new THREE.LineSegments(own(new THREE.EdgesGeometry(own(new THREE.BoxGeometry(half*2-.095,half*2-.095,half*2-.095)))),fine);
  root.add(outline);
  batchArt(staticArt);
  if(!exit)throw Error('Cube room needs an exit');
  function sync(state:State,player:THREE.Group,crates:THREE.Group[],heading:Point={x:0,z:-1}) {
    root.quaternion.copy(cubeOrientation(level,state));
    player.position.copy(cubeWorldPoint(level,state.player,state));player.quaternion.setFromAxisAngle(up,Math.atan2(heading.x,heading.z));
    crates.forEach((crate,i)=>{crate.position.copy(cubeWorldPoint(level,state.boxes[i],state));crate.quaternion.copy(root.quaternion).multiply(cubeFaceQuaternion(size,state.boxes[i]));});
  }
  function begin(before:State,crates:THREE.Group[],direction:Point):CubeMotion {
    const inverse=cubeOrientation(level,before).invert();
    return {direction,crateOrientations:crates.map(c=>inverse.clone().multiply(c.quaternion))};
  }
  function animate(before:State,after:State,t:number,m:CubeMotion,player:THREE.Group,crates:THREE.Group[]) {
    t=THREE.MathUtils.clamp(t,0,1);
    const crossing=cubeFace(size,before.player)!==cubeFace(size,after.player);
    const arc=ease((t-.25)/.5);
    root.quaternion.copy(cubeOrientation(level,before)).slerp(cubeOrientation(level,after),crossing?arc:1);
    function surfacePath(a:Point,b:Point,clearance:number) {
      const start=vector(cubeCellPosition(size,a,CELL)),end=vector(cubeCellPosition(size,b,CELL));
      const na=vector(CUBE_BASES[cubeFace(size,a)].normal),nb=vector(CUBE_BASES[cubeFace(size,b)].normal);
      if(na.equals(nb))return {position:start.lerp(end,ease(t)),transport:new THREE.Quaternion()};
      const corner=start.clone().addScaledVector(nb,CELL/2);
      const transport=new THREE.Quaternion().setFromUnitVectors(na,nb),turn=new THREE.Quaternion().slerp(transport,arc);
      let position:THREE.Vector3;
      if(t<.25)position=start.lerp(corner.clone().addScaledVector(na,clearance),ease(t/.25));
      else if(t>.75)position=corner.clone().addScaledVector(nb,clearance).lerp(end,ease((t-.75)/.25));
      else position=corner.clone().add(na.clone().applyQuaternion(turn).multiplyScalar(clearance));
      return {position,transport:turn};
    }
    const local=cubeDirection(m.direction.x,m.direction.z,before.cubeTurn??0);
    const path=surfacePath(before.player,after.player,.015);
    const heading=cubeFaceQuaternion(size,before.player).multiply(new THREE.Quaternion().setFromAxisAngle(up,Math.atan2(local.x,local.z)));
    player.position.copy(path.position).applyQuaternion(root.quaternion);
    player.quaternion.copy(root.quaternion).multiply(path.transport).multiply(heading);
    crates.forEach((crate,i)=>{
      const a=before.boxes[i],b=after.boxes[i],path=surfacePath(a,b,.025);
      crate.position.copy(path.position).applyQuaternion(root.quaternion);
      crate.quaternion.copy(root.quaternion).multiply(path.transport).multiply(m.crateOrientations[i]);
    });
  }
  return {root,pads,exit,sync,begin,animate,dispose(){geometry.forEach(g=>g.dispose());root.removeFromParent();}};
}
