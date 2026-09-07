import * as THREE from 'three';
import { CUBE_BASES, cubeFace, cubeCellPosition, cubeDirection, cubeChannelActive, cubeStep, traceCubeMove, type CubePathNode } from './cube-topology.ts';
import { CELL, paper, edge, fine, createPad, batchArt, type PadArt } from './art.ts';
import {buildCubeShellGeometry} from './cube-shell.ts';
import {iceSurface} from './ice-art.ts';
import {createSwitchArt,createBridgeArt} from './machinery-art.ts';
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
export type CubeMotion={direction:Point;crateOrientations:THREE.Quaternion[];playerPath:CubePathNode[];boxPaths:CubePathNode[][];duration:number};
export function createCubeView(level:Level,parent:THREE.Group) {
  const size=level.cube!.size,half=size*CELL/2,root=new THREE.Group();parent.add(root);
  const geometry:THREE.BufferGeometry[]=[];
  const own=<T extends THREE.BufferGeometry>(g:T)=>{geometry.push(g);return g;};
  // The shell is open: holes reveal the other faces and a small central singularity.
  const singularity=new THREE.Group();parent.add(singularity);singularity.name='black-hole';
  const black=new THREE.MeshBasicMaterial({color:0x030305});
  const light=new THREE.MeshBasicMaterial({color:0xeaeaf0});
  const orbitInk=new THREE.LineBasicMaterial({color:0x6d6d7a,transparent:true,opacity:.7});
  const materials=[black,light,orbitInk];
  const core=new THREE.Mesh(own(new THREE.SphereGeometry(.88,40,24)),black);singularity.add(core);
  const disk=new THREE.Group();disk.rotation.set(.35,0,.28);singularity.add(disk);
  // A bright inner rim reads against the black theme; the ink edge reads on white.
  for(const [radius,tube,material] of [[1.025,.028,light],[1.066,.011,black],[.984,.011,black],[1.34,.014,black]] as const){
    const ring=new THREE.Mesh(own(new THREE.TorusGeometry(radius,tube,8,96)),material);
    ring.rotation.x=Math.PI/2;disk.add(ring);
  }
  for(let arm=0;arm<5;arm++){
    const points:THREE.Vector3[]=[];
    for(let i=0;i<=64;i++){
      const u=i/64,a=arm*Math.PI*2/5+u*2.7,r=1.02+.48*u;
      points.push(new THREE.Vector3(Math.cos(a)*r,.018*Math.sin(a*2),Math.sin(a)*r));
    }
    disk.add(new THREE.Line(own(new THREE.BufferGeometry().setFromPoints(points)),orbitInk));
  }
  const sparks=new THREE.Group();disk.add(sparks);
  for(let i=0;i<10;i++){
    const a=i*Math.PI*2/10,r=1.13+(i%3)*.1;
    const spark=new THREE.Mesh(own(new THREE.SphereGeometry(i%2?.018:.025,6,4)),light);
    spark.position.set(Math.cos(a)*r,.035,Math.sin(a)*r);sparks.add(spark);
  }
  let fallPose:{position:THREE.Vector3;quaternion:THREE.Quaternion;scale:THREE.Vector3;normal:THREE.Vector3}|null=null;
  const shell=buildCubeShellGeometry(level);
  // Keep strokes depth-tested. Offset only their supporting fill, avoiding
  // coplanar line/fill competition without showing hidden edges through floors.
  const shellPaper=paper.clone();shellPaper.polygonOffset=true;shellPaper.polygonOffsetFactor=1;shellPaper.polygonOffsetUnits=1;materials.push(shellPaper);
  root.add(new THREE.Mesh(own(shell.surface),shellPaper));
  const shellIce=iceSurface.clone();shellIce.polygonOffset=true;shellIce.polygonOffsetFactor=1;shellIce.polygonOffsetUnits=1;materials.push(shellIce);
  root.add(new THREE.Mesh(own(shell.iceSurface),shellIce));
  root.add(new THREE.LineSegments(own(shell.fineEdges),fine));
  root.add(new THREE.LineSegments(own(shell.rimEdges),edge));
  const staticArt=new THREE.Group();root.add(staticArt);
  const pads:(PadArt&{point:Point})[]=[];let exit:PadArt|undefined;
  const switches:{channel:number;art:ReturnType<typeof createSwitchArt>}[]=[],bridges:{channel:number;art:ReturnType<typeof createBridgeArt>}[]=[];
  const place=(object:THREE.Object3D,p:Point)=>{
    object.position.fromArray(cubeCellPosition(size,p,CELL));object.quaternion.copy(cubeFaceQuaternion(size,p));
  };
  for(let z=0;z<size;z++)for(let x=0;x<size*6;x++){
    const p={x,z},tile=level.map[z][x];if(tile==='~'||tile==='#')continue;
    const cell=new THREE.Group();place(cell,p);staticArt.add(cell);

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

  for(const s of level.switches||[]){const art=createSwitchArt(s.channel);place(art.root,s);root.add(art.root);switches.push({channel:s.channel,art});}
  for(const b of level.bridges||[]){
    const art=createBridgeArt(b.channel);place(art.root,b);
    const open=(dx:number,dz:number)=>{const q=cubeStep(size,b,dx,dz).point;return !['~','#'].includes(level.map[q.z]?.[q.x]??'#');};
    if(Number(open(-1,0))+Number(open(1,0))>Number(open(0,-1))+Number(open(0,1)))art.root.rotateY(Math.PI/2);
    root.add(art.root);bridges.push({channel:b.channel,art});
  }

  batchArt(staticArt);
  if(!exit)throw Error('Cube room needs an exit');
  function syncMechanisms(before:State,progress=1,after:State=before){const t=ease(progress);for(const s of switches)s.art.setActive(cubeChannelActive(level,s.channel,progress>0?after:before));for(const b of bridges){const a=Number(cubeChannelActive(level,b.channel,before)),z=Number(cubeChannelActive(level,b.channel,after));b.art.setProgress(a+(z-a)*t);}}
  function sync(state:State,player:THREE.Group,crates:THREE.Group[],heading:Point={x:0,z:-1}) {
    fallPose=null;player.scale.setScalar(1);crates.forEach(c=>c.scale.setScalar(1));
    root.quaternion.copy(cubeOrientation(level,state));
    player.position.copy(cubeWorldPoint(level,state.player,state));player.quaternion.setFromAxisAngle(up,Math.atan2(heading.x,heading.z));
    crates.forEach((crate,i)=>{crate.position.copy(cubeWorldPoint(level,state.boxes[i],state));crate.quaternion.copy(root.quaternion).multiply(cubeFaceQuaternion(size,state.boxes[i]));});
    syncMechanisms(state);
  }
  function begin(before:State,crates:THREE.Group[],direction:Point,after?:State):CubeMotion {
    const inverse=cubeOrientation(level,before).invert();
    const trace=traceCubeMove(level,before,direction.x,direction.z);
    if(!trace||after&&(trace.state.player.x!==after.player.x||trace.state.player.z!==after.player.z))throw Error('Cube animation does not match move');
    const steps=Math.max(trace.playerPath.length-1,...trace.boxPaths.map(p=>p.length-1));
    const crossings=[trace.playerPath,...trace.boxPaths].flatMap(path=>path.slice(1).map((n,i)=>cubeFace(size,path[i].point)!==cubeFace(size,n.point))).filter(Boolean).length;
    return {direction,crateOrientations:crates.map(c=>inverse.clone().multiply(c.quaternion)),playerPath:trace.playerPath,boxPaths:trace.boxPaths,duration:Math.max(.26,.2*steps+.32*crossings)};
  }
  function animate(before:State,after:State,t:number,m:CubeMotion,player:THREE.Group,crates:THREE.Group[]) {
    t=THREE.MathUtils.clamp(t,0,1);
    function surfacePath(a:Point,b:Point,clearance:number,progress:number) {
      const arc=ease((progress-.25)/.5);
      const start=vector(cubeCellPosition(size,a,CELL)),end=vector(cubeCellPosition(size,b,CELL));
      const na=vector(CUBE_BASES[cubeFace(size,a)].normal),nb=vector(CUBE_BASES[cubeFace(size,b)].normal);
      if(na.equals(nb))return {position:start.lerp(end,ease(progress)),transport:new THREE.Quaternion()};
      const corner=start.clone().addScaledVector(nb,CELL/2);
      const transport=new THREE.Quaternion().setFromUnitVectors(na,nb),turn=new THREE.Quaternion().slerp(transport,arc);
      let position:THREE.Vector3;
      if(progress<.25)position=start.lerp(corner.clone().addScaledVector(na,clearance),ease(progress/.25));
      else if(progress>.75)position=corner.clone().addScaledVector(nb,clearance).lerp(end,ease((progress-.75)/.25));
      else position=corner.clone().add(na.clone().applyQuaternion(turn).multiplyScalar(clearance));
      return {position,transport:turn};
    }
    const segment=(nodes:CubePathNode[])=>{const count=Math.max(1,nodes.length-1),scaled=t*count,index=Math.min(count-1,Math.floor(scaled));return{a:nodes[index],b:nodes[Math.min(index+1,nodes.length-1)],t:index===count-1&&t===1?1:scaled-index};};
    const ps=segment(m.playerPath),crossing=cubeFace(size,ps.a.point)!==cubeFace(size,ps.b.point),arc=ease((ps.t-.25)/.5);
    const aState={...before,player:ps.a.point,cubeTurn:ps.a.cubeTurn},bState={...before,player:ps.b.point,cubeTurn:ps.b.cubeTurn};
    root.quaternion.copy(cubeOrientation(level,aState)).slerp(cubeOrientation(level,bState),crossing?arc:ps.t);
    const local=cubeDirection(m.direction.x,m.direction.z,ps.a.cubeTurn);
    const path=surfacePath(ps.a.point,ps.b.point,.015,ps.t);
    const heading=cubeFaceQuaternion(size,ps.a.point).multiply(new THREE.Quaternion().setFromAxisAngle(up,Math.atan2(local.x,local.z)));
    player.position.copy(path.position).applyQuaternion(root.quaternion);
    player.quaternion.copy(root.quaternion).multiply(path.transport).multiply(heading);
    crates.forEach((crate,i)=>{
      const nodes=m.boxPaths[i],cs=segment(nodes),path=surfacePath(cs.a.point,cs.b.point,.025,cs.t);
      crate.position.copy(path.position).applyQuaternion(root.quaternion);
      const segmentIndex=Math.min(nodes.length-2,Math.floor(t*Math.max(1,nodes.length-1))),orientation=cubeFaceQuaternion(size,nodes[0].point);
      for(let j=0;j<Math.max(0,segmentIndex);j++)if(cubeFace(size,nodes[j].point)!==cubeFace(size,nodes[j+1].point)){
        const na=vector(CUBE_BASES[cubeFace(size,nodes[j].point)].normal),nb=vector(CUBE_BASES[cubeFace(size,nodes[j+1].point)].normal);
        orientation.premultiply(new THREE.Quaternion().setFromUnitVectors(na,nb));
      }
      if(cubeFace(size,cs.a.point)!==cubeFace(size,cs.b.point)){
        const na=vector(CUBE_BASES[cubeFace(size,cs.a.point)].normal),nb=vector(CUBE_BASES[cubeFace(size,cs.b.point)].normal),transport=new THREE.Quaternion().setFromUnitVectors(na,nb);
        orientation.premultiply(new THREE.Quaternion().slerp(transport,ease((cs.t-.25)/.5)));
      }
      crate.quaternion.copy(root.quaternion).multiply(orientation);
    });
    syncMechanisms(before,t,after);
  }
  function beginFall(object:THREE.Group) {
    fallPose={position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone(),normal:up.clone().applyQuaternion(object.quaternion)};
  }
  function animateFall(object:THREE.Group,progress:number) {
    if(!fallPose)return;
    const t=THREE.MathUtils.clamp(progress,0,1),pose=fallPose;
    // Descend straight through the aperture before curving, so limbs clear its rim.
    const entry=pose.position.clone().addScaledVector(pose.normal,-Math.min(2.3,half*.74));
    if(t<.45){
      object.position.copy(pose.position).lerp(entry,(t/.45)**1.5);
      object.scale.copy(pose.scale).multiplyScalar(1-.22*ease(t/.45));
      object.quaternion.copy(pose.quaternion);
    }else{
      const u=(t-.45)/.55,radial=entry.clone().normalize();
      const tangent=new THREE.Vector3().crossVectors(radial,pose.normal);
      if(tangent.lengthSq()<.01)tangent.crossVectors(radial,new THREE.Vector3(1,0,0));
      tangent.normalize();
      object.position.copy(entry).multiplyScalar(1-ease(u)).addScaledVector(tangent,Math.sin(u*Math.PI)*.28);
      object.quaternion.copy(pose.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(.3,.6,1).normalize(),u*Math.PI*1.4));
      object.scale.copy(pose.scale).multiplyScalar(.78*(1-ease(u)));
    }
  }
  function update(time:number,fallProgress=0) {
    shellPaper.color.copy(paper.color);shellIce.color.copy(iceSurface.color);
    disk.rotation.y=time*.22;sparks.rotation.y=-time*.75;
    singularity.scale.setScalar(1+.045*Math.sin(Math.PI*THREE.MathUtils.clamp(fallProgress,0,1)));
  }
  return {root,pads,exit,sync,syncMechanisms,begin,animate,beginFall,animateFall,update,machinerySnapshot:(state:State)=>({switches:switches.map(s=>({channel:s.channel,active:cubeChannelActive(level,s.channel,state)})),bridges:bridges.map(b=>({channel:b.channel,active:cubeChannelActive(level,b.channel,state)}))}),dispose(){geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());singularity.removeFromParent();root.removeFromParent();}};
}
