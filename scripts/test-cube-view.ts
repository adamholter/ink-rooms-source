import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCubeView,cubeWorldPoint,cubeOrientation,cubeFaceQuaternion} from '../src/cube-view.ts';
import {cubeStep,cubeDirection,cubeFace,attemptCubeMove} from '../src/cube-topology.ts';
import {CELL,disposeRoomArt} from '../src/art.ts';
import type {Level,State} from '../src/puzzle.ts';
const size=4,half=size*CELL/2,level:Level={name:'Render proof',subtitle:'',hint:'',cube:{size},map:['E'+' '.repeat(23),...' '.repeat(3).split('').map(()=> ' '.repeat(24))]};
const group=new THREE.Group(),view=createCubeView(level,group),player=new THREE.Group(),crate=new THREE.Group();
const near=(a:THREE.Vector3,b:THREE.Vector3)=>assert.ok(a.distanceTo(b)<1e-6,`${a.toArray()} != ${b.toArray()}`);
let rolls=0,pushes=0;
for(let face=0;face<6;face++)for(const local of [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}])for(let turn=0;turn<4;turn++){
 const edge={x:face*size+(local.x===1?3:local.x===-1?0:1),z:local.z===1?3:local.z===-1?0:1};
 const input=cubeDirection(local.x,local.z,-turn);
 for(const pushing of [false,true]){
  const before:State={level:0,player:pushing?{x:edge.x-local.x,z:edge.z-local.z}:edge,boxes:pushing?[edge]:[],cubeTurn:turn,moves:0,pushes:0,won:false,fall:null};
  const after=attemptCubeMove(level,before,input.x,input.z);if(!after)continue;
  const crates=pushing?[crate]:[];view.sync(before,player,crates);const movement=view.begin(before,crates,input);
  if(!pushing)assert.ok(Math.abs(cubeOrientation(level,before).angleTo(cubeOrientation(level,after))-Math.PI/2)<1e-6,'seam produces exactly a quarter roll');
  for(const t of [0,.125,.25,.375,.5,.625,.75,.875,1]){
   view.animate(before,after,t,movement,player,crates);
   near(new THREE.Vector3(0,1,0).applyQuaternion(player.quaternion),new THREE.Vector3(0,1,0));
   const inverse=view.root.quaternion.clone().invert();
   const p=player.position.clone().applyQuaternion(inverse);assert.ok(Math.max(...p.toArray().map(Math.abs))>=half-1e-6,'feet never pass inside cube');
   if(pushing)for(const x of [-.51,.51])for(const y of [.05,1.07])for(const z of [-.51,.51]){
    const corner=new THREE.Vector3(x,y,z).applyQuaternion(crate.quaternion).add(crate.position).applyQuaternion(inverse);
    assert.ok(Math.max(...corner.toArray().map(Math.abs))>=half-1e-6,'crate solid never passes inside cube');
   }
  }
  near(player.position,cubeWorldPoint(level,after.player,after));
  if(pushing){near(crate.position,cubeWorldPoint(level,after.boxes[0],after));pushes++;}else rolls++;
 }
}
view.dispose();disposeRoomArt();assert.equal(rolls,96);assert.equal(pushes,96);
console.log(`Cube rendering: ${rolls} oriented edge rolls and ${pushes} cargo wraps; upright character, exact endpoints, no interior clipping across nine animation samples.`);

// A missing tile must be empty geometry, not a floor painted to resemble a hole.
const {LEVELS,createState}=await import('../src/puzzle.ts');
const {CUBE_BASES,cubeCellPosition}=await import('../src/cube-topology.ts');
let holes=0;
for(let index=44;index<LEVELS.length;index++){
 const l=LEVELS[index],shell=new THREE.Group(),v=createCubeView(l,shell),n=l.cube!.size;
 shell.updateMatrixWorld(true);
 for(let z=0;z<n;z++)for(let x=0;x<n*6;x++){
  const p={x,z},normal=new THREE.Vector3(...CUBE_BASES[cubeFace(n,p)].normal),position=new THREE.Vector3(...cubeCellPosition(n,p,CELL));
  const ray=new THREE.Raycaster(position.clone().addScaledVector(normal,.3),normal.clone().negate());
  const hit=ray.intersectObject(v.root,true).find(h=>h.object instanceof THREE.Mesh);
  if(l.map[z][x]==='~'){holes++;assert.ok(!hit||hit.distance>.65,'no shell geometry across a hole');}
  else assert.ok(hit&&hit.distance<.4,'safe cells retain solid floor');
 }
 // Falling works inward from any cube face, for both upright and side-facing cargo.
 const state=createState(index),actor=new THREE.Group(),cargo=state.boxes.map(()=>new THREE.Group());
 for(let face=0;face<6;face++){
  const p={x:face*n+1,z:1};actor.position.fromArray(cubeCellPosition(n,p,CELL));
  actor.quaternion.copy(cubeFaceQuaternion(n,p));actor.scale.setScalar(1);
  const start=actor.position.clone();v.beginFall(actor);v.animateFall(actor,0);near(actor.position,start);
  v.animateFall(actor,.25);assert.ok(actor.position.length()<start.length());assert.ok(actor.scale.x>0&&actor.scale.x<1);
  v.animateFall(actor,.75);assert.ok(actor.position.length()<start.length());assert.ok(actor.scale.x<.78);
  v.animateFall(actor,1);near(actor.position,new THREE.Vector3());assert.equal(actor.scale.x,0);
  v.sync(state,actor,cargo);near(actor.scale,new THREE.Vector3(1,1,1));
  cargo.forEach(c=>near(c.scale,new THREE.Vector3(1,1,1)));
 }
 v.dispose();assert.equal(shell.children.length,0,'black hole is disposed with the room');disposeRoomArt();
}
assert.ok(holes>100);console.log(`Cube holes: ${holes} empty apertures raycast, safe floors, inward falls on all faces, actor restoration, room cleanup passed.`);
