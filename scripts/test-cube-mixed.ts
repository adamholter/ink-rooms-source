import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attemptCubeMove,cubeCellPosition,cubeDirection,cubeFace,cubeStep,traceCubeMove} from '../src/cube-topology.ts';
import {createCubeView,cubeFaceQuaternion,cubeWorldPoint} from '../src/cube-view.ts';
import {disposeMachineryArt} from '../src/machinery-art.ts';
import {disposeRoomArt,CELL} from '../src/art.ts';
import type {Level,Point,State} from '../src/puzzle.ts';

const size=3;
function fixture(player:Point,boxes:Point[]=[],extra:Partial<Level>={},marks:{p:Point;t:string}[]=[]):{level:Level;state:State}{
 const map=Array.from({length:size},()=>Array(6*size).fill(' '));map[0][0]='E';for(const {p,t}of marks)map[p.z][p.x]=t;
 const level:Level={name:'Mixed cube',subtitle:'',hint:'',map:map.map(r=>r.join('')),cube:{size},...extra};
 return{level,state:{level:0,player:{...player},boxes:boxes.map(b=>({...b})),cubeTurn:0,moves:0,pushes:0,won:false,fall:null}};
}

// Momentum transports its tangent direction and the camera-relative turn at every seam.
{
 const start={x:1,z:1};let p=start,d={x:1,z:0};const ice:Point[]=[];
 for(let i=0;i<8;i++){const s=cubeStep(size,p,d.x,d.z);p=s.point;d=s.direction;if(i<7)ice.push({...p});}
 const {level,state}=fixture(start,[],{ice}),before=structuredClone(state),trace=traceCubeMove(level,state,1,0)!;
 assert.equal(trace.playerPath.length,9);assert.deepEqual(trace.state.player,p);assert.deepEqual(state,before);
 for(let i=1;i<trace.playerPath.length;i++){
  const a=trace.playerPath[i-1],b=trace.playerPath[i],local=cubeDirection(1,0,a.cubeTurn),step=cubeStep(size,a.point,local.x,local.z);
  assert.deepEqual(b.point,step.point);assert.ok(cubeDirection(1,0,b.cubeTurn).x===step.direction.x&&cubeDirection(1,0,b.cubeTurn).z===step.direction.z);
 }
}

// A closed all-ice great circle is a rejected command, not an unbounded simulation.
{
 const {level,state}=fixture({x:1,z:1},[],{ice:Array.from({length:size},(_,z)=>Array.from({length:6*size},(_,x)=>({x,z}))).flat()});
 const before=structuredClone(state);assert.equal(attemptCubeMove(level,state,1,0),null);assert.deepEqual(state,before);
}

// Cargo wraps and glides across seams. Occupancy still blocks a player seam crossing.
{
 const box={x:2,z:1},first=cubeStep(size,box,1,0),second=cubeStep(size,first.point,first.direction.x,first.direction.z);
 const {level,state}=fixture({x:1,z:1},[box],{ice:[first.point]});const moved=attemptCubeMove(level,state,1,0)!;
 assert.deepEqual(moved.boxes,[second.point]);assert.deepEqual(moved.player,box);assert.equal(moved.pushes,1);
 const occupied={...moved,player:box,boxes:[first.point]};assert.equal(attemptCubeMove(level,occupied,1,0),null,'cargo on the seam landing catches the following player crossing');
}

// Bridges use local channels. Any actor can hold a plate, and release drops an occupant.
{
 const plate={x:1,z:1},remotePlate={x:4,z:1},bridge={x:2,z:1},levelExtra={switches:[{...plate,channel:1},{...remotePlate,channel:1}],bridges:[{...bridge,height:0,channel:1}]};
 const heldFixture=fixture(plate,[remotePlate],levelExtra),held=heldFixture.state,level=heldFixture.level;
 const onto=attemptCubeMove(level,held,1,0)!;assert.deepEqual(onto.player,bridge);assert.equal(onto.fall,null,'crate keeps bridge deployed');
 const releaseState={...held,boxes:[bridge]};const released=attemptCubeMove(level,releaseState,-1,0)!;
 assert.deepEqual(released.fall,{kind:'box',index:0});
 const alone=fixture(plate,[],levelExtra),fell=attemptCubeMove(alone.level,alone.state,1,0)!;
 assert.deepEqual(fell.fall,{kind:'player',index:-1},'leaving the only plate retracts the occupied bridge');
}

// Ice can carry a player across a bridge while another actor holds its switch.
{
 const plate={x:4,z:1},bridge={x:2,z:1},start={x:1,z:1};
 const {level,state}=fixture(start,[plate],{switches:[{...plate,channel:2}],bridges:[{...bridge,height:0,channel:2}],ice:[bridge]});
 const moved=attemptCubeMove(level,state,1,0)!;assert.equal(moved.fall,null);assert.notDeepEqual(moved.player,bridge);
}

// View uses separate blue top geometry, detailed face-mounted machinery, and every trace segment.
{
 const start={x:1,z:1};let p=start,d={x:1,z:0};const ice:Point[]=[];for(let i=0;i<6;i++){const s=cubeStep(size,p,d.x,d.z);p=s.point;d=s.direction;if(i<5)ice.push({...p});}
 const bridge={x:7,z:2},plate={x:8,z:2},{level,state}=fixture(start,[plate],{ice,switches:[{...plate,channel:3}],bridges:[{...bridge,height:0,channel:3}]});
 const parent=new THREE.Group(),view=createCubeView(level,parent),player=new THREE.Group(),crate=new THREE.Group();view.sync(state,player,[crate]);
 const after=attemptCubeMove(level,state,1,0)!,motion=view.begin(state,[crate],{x:1,z:0},after);assert.equal(motion.playerPath.length,7);assert.ok(motion.duration>.9);
 assert.deepEqual(view.machinerySnapshot(state),{switches:[{channel:3,active:true}],bridges:[{channel:3,active:true}]});
 for(let i=0;i<=24;i++){
  view.animate(state,after,i/24,motion,player,[crate]);const inverse=view.root.quaternion.clone().invert(),local=player.position.clone().applyQuaternion(inverse);assert.ok(Math.max(...local.toArray().map(Math.abs))>=size*CELL/2-.03,'multi-edge glide remains on cube shell');
  assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(player.quaternion).distanceTo(new THREE.Vector3(0,1,0))<1e-6,'player stays upright through every seam');
  const crateLocal=crate.position.clone().applyQuaternion(inverse);for(const x of[-.51,.51])for(const y of[.05,1.07])for(const z of[-.51,.51]){const corner=new THREE.Vector3(x,y,z).applyQuaternion(crate.quaternion).add(crate.position).applyQuaternion(inverse);assert.ok(Math.max(...corner.toArray().map(Math.abs))>=size*CELL/2-.03,`crate remains outside shell at ${crateLocal.toArray()}`);}
 }
 assert.ok(player.position.distanceTo(cubeWorldPoint(level,after.player,after))<1e-6);assert.notEqual(cubeFace(size,start),cubeFace(size,after.player));
 const expectedCrate=view.root.quaternion.clone().multiply(cubeFaceQuaternion(size,after.boxes[0]));assert.ok(crate.quaternion.angleTo(expectedCrate)<1e-6,'crate reaches its final transported orientation');
 const shellMeshes=view.root.children.filter(o=>o instanceof THREE.Mesh);assert.ok(shellMeshes.length>=2,'paper and ice surfaces are separate meshes');
 const iceGeometry=(shellMeshes[1]as THREE.Mesh).geometry as THREE.BufferGeometry;assert.ok((iceGeometry.getAttribute('position')?.count??0)>0);
 view.dispose();disposeMachineryArt();disposeRoomArt();
}

// A pushed crate keeps its rigid transported orientation through several seams.
{
 const box={x:2,z:1},playerStart={x:1,z:1};let p=box,d={x:1,z:0};const ice:Point[]=[];
 for(let i=0;i<7;i++){const s=cubeStep(size,p,d.x,d.z);p=s.point;d=s.direction;if(i<6)ice.push({...p});}
 const {level,state}=fixture(playerStart,[box],{ice}),after=attemptCubeMove(level,state,1,0)!;
 const parent=new THREE.Group(),view=createCubeView(level,parent),actor=new THREE.Group(),crate=new THREE.Group();view.sync(state,actor,[crate]);const motion=view.begin(state,[crate],{x:1,z:0},after);
 assert.ok(motion.boxPaths[0].length>=7);
 for(let i=0;i<=32;i++){view.animate(state,after,i/32,motion,actor,[crate]);const inverse=view.root.quaternion.clone().invert();for(const x of[-.51,.51])for(const y of[.05,1.07])for(const z of[-.51,.51]){const corner=new THREE.Vector3(x,y,z).applyQuaternion(crate.quaternion).add(crate.position).applyQuaternion(inverse);assert.ok(Math.max(...corner.toArray().map(Math.abs))>=size*CELL/2-1e-6,'multi-seam crate never clips through the cube');}}
 assert.ok(crate.position.distanceTo(cubeWorldPoint(level,after.boxes[0],after))<1e-6);view.dispose();disposeMachineryArt();disposeRoomArt();
}

console.log('Cube mixed mechanics passed: transported ice, loop rejection, cargo seams, local switch bridges, release falls, traced animation, blue shell faces, and face-mounted machinery.');
