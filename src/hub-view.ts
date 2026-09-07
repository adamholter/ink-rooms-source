import * as THREE from 'three';
import {CELL,TIER_HEIGHT,ink,floorTile,terraceTile,batchArt,createPad,createCrate} from './art';
import {iceSurface} from './ice-art';
import {createBridgeArt,createSwitchArt,createElevatorArt} from './machinery-art';
import {createRobotArt} from './robot-art';
import {createRotatorArt} from './rotation-art';
import {createLevelMiniature} from './level-miniature';
import {createCubeView,cubeFaceQuaternion,type CubeMotion} from './cube-view';
import {attemptCubeMove,cubeCellPosition,cubeDirection,cubeStep,cubeFace} from './cube-topology';
import {LEVELS,type Level,type State,type Point} from './puzzle';
import {HUB_AREAS,HUB_GATES,HUB_TILES,HUB_SWITCH,HUB_CUBE_ENTRY,hubTile,createHubState,stepHub,type HubState} from './hub-world';

const smooth=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const same=(a:Point,b:Point)=>a.x===b.x&&a.z===b.z;
const tier=(p:Point)=>p.x>=-34&&p.x<=-14&&p.z>=-7&&p.z<=7?(p.z<-4?2:p.z<-1?1:0):0;
const position=(p:Point)=>new THREE.Vector3(p.x*CELL,tier(p)*TIER_HEIGHT,p.z*CELL);
const size=7,returnCell={x:3,z:6};
const cubeMap=Array.from({length:size},(_,z)=>Array.from({length:size*6},(_,x)=>x===3&&z===6?'E':' ').join(''));
const cubeLevel:Level={name:'Cube pavilion',subtitle:'',hint:'',map:cubeMap,cube:{size}};
const initialCube=():State=>({level:0,player:{...returnCell},boxes:[],cubeTurn:0,moves:0,pushes:0,won:false,fall:null});
const cubeGates=[1,2,3,4].map((face,i)=>({point:{x:face*size+3,z:3},level:44+i}));

/** The hub uses its own navigation state, leaving campaign puzzle rules untouched. */
export function createHubView(parent:THREE.Group,player:THREE.Group,completed:number[],initialArea='courtyard',remembered?:HubState) {
  const originalParent=player.parent!,root=new THREE.Group();root.name='level-world';parent.add(root);root.add(player);
  const ground=new THREE.Group();root.add(ground);
  const minis:ReturnType<typeof createLevelMiniature>[]=[];
  const floats:{group:THREE.Group;mini:THREE.Group;base:number;phase:number;cube:boolean}[]=[];
  const labelMaterials:(THREE.SpriteMaterial|THREE.MeshBasicMaterial)[]=[];
  const signGeometry:THREE.BufferGeometry[]=[];
  const labels:THREE.Texture[]=[];
  const chunks=new Map<string,THREE.Group>();
  for(const area of HUB_AREAS){const g=new THREE.Group();ground.add(g);chunks.set(area.id,g);}
  const nearby=(p:Point)=>HUB_AREAS.reduce((a,b)=>Math.hypot(p.x-a.center.x,p.z-a.center.z)<Math.hypot(p.x-b.center.x,p.z-b.center.z)?a:b);
  function label(text:string,width=4) {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.font='500 52px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,48,750);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;labels.push(texture);
    const material=new THREE.SpriteMaterial({map:texture,color:ink.color,depthTest:true,depthWrite:false});labelMaterials.push(material);
    const sprite=new THREE.Sprite(material);sprite.scale.set(width,width/8,1);return sprite;
  }
  const floorsByArea=new Map<string,THREE.Group>();
  for(const [id,chunk] of chunks){const floors=new THREE.Group();floorsByArea.set(id,floors);chunk.add(floors);}
  const templates=new Map<string,THREE.Group>();
  for(const tile of HUB_TILES){
    if(tile.kind==='bridge')continue;
    const neighbors=[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dz])=>({solid:hubTile(tile.x+dx,tile.z+dz)!==null&&hubTile(tile.x+dx,tile.z+dz)!=='bridge',tier:tier({x:tile.x+dx,z:tile.z+dz})}));
    const height=tier(tile),key=tile.kind+height+neighbors.map(n=>`${+n.solid}${n.tier}`).join('');
    if(!templates.has(key))templates.set(key,height?terraceTile(height,neighbors):floorTile(neighbors.map(n=>n.solid),tile.kind==='ice'?iceSurface:undefined));
    const art=templates.get(key)!.clone(true);art.position.copy(position(tile));floorsByArea.get(nearby(tile).id)!.add(art);
  }
  function gate(level:number,container:THREE.Group,p:THREE.Vector3,q?:THREE.Quaternion,isCube=false) {
    const assembly=new THREE.Group();assembly.position.copy(p);if(q)assembly.quaternion.copy(q);container.add(assembly);
    const door=createPad(true);door.setActive(completed.includes(level));assembly.add(door.root);
    const mini=createLevelMiniature(LEVELS[level]);minis.push(mini);
    const floating=new THREE.Group();floating.position.y=3.05;floating.add(mini.root);assembly.add(floating);
    floats.push({group:floating,mini:mini.root,base:3.05,phase:level*.73,cube:isCube});
    const title=label(`${String(level+1).padStart(2,'0')}  ${LEVELS[level].name}`);title.position.y=isCube?4.8:4.25;assembly.add(title);
    // Batch only the static door, keeping miniature animation independent.
    batchArt(door.root);
  }
  for(const entry of HUB_GATES){const area=HUB_AREAS.find(a=>a.id===entry.area)!;
    gate(entry.level,chunks.get(entry.area)!,position(entry.point),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),entry.point.z>area.center.z?Math.PI:0));
  }
  for(const floors of floorsByArea.values())batchArt(floors);
  for(const area of HUB_AREAS){
    const source=label(area.name.toUpperCase(),7);
    const material=new THREE.MeshBasicMaterial({map:source.material.map,color:ink.color,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});labelMaterials.push(material);
    const geometry=new THREE.PlaneGeometry(7,.875);signGeometry.push(geometry);
    const title=new THREE.Mesh(geometry,material);title.rotation.x=-Math.PI/2;title.position.set(area.center.x*CELL,-.04,(area.center.z+2)*CELL);if(area.id==='cube')title.position.z=-17*CELL;
    chunks.get(area.id)!.add(title);
  }
  const bridgeTiles=HUB_TILES.filter(t=>t.kind==='bridge').map(p=>{const art=createBridgeArt(1);art.root.position.copy(position(p));art.root.rotation.y=Math.PI;root.add(art.root);art.setProgress(0);return {art,p};});
  const switchArt=createSwitchArt(1);switchArt.root.position.copy(position(HUB_SWITCH));root.add(switchArt.root);
  const crate=batchArt(createCrate());root.add(crate);
  const lift=createElevatorArt(0,2,1);lift.root.position.set(37*CELL,0,0);root.add(lift.root);
  const robot=createRobotArt();robot.root.position.set(-37*CELL,0,24*CELL);root.add(robot.root);
  const rotor=createRotatorArt(1,1);rotor.root.position.set(0,0,34*CELL);root.add(rotor.root);
  for(const center of [{x:37,z:0},{x:-37,z:24},{x:0,z:34}]){
    const pedestal=new THREE.Group();
    for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){
      const tile=floorTile([z>-1,x<1,z<1,x>-1]);tile.position.set((center.x+x)*CELL,0,(center.z+z)*CELL);pedestal.add(tile);
    }
    batchArt(pedestal);root.add(pedestal);
  }
  // Leave a full corner-sweep clearance between the rotating cube and plaza.
  const cubeContainer=new THREE.Group();cubeContainer.position.set(24*CELL,0,-29*CELL);root.add(cubeContainer);
  const cube=createCubeView(cubeLevel,cubeContainer);cube.exit.setActive(true);
  for(const entry of cubeGates)gate(entry.level,cube.root,new THREE.Vector3(...cubeCellPosition(size,entry.point,CELL)),cubeFaceQuaternion(size,entry.point),true);
  const back=label('ISLANDS',3);back.position.fromArray(cubeCellPosition(size,returnCell,CELL));back.position.y+=2.5;cube.root.add(back);
  const arrival=createPad(true);arrival.setActive(true);arrival.root.position.copy(position(HUB_CUBE_ENTRY));root.add(arrival.root);
  const arrivalLabel=label('CUBE',3);arrivalLabel.position.copy(position(HUB_CUBE_ENTRY));arrivalLabel.position.y=2.5;root.add(arrivalLabel);
  let state=remembered?structuredClone(remembered):createHubState(),cubeState=initialCube(),onCube=false,bridgeTime=state.bridgeOpen?3:0,pending:number|null=null;
  type Motion={time:number;duration:number;from:THREE.Vector3;to:THREE.Vector3;crateFrom:THREE.Vector3;crateTo:THREE.Vector3;gate:number|null;enterCube?:boolean;slide?:boolean;before?:State;after?:State;cubeMotion?:CubeMotion};
  let motion:Motion|null=null;
  function travel(areaId:string){
    const area=HUB_AREAS.find(a=>a.id===areaId)||HUB_AREAS[0];
    onCube=false;root.add(player);player.scale.setScalar(1);player.rotation.set(0,0,0);cube.root.quaternion.identity();
    state={...state,player:{...(areaId==='bridges'&&!state.bridgeOpen?{x:0,z:-3}:area.spawn)}};
    motion=null;pending=null;player.position.copy(position(state.player));crate.position.copy(position(state.crate));
  }
  travel(initialArea);
  function enterCube(){
    const from=player.getWorldPosition(new THREE.Vector3());onCube=true;cubeState=initialCube();cubeContainer.add(player);cubeContainer.worldToLocal(from);
    cube.sync(cubeState,player,[]);const to=player.position.clone();player.position.copy(from);
    motion={time:0,duration:.7,from,to,crateFrom:crate.position.clone(),crateTo:crate.position.clone(),gate:null};
  }
  function step(dx:number,dz:number){
    if(motion||pending!==null)return false;
    if(onCube){
      const local=cubeDirection(dx,dz,cubeState.cubeTurn||0),target=cubeStep(size,cubeState.player,local.x,local.z).point;
      if(same(target,returnCell)){travel('cube');return true;}
      const next=attemptCubeMove(cubeLevel,cubeState,dx,dz);if(!next)return false;
      motion={time:0,duration:cubeFace(size,next.player)!==cubeFace(size,cubeState.player)?.72:.28,from:player.position.clone(),to:player.position.clone(),crateFrom:crate.position.clone(),crateTo:crate.position.clone(),gate:cubeGates.find(g=>same(g.point,next.player))?.level??null,before:cubeState,after:next,cubeMotion:cube.begin(cubeState,[],{x:dx,z:dz})};cubeState=next;return true;
    }
    if(hubTile(state.player.x+dx,state.player.z+dz)==='bridge'&&bridgeTime<2.4)return false;
    const result=stepHub(state,dx,dz);if(!result)return false;
    motion={time:0,duration:result.slide?.52:.28,from:player.position.clone(),to:position(result.state.player),crateFrom:crate.position.clone(),crateTo:position(result.state.crate),gate:result.gate,enterCube:result.enterCube,slide:result.slide};
    player.rotation.set(0,Math.atan2(dx,dz),0);state=result.state;return true;
  }
  const worldPlayer=new THREE.Vector3();
  function update(dt:number,time:number){
    if(state.bridgeOpen)bridgeTime=Math.min(3,bridgeTime+dt);
    switchArt.setActive(state.bridgeOpen);
    for(const b of bridgeTiles){const delay=(-b.p.z-8)*.16;b.art.root.visible=b.p.z===-8||bridgeTime>delay;b.art.setProgress(smooth((bridgeTime-delay)/.85));}
    let moving=!!motion;
    if(motion){const m=motion;m.time+=dt;const t=Math.min(1,m.time/m.duration);
      if(m.cubeMotion)cube.animate(m.before!,m.after!,t,m.cubeMotion,player,[]);
      else {player.position.lerpVectors(m.from,m.to,smooth(t));if(Math.abs(m.to.y-m.from.y)>.1)player.position.y+=Math.sin(Math.PI*t)*.35;crate.position.lerpVectors(m.crateFrom,m.crateTo,smooth(t));}
      if(m.slide&&t>.3)moving=false;
      if(t===1){motion=null;pending=m.gate;if(m.enterCube)enterCube();}
    }
    player.getWorldPosition(worldPlayer);
    for(const f of floats){f.group.position.y=f.base+Math.sin(time*.85+f.phase)*.06;f.mini.rotation.y=time*.12+f.phase;const p=f.group.getWorldPosition(new THREE.Vector3());f.group.visible=p.distanceTo(worldPlayer)<45;}
    for(const material of labelMaterials)material.color.copy(ink.color);
    lift.setProgress((Math.sin(time*.6)+1)/2);rotor.setMotion(time*.18,0);robot.update({time,distance:0,moving:0,pushing:0,blocked:false});cube.update(time);
    const area=onCube?HUB_AREAS.find(a=>a.id==='cube')!:nearby(state.player);
    const nextLevel=pending;pending=null;
    return {moving,enterLevel:nextLevel,area:area.id,target:onCube?cubeContainer.position.clone().add(new THREE.Vector3(0,3,0)):worldPlayer.clone().add(new THREE.Vector3(0,1,0)),cube:onCube};
  }
  return {step,travel,update,busy:()=>!!motion,snapshot:()=>({state:structuredClone(state),cube:onCube,cubeState:structuredClone(cubeState),busy:!!motion,bridgeProgress:bridgeTime,gateCount:HUB_GATES.length+cubeGates.length}),dispose(){originalParent.add(player);player.rotation.set(0,0,0);player.scale.setScalar(1);minis.forEach(m=>m.dispose());labels.forEach(t=>t.dispose());signGeometry.forEach(g=>g.dispose());labelMaterials.forEach(m=>m.dispose());robot.dispose();rotor.dispose();cube.dispose();root.removeFromParent();}};
}
