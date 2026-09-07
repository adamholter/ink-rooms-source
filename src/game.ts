import './style.css';
import {createHubView} from './hub-view';
import {HUB_AREAS,type HubState} from './hub-world';
import {createCubeView,cubeWorldPoint,type CubeMotion} from './cube-view';
import {cubeFace} from './cube-topology';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRestAnimation, type RestAnimation } from './rest';
import { GameSound } from './sound';
import { createRobotArt } from './robot-art';
import { createRotatorArt } from './rotation-art';
import { iceSurface, setIceTheme } from './ice-art';
import { createSwitchArt, createElevatorArt, createBridgeArt, disposeMachineryArt } from './machinery-art';
import { LEVELS, createState, attemptMove, solved, tileAt, heightAt, channelActive, isIce, rotorIndex, rotationPoint, type State, type Point, type Move } from './puzzle';
import { CELL, TIER_HEIGHT, terraceTile, batchArt, createCrate, createPad, floorTile, obstacle, setArtTheme, disposeRoomArt, type PadArt } from './art';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; $('game').append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 180);
const room = new THREE.Group(), player = new THREE.Group(); scene.add(room, player);
let dark = false, ready = false, state: State = createState(0), history: State[] = [];
let crates: THREE.Group[] = [], pads: (PadArt & { point: Point; authoredPoint?:Point })[] = [], exit: PadArt;
let hub:ReturnType<typeof createHubView>|null=null;
let hubFrame:ReturnType<ReturnType<typeof createHubView>['update']>|null=null;
let rememberedHub:HubState|undefined;
let suspended:{state:State;history:State[];facing:Point}|null=null;
let cubeView:ReturnType<typeof createCubeView>|null=null;
let rotatorArt: {content:THREE.Group;art:ReturnType<typeof createRotatorArt>;center:THREE.Vector3}[]=[];
type ComplexPhase={kind:'move'|'machines'|'rotate';before:State;after:State;duration:number};
let robotArt: ReturnType<typeof createRobotArt>[] = [];
let robotPushWeights: number[] = [];
let robotMileage: number[] = [], robotLast: THREE.Vector3[] = [];
let switchArt: {channel:number;art:ReturnType<typeof createSwitchArt>}[] = [];
let machineArt: {channel:number;art:ReturnType<typeof createElevatorArt> | ReturnType<typeof createBridgeArt>}[] = [];
let mixer: THREE.AnimationMixer, run: THREE.AnimationAction, idle: THREE.AnimationAction, moving = false;
let rest: RestAnimation | undefined, simulationTime = 0;
let filming=false, frameHandle=0;
let filmCamera: {target:number[];yaw:number;pitch:number;distance:number} | null=null;
const sound = new GameSound();
function soundButton() { $('sound').setAttribute('aria-pressed',String(!sound.muted)); $('sound').setAttribute('aria-label',sound.muted?'Turn sound on':'Mute sound'); }
soundButton();
$('sound').onclick=()=>{sound.unlock();sound.toggle();soundButton();};
window.addEventListener('pointerdown',()=>sound.unlock(),{passive:true});
window.addEventListener('keydown',()=>sound.unlock());
document.addEventListener('visibilitychange',()=>sound.visibilityChanged());
let motion: { from: THREE.Vector3; to: THREE.Vector3; boxes: THREE.Vector3[]; time: number; duration: number; moveDuration:number; before:State; mechanisms:boolean; boxTos:THREE.Vector3[]; jump: boolean; drop: boolean; cubeMotion?:CubeMotion; complex?:{phases:ComplexPhase[];heading:number;boxAngles:number[]}; iceMotion?:{playerDuration:number;boxDurations:number[];playerGlide:boolean}; robotTurn?: {middle:State; together:boolean; firstMachine:number; robotDuration:number; secondMachine:number} } | null = null;
let fallingTime = 0, falls = 0, fallStartY = 0;
let facing: Point = {x:0,z:-1};
const jumpBones: {bone:THREE.Object3D; base:THREE.Quaternion; angle:number}[] = [];
let yaw = .12, pitch = .82, zoom = 1, overview = false, drag = false, lastX = 0, lastY = 0, repeatAt = 0, toastTimer = 0, hintId = 0;
function resetCameraAngle() {
  // See the lower landing pockets beside the new upper decks.
  const originalTerrace = state.level >= 14 && state.level <= 16;
  yaw = LEVELS[state.level].cube ? .52 : originalTerrace ? -1 : .12;
  pitch = LEVELS[state.level].cube ? .64 : state.level >= 27 ? .9 : state.level >= 24 ? 1.18 : originalTerrace ? 1.1 : .82;
}
let hintWorker: Worker | null = null;
const pressed = new Set<string>(); let touchDir: Point | null = null;
let levelCompleted: number[] = [];
try {
  levelCompleted = JSON.parse(localStorage.getItem('ink-rooms-v2-completed') || '[]'); dark = localStorage.getItem('ink-rooms-theme') === 'black';
  if(localStorage.getItem('ink-rooms-robot-chapter')!=='mirror-v1'){
    levelCompleted=levelCompleted.filter(i=>i<27);
    localStorage.setItem('ink-rooms-v2-completed',JSON.stringify(levelCompleted));
    localStorage.setItem('ink-rooms-robot-chapter','mirror-v1');
  }
} catch {}
const levelSelect = $<HTMLSelectElement>('levels');
LEVELS.forEach((l, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = `${String(i + 1).padStart(2, '0')} · ${l.name}`; levelSelect.append(o); });
function worldTier(p:Point, pose:State=state) {
  const level=LEVELS[pose.level];
  if(!level.jumping||tileAt(level,p.x,p.z)!=='#')return heightAt(level,p,pose);
  return Math.max(heightAt(level,p),...[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dz])=>heightAt(level,{x:p.x+dx,z:p.z+dz})));
}
function point(p: Point, pose:State=state) { if(LEVELS[pose.level].cube)return cubeWorldPoint(LEVELS[pose.level],p,pose); const map = LEVELS[pose.level].map; return new THREE.Vector3((p.x - (Math.max(...map.map(r => r.length)) - 1) / 2) * CELL, worldTier(p,pose)*TIER_HEIGHT, (p.z - (map.length - 1) / 2) * CELL); }
function syncMachinery(before:State=state, progress=1, after:State=state) {
  const level=LEVELS[state.level], smooth=progress*progress*(3-2*progress);
  for(const m of machineArt){const a=Number(channelActive(level,m.channel,before)),b=Number(channelActive(level,m.channel,after));m.art.setProgress(a+(b-a)*smooth);}
  for(const s of switchArt)s.art.setActive(channelActive(level,s.channel,progress>0?after:before));
}
function theme() {
  document.body.classList.toggle('dark', dark); scene.background = new THREE.Color(dark ? 0x000000 : 0xffffff); setArtTheme(dark); setIceTheme(dark);
  $('theme').setAttribute('aria-label', dark ? 'Switch to white background' : 'Switch to black background');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#ffffff');
  try { localStorage.setItem('ink-rooms-theme', dark ? 'black' : 'white'); } catch {}
}
theme();
function notify(message: string) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('toast').classList.remove('visible'), 4000); }
function setMoving(value: boolean) {
  if (value === moving) return; moving = value; if (!mixer) return;
  const a = value ? run : idle, b = value ? idle : run; a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play(); b.crossFadeTo(a, .13, false);
}
function updateHUD() {
  for(const p of pads)if(p.authoredPoint)p.point=rotationPoint(LEVELS[state.level],p.authoredPoint,state);
  $('moves').textContent = `${state.moves} moves`; $<HTMLButtonElement>('undo').disabled = history.length === 0;
  $('pad-dots').innerHTML = pads.map(p => `<i class="${state.boxes.some(b => b.x === p.point.x && b.z === p.point.z) ? 'filled' : ''}"></i>`).join('');
  $('pad-dots').setAttribute('aria-label', `${pads.filter(p => state.boxes.some(b => b.x === p.point.x && b.z === p.point.z)).length} of ${pads.length} targets occupied`);
  for (const p of pads) p.setActive(state.boxes.some(b => b.x === p.point.x && b.z === p.point.z));
  exit?.setActive(solved(state));
}
function clearInput() { pressed.clear(); touchDir = null;hub?.setInput(null); }
function cancelHint() { hintId++; hintWorker?.terminate(); hintWorker = null; $<HTMLButtonElement>('hint').disabled = false; }
function clearRoom() {
  cubeView?.dispose();cubeView=null;
  rotatorArt.forEach(r=>r.art.dispose());rotatorArt=[];
  robotArt.forEach(a=>a.dispose());robotArt=[];robotPushWeights=[];robotMileage=[];robotLast=[];
  room.clear();disposeRoomArt();disposeMachineryArt();switchArt=[];machineArt=[];crates=[];pads=[];
}
function hubUI(active:boolean) {
  document.body.classList.toggle('in-hub',active);camera.far=active?600:180;camera.updateProjectionMatrix();
  $('hub-toggle').setAttribute('aria-pressed',String(active));
  $('hub-toggle').setAttribute('aria-label',active?'Return to current room':'Open level world');
  $('hub-nav').hidden=!active;
  window.history.replaceState(null,'',location.pathname+location.search+(active?'#levels':''));
}
function openHub(areaId?:string) {
  if(!ready||hub)return;
  const saved=state.fall&&history.length?history.at(-1)!:state;
  suspended={state:structuredClone(saved),history:structuredClone(state.fall?history.slice(0,-1):history),facing:{...facing}};
  clearInput();cancelHint();motion=null;fallingTime=0;sound.stop();setMoving(false);rest?.reset(simulationTime);
  $('win').hidden=true;$('lesson').hidden=true;$('toast').classList.remove('visible');
  clearRoom();
  hub=createHubView(room,player,levelCompleted,areaId||HUB_AREAS.find(a=>a.levels.includes(state.level))?.id,rememberedHub,camera);
  hubFrame=hub.update(0,simulationTime);hubUI(true);overview=false;zoom=1;yaw=.12;pitch=.82;
  $('overview').setAttribute('aria-pressed','false');document.querySelector('h1 small')!.textContent='World';
}
function resumeRoom() {
  if(!suspended)return;
  const saved=suspended;loadLevel(saved.state.level);state=saved.state;history=saved.history;facing=saved.facing;
  player.position.copy(point(state.player));player.rotation.set(0,Math.atan2(facing.x,facing.z),0);
  crates.forEach((c,i)=>c.position.copy(point(state.boxes[i])));
  robotArt.forEach((a,i)=>{a.root.position.copy(point(state.robots![i]));a.root.rotation.y=robotAngle(state.robots![i].direction);robotLast[i].copy(a.root.position);});
  cubeView?.sync(state,player,crates,facing);syncMachinery();syncRotators();updateHUD();if(state.won)win();
}
$('hub-toggle').onclick=()=>{if(hub)resumeRoom();else openHub();};
for(const area of HUB_AREAS){const button=document.createElement('button');button.textContent=area.name;button.dataset.area=area.id;button.onclick=()=>{clearInput();hub?.travel(area.id);overview=false;zoom=1;pitch=.82;yaw=.12;$('overview').setAttribute('aria-pressed','false');button.blur();};$('hub-nav').append(button);}
window.addEventListener('hashchange',()=>{if(location.hash==='#levels')openHub('courtyard');else if(hub)resumeRoom();});
function loadLevel(index: number) {
  if(hub)rememberedHub=hub.snapshot().state;hub?.dispose();hub=null;hubFrame=null;suspended=null;hubUI(false);
  sound.stop(); rest?.reset(simulationTime);
  state = createState(index); history = []; motion = null; fallingTime = 0; clearInput(); hintId++;
  hintWorker?.terminate(); hintWorker = null; $<HTMLButtonElement>('hint').disabled = false;
  setMoving(false); $('win').hidden = true; $('toast').classList.remove('visible');
  clearRoom(); const level = LEVELS[index]; const staticArt = new THREE.Group();room.add(staticArt);
  if(level.cube){
    cubeView=createCubeView(level,room);pads=cubeView.pads;exit=cubeView.exit;
  }else{
  for(const r of level.rotators||[]){const center=point(r);center.y=0;const content=new THREE.Group();content.position.copy(center);room.add(content);const art=createRotatorArt(r.radius,r.channel);art.root.position.copy(center);room.add(art.root);rotatorArt.push({content,art,center});}
  const rotatingPads:{root:THREE.Group;index:number}[]=[];
  for (let z = 0; z < level.map.length; z++) for (let x = 0; x < level.map[z].length; x++) {
    const tile = tileAt(level, x, z); if (tile === '~') continue;
    const device = level.elevators?.find(e=>e.x===x&&e.z===z) || level.bridges?.find(e=>e.x===x&&e.z===z);
    if(device)continue;
    const p = point({ x, z }),ri=rotorIndex(level,{x,z});
    const container=ri<0?staticArt:rotatorArt[ri].content;
    const local=ri<0?p:p.clone().sub(rotatorArt[ri].center);
    const neighbors = [[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dz]) => ({solid:tileAt(level,x+dx,z+dz)!=='~'&&rotorIndex(level,{x:x+dx,z:z+dz})===ri,tier:worldTier({x:x+dx,z:z+dz})}));
    const tileArt = level.jumping ? terraceTile(worldTier({x,z}),neighbors,isIce(level,{x,z})?iceSurface:undefined) : floorTile(neighbors.map(n=>n.solid),isIce(level,{x,z})?iceSurface:undefined);
    tileArt.position.copy(local); container.add(tileArt);
    if (tile === '#') { const wall = obstacle(); wall.position.copy(local); container.add(wall); }
    if (tile === '.') { const pad = createPad(false,!!level.switches?.some(s=>s.x===x&&s.z===z)); pad.root.position.copy(local); if(ri<0)room.add(pad.root);else rotatingPads.push({root:pad.root,index:ri}); pads.push({ ...pad, point: { x, z },authoredPoint:{x,z} }); }
    if (tile === 'E') { exit = createPad(true); exit.root.position.copy(p); room.add(exit.root); }
  }
  batchArt(staticArt);
  rotatorArt.forEach(r=>batchArt(r.content));
  rotatingPads.forEach(p=>rotatorArt[p.index].content.add(p.root));
  syncRotators();
  for(const s of level.switches||[]){const art=createSwitchArt(s.channel);art.root.position.copy(point(s));room.add(art.root);switchArt.push({channel:s.channel,art});}
  for(const e of level.elevators||[]){const art=createElevatorArt(e.low,e.high,e.channel);art.root.position.copy(point(e));art.root.position.y=0;room.add(art.root);machineArt.push({channel:e.channel,art});}
  for(const b of level.bridges||[]){const art=createBridgeArt(b.channel);art.root.position.copy(point(b));const solid=(x:number,z:number)=>!['~','#'].includes(tileAt(level,x,z));if(Number(solid(b.x-1,b.z))+Number(solid(b.x+1,b.z))>Number(solid(b.x,b.z-1))+Number(solid(b.x,b.z+1)))art.root.rotation.y=Math.PI/2;room.add(art.root);machineArt.push({channel:b.channel,art});}
  syncMachinery();
  for(const r of state.robots||[]){const art=createRobotArt();art.root.position.copy(point(r));art.root.rotation.y=robotAngle(r.direction);room.add(art.root);robotArt.push(art);robotPushWeights.push(0);robotMileage.push(0);robotLast.push(art.root.position.clone());}
  }
  const template = batchArt(createCrate());
  for (const b of state.boxes) { const crate = template.clone(true); crate.position.copy(point(b)); room.add(crate); crates.push(crate); }
  player.position.copy(point(state.player)); player.rotation.set(0, 0, 0); player.scale.setScalar(1);
  cubeView?.sync(state,player,crates);
  levelSelect.value = String(index); document.querySelector('h1 small')!.textContent = String(index + 1).padStart(2, '0');
  zoom = 1; resetCameraAngle(); facing={x:0,z:-1};
  $('lesson').textContent = level.lesson || ''; $('lesson').hidden = !level.lesson;
  updateHUD();
}
function win() {
  if (!levelCompleted.includes(state.level)) { levelCompleted.push(state.level); try { localStorage.setItem('ink-rooms-v2-completed', JSON.stringify(levelCompleted)); } catch {} }
  $('win-title').textContent = state.level === LEVELS.length - 1 ? 'A clean finish.' : 'Room cleared.';
  $('win-stats').textContent = `${state.moves} moves · ${state.pushes} pushes`;
  $('next').textContent = state.level === LEVELS.length - 1 ? 'Level world →' : 'Next room →';
  $('win').hidden = false; $('next').focus(); clearInput();
}
function cameraDirection(dir:Point):Point {
  const x=dir.x*Math.cos(yaw)+dir.z*Math.sin(yaw),z=dir.z*Math.cos(yaw)-dir.x*Math.sin(yaw);
  return {x:Math.abs(x)>Math.abs(z)?Math.sign(x):0,z:Math.abs(x)>Math.abs(z)?0:Math.sign(z)};
}
function cameraStep(dir: Point) {
  if(hub){const d=cameraDirection(dir);hub.setInput(d);if(hub.step(d.x,d.z))sound.play('step');return;}
  if(LEVELS[state.level].cube&&pitch<.35)pitch=.64;
  const d=cameraDirection(dir);takeStep(d.x,d.z);
}
function syncRotators(pose:State=state) {
  rotatorArt.forEach((r,i)=>{const angle=-(pose.rotations?.[i]||0)*Math.PI/2;r.content.rotation.y=angle;r.content.position.y=0;r.art.setMotion(angle,0);});
}
function complexPhase(m:NonNullable<typeof motion>) {
  let elapsed=m.time;const phases=m.complex!.phases;
  for(let i=0;i<phases.length;i++){if(elapsed<phases[i].duration||i===phases.length-1)return {phase:phases[i],elapsed:Math.min(elapsed,phases[i].duration)};elapsed-=phases[i].duration;}
  return {phase:phases[0],elapsed:0};
}
function takeComplexStep(before:State,next:State,dx:number,dz:number) {
  const level=LEVELS[before.level],mid=attemptMove(before,dx,dz,false,false)!,unturned=attemptMove(before,dx,dz,true,false)!;
  const phases:ComplexPhase[]=[];
  const machinesChanged=(a:State,b:State)=>machineArt.some(m=>channelActive(level,m.channel,a)!==channelActive(level,m.channel,b));
  const moveDuration=(a:State,b:State)=>{
    const pairs=[[a.player,b.player],...a.boxes.map((p,i)=>[p,b.boxes[i]]),...(a.robots||[]).map((p,i)=>[p,b.robots![i]])];
    const maxCells=Math.max(...pairs.map(([p,q])=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z)));
    const heightChange=pairs.some(([p,q])=>heightAt(level,p,a)!==heightAt(level,q,a));
    return Math.max(heightChange?.72:.34,a.robots?.length?.52:0,.24+Math.max(0,maxCells-1)*.16);
  };
  const addMove=(a:State,b:State)=>phases.push({kind:'move',before:a,after:b,duration:moveDuration(a,b)});
  const addMachines=(a:State,b:State)=>{if(machinesChanged(a,b))phases.push({kind:'machines',before:a,after:b,duration:.72});};
  if(before.robots?.length&&machinesChanged(before,mid)){
    addMove(before,mid);addMachines(before,mid);addMove(mid,unturned);addMachines(mid,unturned);
  }else {addMove(before,unturned);addMachines(before,unturned);}
  if((next.rotations||[]).some((r,i)=>r!==(before.rotations?.[i]||0)))phases.push({kind:'rotate',before:unturned,after:next,duration:2});
  history.push(before);state=next;cancelHint();
  const duration=phases.reduce((n,p)=>n+p.duration,0);
  motion={from:player.position.clone(),to:point(next.player),boxes:crates.map(c=>c.position.clone()),boxTos:next.boxes.map(p=>point(p)),before,time:0,duration,moveDuration:phases[0].duration,jump:false,drop:false,mechanisms:false,complex:{phases,heading:Math.atan2(dx,dz),boxAngles:crates.map(c=>c.rotation.y)}};
  let at=0;for(const phase of phases){if(phase.kind==='move')sound.play(phase.after.pushes>phase.before.pushes?'push':'step',at,.95);if(phase.kind==='machines')sound.play('push',at,.65);if(phase.kind==='rotate'){sound.play('push',at,.55);sound.play('land',at+phase.duration-.1,.7);}at+=phase.duration;}
  if(next.won)sound.play('exit',duration);
  updateHUD();
}
function animateComplexTurn(m:NonNullable<typeof motion>) {
  const {phase,elapsed}=complexPhase(m),a=phase.before,b=phase.after,level=LEVELS[a.level],t=elapsed/phase.duration,e=smooth(t);
  const objects=[player,...crates,...robotArt.map(r=>r.root)],from=[a.player,...a.boxes,...a.robots||[]],to=[b.player,...b.boxes,...b.robots||[]];
  m.jump=false;
  if(phase.kind==='rotate'){
    // Unlock and lift clear of neighboring objects, rotate on the bearing, then dock.
    const turn=smooth((t-.2)/.55),lift=t<.2?smooth(t/.2)*1.65:t<.75?1.65:(1-smooth((t-.75)/.25))*1.65;
    rotatorArt.forEach((r,i)=>{const active=a.rotations![i]!==b.rotations![i],angle=-(a.rotations![i]+(active?turn:0))*Math.PI/2;r.content.rotation.y=angle;r.content.position.y=active?lift:0;r.art.setMotion(angle,active?lift:0);});
    objects.forEach((o,i)=>{const ri=rotorIndex(level,from[i]),active=ri>=0&&a.rotations![ri]!==b.rotations![ri],p=point(from[i],a);
      const angle=active?-turn*Math.PI/2:0;if(active){const c=rotatorArt[ri].center;p.sub(c).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(c);p.y+=lift;}
      o.position.copy(p);
      const base=i===0?m.complex!.heading:i<=crates.length?m.complex!.boxAngles[i-1]:robotAngle(a.robots![i-1-crates.length].direction);o.rotation.y=base+angle;
    });
    syncMachinery(a,1,b);setMoving(false);return;
  }
  syncRotators(a);
  objects.forEach((o,i)=>{
    if(phase.kind==='machines'){o.position.lerpVectors(point(to[i],a),point(to[i],b),e);return;}
    const p=point(from[i],a),q=point(to[i],a),cells=Math.abs(from[i].x-to[i].x)+Math.abs(from[i].z-to[i].z);
    const actorDuration=Math.max(q.y!==p.y?.72:.24,.24+Math.max(0,cells-1)*.16,i>crates.length?.52:0);
    const u=Math.min(1,elapsed/actorDuration);o.position.lerpVectors(p,q,smooth(u));
    if(i===0&&q.y>p.y+.1){o.position.y+=Math.sin(Math.PI*u)*.8;m.jump=true;m.moveDuration=actorDuration;}
    else if(q.y<p.y-.1){const fall=Math.max(0,(u-.5)*2);o.position.y=THREE.MathUtils.lerp(p.y,q.y,fall*fall);}
    if(i===0)o.rotation.y=m.complex!.heading;
    if(i>crates.length){const j=i-1-crates.length,old=robotAngle(a.robots![j].direction),angle=robotAngle(b.robots![j].direction);o.rotation.y=old+Math.atan2(Math.sin(angle-old),Math.cos(angle-old))*smooth(elapsed/.12);}
  });
  if(phase.kind==='machines')syncMachinery(a,t,b);else syncMachinery(a,1,a);
  const cells=Math.abs(a.player.x-b.player.x)+Math.abs(a.player.z-b.player.z);
  setMoving(phase.kind==='move'&&cells>0&&elapsed<(cells>1?.22:.24)&&!m.jump);
}

function takeStep(dx: number, dz: number) {
  if(hub){hub.step(dx,dz);return;}
  if (!ready || motion || state.won || state.fall) return;
  const before = state, next = attemptMove(state, dx, dz); facing={x:dx,z:dz}; player.rotation.y = Math.atan2(dx, dz);
  if (!next) {
    setMoving(false);
    return;
  }
  if(cubeView){
    const size=LEVELS[state.level].cube!.size;
    const crossing=cubeFace(size,before.player)!==cubeFace(size,next.player);
    const cargoCrossing=before.boxes.some((b,i)=>cubeFace(size,b)!==cubeFace(size,next.boxes[i]));
    const cubeMotion=cubeView.begin(before,crates,{x:dx,z:dz},next);
    const machinesChanged=(LEVELS[state.level].bridges||[]).some(b=>channelActive(LEVELS[state.level],b.channel,before)!==channelActive(LEVELS[state.level],b.channel,next));
    const duration=Math.max(crossing?1.05:cargoCrossing?.85:next.pushes>before.pushes?.34:.26,cubeMotion.duration,machinesChanged?.7:0);
    history.push(before);state=next;cancelHint();
    motion={from:player.position.clone(),to:point(next.player),boxes:crates.map(c=>c.position.clone()),boxTos:next.boxes.map(p=>point(p)),time:0,duration,moveDuration:duration,before,jump:false,drop:false,mechanisms:false,cubeMotion};
    sound.play(next.pushes>before.pushes?'push':'step');
    if(crossing){sound.play('push',.25,.35);sound.play('land',duration-.05,.4);}
    if(next.won)sound.play('exit',duration);
    setMoving(true);updateHUD();return;
  }
  if(LEVELS[before.level].rotators?.length||before.level>=36){takeComplexStep(before,next,dx,dz);return;}
  history.push(before); state = next; cancelHint();
  const middle=before.robots?.length ? attemptMove(before,dx,dz,false)! : next;
  const boxTos=next.boxes.map(b=>point(b,before));
  const drop = !next.fall && boxTos.some((b,i)=>b.y < crates[i].position.y-.1);
  const climbing = point(next.player,before).y > player.position.y+.1;
  const jump = climbing && middle.pushes === before.pushes;
  const level=LEVELS[state.level];
  const mechanisms=machineArt.some(m=>channelActive(level,m.channel,before)!==channelActive(level,m.channel,next));
  const moveDuration=drop?.72:jump?.56:next.pushes>before.pushes?.34:.25;
  motion = { from: player.position.clone(), to: point(next.player,before), boxes: crates.map(c => c.position.clone()),boxTos, before,mechanisms,moveDuration,time:0,duration:moveDuration+(mechanisms?.7:0),jump,drop };
  if(level.ice?.length&&!before.robots?.length){
    const seconds=(a:Point,b:Point)=>{const cells=Math.abs(a.x-b.x)+Math.abs(a.z-b.z);return cells>0?.24+Math.max(0,cells-1)*.14:0;};
    const playerDuration=seconds(before.player,next.player),boxDurations=before.boxes.map((b,i)=>seconds(b,next.boxes[i]));
    motion.iceMotion={playerDuration,boxDurations,playerGlide:Math.abs(before.player.x-next.player.x)+Math.abs(before.player.z-next.player.z)>1};
    motion.moveDuration=Math.max(moveDuration,playerDuration,...boxDurations);
    motion.duration=motion.moveDuration+(mechanisms?.7:0);
  }
  if(before.robots?.length){
    const firstMachine=machineArt.some(m=>channelActive(level,m.channel,before)!==channelActive(level,m.channel,middle))?.7:0;
    const secondMachine=machineArt.some(m=>channelActive(level,m.channel,middle)!==channelActive(level,m.channel,next))?.7:0;
    const robotMoved=next.robots!.some((r,i)=>r.x!==before.robots![i].x||r.z!==before.robots![i].z||r.direction!==before.robots![i].direction);
    const robotDuration=robotMoved?.52:.12;
    const together=firstMachine===0;
    motion.robotTurn={middle,together,firstMachine,robotDuration,secondMachine};
    if(together){motion.moveDuration=Math.max(moveDuration,.52);motion.duration=motion.moveDuration+secondMachine;}
    else motion.duration=moveDuration+firstMachine+robotDuration+secondMachine;
    if(next.pushes>middle.pushes){sound.play('push',together?.12:moveDuration+firstMachine,.82);if(drop)sound.play('land',motion.duration);}
  }
  if(mechanisms)sound.play('push',motion.moveDuration,.65);
  if(jump){sound.play('jump');sound.play('land',motion.duration);}
  else if(middle.pushes>before.pushes){sound.play('push');if(drop)sound.play('land',motion.duration);}
  else sound.play('step',.08,state.moves%2?1:1.08);
  const filledNow=pads.filter(p=>next.boxes.some(b=>b.x===p.point.x&&b.z===p.point.z)&&!before.boxes.some(b=>b.x===p.point.x&&b.z===p.point.z)).length;
  if(filledNow)sound.play('pad',motion.duration);
  if(next.won)sound.play('exit',motion.duration);
  setMoving(!jump); updateHUD();
}
function undo() {
  if (hub || !history.length || !ready) return;
  sound.stop(); rest?.reset(simulationTime);
  state = history.pop()!; motion = null; fallingTime = 0; cancelHint(); clearInput(); setMoving(false);
  player.position.copy(point(state.player)); player.rotation.x = player.rotation.z = 0;
  crates.forEach((c, i) => { c.position.copy(point(state.boxes[i])); c.rotation.set(0, 0, 0); });
  robotArt.forEach((a,i)=>{a.root.position.copy(point(state.robots![i]));a.root.rotation.set(0,robotAngle(state.robots![i].direction),0);robotLast[i].copy(a.root.position);});
  cubeView?.sync(state,player,crates,facing);
  syncMachinery(); syncRotators(); $('win').hidden = true; updateHUD();
}
function hint() {
  if (hub || !ready || state.won || state.fall) return;
  hintWorker?.terminate(); const id = ++hintId; $<HTMLButtonElement>('hint').disabled = true;
  hintWorker = new Worker(new URL('./hint-worker.ts', import.meta.url), { type: 'module' });
  hintWorker.onmessage = event => {
    $<HTMLButtonElement>('hint').disabled = false; hintWorker?.terminate(); hintWorker = null;
    if (event.data.id !== hintId) return;
    const path = event.data.path as Move[] | null;
    if (!path?.length) { notify('Try undoing your last push.'); return; }
    const worldMove = path[0]; resetCameraAngle();
    const dir = [{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}].find(input => {
      const world = cameraDirection(input);
      return world.x === worldMove.x && world.z === worldMove.z;
    })!;
    notify(`Next move: ${dir.x === 1 ? '→' : dir.x === -1 ? '←' : dir.z === 1 ? '↓' : '↑'}`);
  };
  hintWorker.onerror = () => { $<HTMLButtonElement>('hint').disabled = false; hintWorker?.terminate(); hintWorker = null; notify(LEVELS[state.level].hint); };
  hintWorker.postMessage({ id, state });
}
function toggleOverview() { overview = !overview; $('overview').setAttribute('aria-pressed', String(overview)); $('overview').setAttribute('aria-label', overview ? 'Return to close camera' : 'Show full platform'); }
$('theme').onclick = () => { dark = !dark; theme(); }; $('overview').onclick = toggleOverview;
$('reset').onclick = () => { if (ready) loadLevel(state.level); }; $('undo').onclick = undo; $('hint').onclick = hint;
$('next').onclick = () => state.level===LEVELS.length-1?openHub():loadLevel(state.level+1); $('replay').onclick = () => loadLevel(state.level);
levelSelect.onchange = () => { if (ready) loadLevel(Number(levelSelect.value)); levelSelect.blur(); };
const directions: Record<string, Point> = { KeyW: { x: 0, z: -1 }, ArrowUp: { x: 0, z: -1 }, KeyS: { x: 0, z: 1 }, ArrowDown: { x: 0, z: 1 }, KeyA: { x: -1, z: 0 }, ArrowLeft: { x: -1, z: 0 }, KeyD: { x: 1, z: 0 }, ArrowRight: { x: 1, z: 0 } };
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).tagName === 'SELECT') return;
  if (directions[e.code]) { e.preventDefault(); pressed.add(e.code); if (!e.repeat && !motion) { cameraStep(directions[e.code]); repeatAt = performance.now() + 240; } }
  if (e.repeat) return;
  if (e.code === 'KeyZ') { e.preventDefault(); undo(); } if (e.code === 'KeyR' && ready && !hub) loadLevel(state.level); if (e.code === 'KeyH') hint();
  if (e.code === 'KeyV') toggleOverview();
});
window.addEventListener('keyup', e => {pressed.delete(e.code);const dir=touchDir??directions[[...pressed].at(-1)||''];hub?.setInput(dir?cameraDirection(dir):null);}); window.addEventListener('blur', clearInput);
renderer.domElement.addEventListener('pointerdown', e => { drag = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove', e => { if (!drag) return; yaw -= (e.clientX - lastX) * .005; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - lastY) * .004, !hub&&LEVELS[state.level].cube ? -1.3 : .48, 1.3); lastX = e.clientX; lastY = e.clientY; });
renderer.domElement.addEventListener('pointerup', () => drag = false); renderer.domElement.addEventListener('pointercancel', () => drag = false);
renderer.domElement.addEventListener('wheel', e => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom + e.deltaY * .001, .55, 1.7); }, { passive: false });
for (const button of document.querySelectorAll<HTMLButtonElement>('#touch button[data-dir]')) {
  const key = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }[button.dataset.dir!]!;
  button.onpointerdown = e => { button.setPointerCapture(e.pointerId); touchDir = directions[key]; cameraStep(touchDir); repeatAt = performance.now() + 240; };
  button.onpointerup = button.onpointercancel = () => { touchDir = null;const dir=directions[[...pressed].at(-1)||''];hub?.setInput(dir?cameraDirection(dir):null); };
}
new GLTFLoader().loadAsync('/character.glb', e => { if (e.total) $('progress').textContent = `${Math.round(e.loaded / e.total * 100)}%`; }).then(character => {
  character.scene.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    const materials = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
      const src = m as THREE.MeshStandardMaterial;
      return new THREE.MeshBasicMaterial({ map: src.emissiveMap || src.map, color: src.emissive.r + src.emissive.g + src.emissive.b > 0 ? src.emissive : src.color, side: src.side, transparent: src.transparent, opacity: src.opacity, alphaTest: src.alphaTest });
    });
    o.material = materials.length === 1 ? materials[0] : materials; o.frustumCulled = false;
  });
  player.add(character.scene);
  for(const [name,angle] of [['LeftUpLeg',-.3],['RightUpLeg',-.3],['LeftLeg',.65],['RightLeg',.65],['LeftForeArm',-.25],['RightForeArm',-.25]] as const){const bone=character.scene.getObjectByName(name);if(bone)jumpBones.push({bone,base:bone.quaternion.clone(),angle});}
  mixer = new THREE.AnimationMixer(character.scene);
  run = mixer.clipAction(character.animations.find(c => /run/i.test(c.name))!); idle = mixer.clipAction(character.animations.find(c => /idle/i.test(c.name))!);
  run.play().setEffectiveWeight(0); idle.play(); ready = true; if(location.hash==='#levels')openHub('courtyard');else loadLevel(0); $('loading').remove();
  rest=createRestAnimation(character.scene,{strength:1.8});rest.reset(simulationTime);
}).catch(() => { $('progress').textContent = 'Could not load the character. Refresh to try again.'; });
function robotAngle(direction:number){return [Math.PI,Math.PI/2,0,-Math.PI/2][direction];}
const smooth=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
function animateRobotTurn(m:NonNullable<typeof motion>) {
  const turn=m.robotTurn!, mid=turn.middle;
  if(turn.together){
    const t=THREE.MathUtils.clamp((m.time-.12)/(m.moveDuration-.12),0,1),e=smooth(t);
    const lift=turn.secondMachine?smooth((m.time-m.moveDuration)/turn.secondMachine):1;
    const interpolate=(object:THREE.Object3D,from:Point,to:Point)=>{
      const a=point(from,m.before),b=point(to,m.before);object.position.lerpVectors(a,b,e);
      if(b.y<a.y-.1){const fall=Math.max(0,(t-.5)*2);object.position.y=THREE.MathUtils.lerp(a.y,b.y,fall*fall);}
      object.position.y+=(point(to,state).y-b.y)*lift;
    };
    interpolate(player,m.before.player,state.player);
    if(m.jump)player.position.y+=Math.sin(Math.PI*t)*.8;
    crates.forEach((c,i)=>interpolate(c,m.before.boxes[i],state.boxes[i]));
    robotArt.forEach((art,i)=>{
      interpolate(art.root,m.before.robots![i],state.robots![i]);
      const old=robotAngle(m.before.robots![i].direction),target=robotAngle(state.robots![i].direction);
      art.root.rotation.y=old+Math.atan2(Math.sin(target-old),Math.cos(target-old))*smooth(m.time/.12);
    });
    syncMachinery(m.before,lift);
    setMoving(t>0&&t<1&&!m.jump);
    return;
  }
  const firstEnd=m.moveDuration+turn.firstMachine, robotEnd=firstEnd+turn.robotDuration;
  const stage=m.time<m.moveDuration?0:m.time<firstEnd?1:m.time<robotEnd?2:3;
  const a=stage<2?m.before:mid,b=stage<2?mid:state;
  const t=stage===0?m.time/m.moveDuration:stage===1?(m.time-m.moveDuration)/turn.firstMachine:stage===2?(m.time-firstEnd)/turn.robotDuration:turn.secondMachine?(m.time-robotEnd)/turn.secondMachine:1;
  const e=smooth(stage===2?Math.max(0,(t-.25)/.75):t);
  const interpolate=(object:THREE.Object3D,from:Point,to:Point)=>{
    const fromPos=point(stage%2===0?from:to,a),toPos=point(to,stage%2===0?a:b);
    object.position.lerpVectors(fromPos,toPos,e);
    if(stage%2===0&&toPos.y<fromPos.y-.1){const fall=Math.max(0,(t-.5)*2);object.position.y=THREE.MathUtils.lerp(fromPos.y,toPos.y,fall*fall);}
  };
  interpolate(player,a.player,b.player);
  if(stage===0&&m.jump)player.position.y+=Math.sin(Math.PI*Math.min(t,1))*.8;
  crates.forEach((c,i)=>interpolate(c,a.boxes[i],b.boxes[i]));
  robotArt.forEach((art,i)=>{
    interpolate(art.root,a.robots![i],b.robots![i]);
    const old=robotAngle(m.before.robots![i].direction),target=robotAngle(state.robots![i].direction);
    const delta=Math.atan2(Math.sin(target-old),Math.cos(target-old));
    art.root.rotation.y=old+delta*(stage<2?0:stage>2?1:smooth(Math.min(t*3,1)));
  });
  if(stage%2===0)syncMachinery(a,1,a);else syncMachinery(a,e,b);
  setMoving(stage===0&&!m.jump);
}
function fallObject(){return state.fall?.kind==='player'?player:state.fall?.kind==='robot'?robotArt[state.fall.index].root:crates[state.fall!.index];}
const lookAt = new THREE.Vector3(0, .35, 0), desired = new THREE.Vector3(); let previous = performance.now();
function render(now: number) {
  if(!filming)frameHandle=requestAnimationFrame(render); const dt = Math.min((now - previous) / 1000, .04); previous = now;
  simulationTime+=dt;
  if (ready) {
    if(hub){
      const held=touchDir??directions[[...pressed].at(-1)||''];hub.setInput(held?cameraDirection(held):null);
      if(!hub.busy()&&now>repeatAt){const dir=touchDir??directions[[...pressed].at(-1)||''];if(dir){cameraStep(dir);repeatAt=now+100;}}
      const wasCube=hubFrame?.cube;hubFrame=hub.update(dt,simulationTime);if(hubFrame.cube&&!wasCube){pitch=.57;yaw=.5;}setMoving(hubFrame.moving);
      for(const button of document.querySelectorAll<HTMLButtonElement>('#hub-nav button'))button.setAttribute('aria-current',String(button.dataset.area===hubFrame.area));
      if(hubFrame.enterLevel!==null)loadLevel(hubFrame.enterLevel);
    }else{
    if (motion) {
      motion.time += dt; const t = Math.min(motion.time / motion.moveDuration, 1);
      const m=motion;
      if(m.cubeMotion){cubeView!.animate(m.before,state,m.time/m.duration,m.cubeMotion,player,crates);setMoving(m.time<(m.cubeMotion.playerPath.length>2?.22:m.duration));}
      else if(m.complex) animateComplexTurn(m); else if(m.robotTurn) animateRobotTurn(m); else {
      const playerT=m.iceMotion?Math.min(1,m.time/Math.max(.01,m.iceMotion.playerDuration)):t;
      const progress=m.drop?Math.min(playerT/.55,1):playerT;
      player.position.lerpVectors(m.from,m.to,progress*progress*(3-2*progress));
      if(m.jump) player.position.y += Math.sin(Math.PI*t)*.8;
      else if(m.to.y>m.from.y) player.position.y=Math.max(player.position.y,m.from.y+(m.to.y-m.from.y)*Math.min(1,t/.35))+Math.sin(Math.PI*t)*.06;
      else if(m.to.y<m.from.y) {const drop=Math.max(0,(t-.5)/.5);player.position.y=THREE.MathUtils.lerp(m.from.y,m.to.y,drop*drop);}
      crates.forEach((c,i)=>{
        const from=m.boxes[i],to=m.boxTos[i],boxT=m.iceMotion?Math.min(1,m.time/Math.max(.01,m.iceMotion.boxDurations[i])):t;
        const boxEase=smooth(boxT);
        if(to.y<from.y-.1 && !state.fall){
          const slide=Math.min(boxT/.55,1),fall=Math.max(0,(boxT-.55)/.45);c.position.lerpVectors(from,to,slide*slide*(3-2*slide));c.position.y=THREE.MathUtils.lerp(from.y,to.y,fall*fall);
        }else c.position.lerpVectors(from,to,boxEase);
      });
      if(m.mechanisms){
        const lift=Math.max(0,Math.min((m.time-m.moveDuration)/.7,1)),smooth=lift*lift*(3-2*lift);
        player.position.y+=(point(state.player).y-m.to.y)*smooth;
        crates.forEach((c,i)=>c.position.y+=(point(state.boxes[i]).y-m.boxTos[i].y)*smooth);
        syncMachinery(m.before,lift);
      }else syncMachinery();
      if(m.iceMotion)setMoving(m.time<Math.min(m.iceMotion.playerDuration,m.iceMotion.playerGlide?.22:999));
      }
      if (m.time >= m.duration) { motion = null; if (state.fall) { clearInput(); setMoving(false); fallingTime = 0; fallStartY=fallObject().position.y; cubeView?.beginFall(fallObject()); } else if (state.won) { setMoving(false); win(); } }
    } else if (state.fall) {
      fallingTime += dt;
      const object = fallObject();
      if(cubeView)cubeView.animateFall(object,fallingTime/1.25);
      else{
        object.position.y = fallStartY - 7 * fallingTime * fallingTime;
        object.rotation.z = Math.min(fallingTime * 1.5, 1.3);
      }
      if (fallingTime > (cubeView?1.25:.8)) { falls++; undo(); notify('Back on solid ground.'); }
    }
    if (!motion && !state.won && !state.fall && now > repeatAt) {
      const dir=touchDir??directions[[...pressed].at(-1)||''];if(dir){cameraStep(dir);repeatAt=now+100;}else setMoving(false);
    }
    robotArt.forEach((art,i)=>{
      const delta=art.root.position.distanceTo(robotLast[i]);robotMileage[i]+=motion?.complex&&complexPhase(motion).phase.kind==='rotate'?0:delta;robotLast[i].copy(art.root.position);
      const turn=motion?.robotTurn,active=!!turn&&(turn.together?motion!.time<motion!.moveDuration:motion!.time>=motion!.moveDuration+turn.firstMachine&&motion!.time<motion!.moveDuration+turn.firstMachine+turn.robotDuration);
      const phase=motion?.complex?complexPhase(motion).phase:null;
      const complexPush=phase?.kind==='move'&&phase.before.boxes.some((b,j)=>b.x===phase.after.robots![i].x&&b.z===phase.after.robots![i].z&&(b.x!==phase.after.boxes[j].x||b.z!==phase.after.boxes[j].z));
      const targetPush=complexPush||active&&turn!.middle.boxes.some((b,j)=>b.x===state.robots![i].x&&b.z===state.robots![i].z&&(b.x!==state.boxes[j].x||b.z!==state.boxes[j].z))?1:0;
      robotPushWeights[i]+=THREE.MathUtils.clamp(targetPush-robotPushWeights[i],-dt*9,dt*9);
      art.update({time:simulationTime,distance:robotMileage[i],moving:motion?.complex&&complexPhase(motion).phase.kind==='rotate'?0:Math.min(1,delta/Math.max(.001,dt)/3),pushing:robotPushWeights[i],blocked:!!state.robots![i].blocked});
    });
    }
    for(const pose of jumpBones)pose.bone.quaternion.copy(pose.base);
    rest?.restore();
    run.setEffectiveTimeScale(hubFrame?.runSpeed??1);mixer.update(dt);
    rest?.update({time:simulationTime,delta:dt,standing:!moving&&!motion&&(!!hub||!state.fall)});
    for(const pose of jumpBones){pose.base.copy(pose.bone.quaternion);if(motion?.jump){const t=Math.min(motion.time/motion.moveDuration,1);pose.bone.rotateX(pose.angle*Math.sin(Math.PI*t));}}
  }
  cubeView?.update(simulationTime,state.fall?fallingTime/1.25:0);
  if(hub&&hubFrame){
    const cubeApproach=hubFrame.area==='cube'&&!hubFrame.cube;
    const target=overview?hubFrame.overview.target:hubFrame.target.clone().add(cubeApproach?new THREE.Vector3(0,2,-8):new THREE.Vector3());
    const distance=overview?Math.max(hubFrame.overview.width/(camera.aspect*.63),hubFrame.overview.depth/.67)*1.15*zoom:(hubFrame.cube?32:cubeApproach?34:24)*zoom/(Math.min(1,hubFrame.cube?camera.aspect:Math.max(.75,camera.aspect))*.9);
    const far=Math.max(600,distance+hubFrame.overview.width+hubFrame.overview.depth);if(camera.far!==far){camera.far=far;camera.updateProjectionMatrix();}
    lookAt.lerp(target,1-Math.exp(-5*dt));
    desired.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance).add(lookAt);
    camera.position.lerp(desired,1-Math.exp(-5*dt));camera.lookAt(lookAt);
  }else if(LEVELS[state.level].cube){
    const span=LEVELS[state.level].cube!.size*CELL;
    const distance=(span*1.8+2)/(Math.min(1,camera.aspect)*.66)*zoom*(overview?1.18:1)*(camera.aspect<.8?1:1.15);
    lookAt.lerp(new THREE.Vector3(0,.6,0),1-Math.exp(-4*dt));
    desired.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance).add(lookAt);
    camera.position.lerp(desired,1-Math.exp(-7*dt));camera.lookAt(lookAt);
  }else{
  const map = LEVELS[state.level].map, width = Math.max(...map.map(r => r.length)) * CELL, height = map.length * CELL;
  const fit = Math.max(width / (camera.aspect * .63), height / .67) * 1.24;
  const mobileTerrace = camera.aspect < .8 && !!LEVELS[state.level].jumping;
  const originalChallenge = state.level >= 4 && state.level < 12 || state.level >= 14 && state.level <= 16;
  const robotRoom = !!LEVELS[state.level].robots?.length || !!LEVELS[state.level].rotators?.length;
  const machinery = !!LEVELS[state.level].switches?.length || !!LEVELS[state.level].robots?.length || !!LEVELS[state.level].ice?.length;
  const mobileWholeBoard = camera.aspect < .8 && (machinery || originalChallenge);
  const closeLimit = robotRoom ? Math.max(map.length,...map.map(r=>r.length))*2.5 : originalChallenge ? (state.level >= 14 ? 26 : 24) : mobileTerrace ? 32 : machinery && Math.max(map.length,...map.map(r=>r.length)) >= 9 ? 23 : 17.5;
  const distance = (overview ? fit * 1.12 : mobileWholeBoard ? fit * .82 : Math.min(fit, closeLimit)) * zoom;
  const follow = overview || mobileWholeBoard || robotRoom ? 0 : originalChallenge ? .12 : mobileTerrace ? .15 : camera.aspect < .8 ? .9 : .28;
  lookAt.lerp(new THREE.Vector3(player.position.x * follow, .35 + (robotRoom?0:heightAt(LEVELS[state.level],state.player,state)*TIER_HEIGHT*.55), player.position.z * follow), 1 - Math.exp(-4 * dt));
  desired.set(Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance).add(lookAt);
  camera.position.lerp(desired, 1 - Math.exp(-7 * dt)); camera.lookAt(lookAt);
  }
  if(filmCamera){const c=filmCamera,target=new THREE.Vector3(...c.target as [number,number,number]);camera.position.set(Math.sin(c.yaw)*Math.cos(c.pitch)*c.distance,Math.sin(c.pitch)*c.distance,Math.cos(c.yaw)*Math.cos(c.pitch)*c.distance).add(target);camera.lookAt(target);}
  renderer.render(scene, camera);
}
camera.position.set(0, 15, 13); frameHandle=requestAnimationFrame(render);
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
(window as any).__INK_GAME__ = { openHub, resumeRoom, hub:()=>hub?.snapshot()??null, hubTravel:(id:string)=>hub?.travel(id), state: () => JSON.parse(JSON.stringify(state)), ready: () => ready, animating: () => !!motion || !!state.fall, loadLevel, step: takeStep, undo, playerWorld:()=>player.position.toArray(), robotsWorld:()=>robotArt.map(a=>a.root.position.toArray()), robotRotations:()=>robotArt.map(a=>a.root.rotation.y), cratesWorld:()=>crates.map(c=>c.position.toArray()), solved: () => solved(state), theme: () => dark ? 'black' : 'white', restWeight:()=>rest?.weight??0, soundReady:()=>sound.ready, soundMuted:()=>sound.muted, captureStart:()=>{filming=true;cancelAnimationFrame(frameHandle);clearInput();sound.stop();renderer.setPixelRatio(1);document.body.classList.add('filming');}, captureTick:(dt:number)=>render(previous+dt*1000), captureCamera:(c:typeof filmCamera)=>{filmCamera=c;}, captureTheme:(value:boolean)=>{dark=value;theme();}, capturePose:(rotation:number)=>{player.rotation.y=rotation;}, captureRestBones:()=>['Spine02','Spine01','Spine','Head','LeftFoot','RightFoot'].map(name=>{const b=player.getObjectByName(name)!;return {name,q:b.quaternion.toArray(),position:b.getWorldPosition(new THREE.Vector3()).toArray()};}), captureBones:()=>jumpBones.map(p=>({name:p.bone.name,q:p.bone.quaternion.toArray()})), machinery:()=>cubeView?cubeView.machinerySnapshot(state):({switches:switchArt.map(s=>({channel:s.channel,active:channelActive(LEVELS[state.level],s.channel,state)})),devices:machineArt.length}), levelCount: LEVELS.length, cubeWorld:()=>cubeView?{quaternion:cubeView.root.quaternion.toArray(),face:cubeFace(LEVELS[state.level].cube!.size,state.player),playerQuaternion:player.quaternion.toArray(),crateQuaternions:crates.map(c=>c.quaternion.toArray()),playerScale:player.scale.toArray(),crateScales:crates.map(c=>c.scale.toArray())}:null, iceTiles:()=>(LEVELS[state.level].ice||[]).map(p=>rotationPoint(LEVELS[state.level],p,state)), rotatorsWorld:()=>rotatorArt.map(r=>({position:r.content.position.toArray(),angle:r.content.rotation.y})),padsWorld:()=>pads.map(p=>({point:p.point,world:p.root.getWorldPosition(new THREE.Vector3()).toArray()})), falls: () => falls, art: () => ({ pads: pads.map(p => ({ point: p.point, active: state.boxes.some(b => b.x === p.point.x && b.z === p.point.z) })), exit: solved(state), meshes: renderer.info.render.calls }) };
