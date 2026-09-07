import type { Fall, Level, Point, State } from './puzzle.ts';
export type CubeVector=readonly[number,number,number];
export type CubeBasis={u:CubeVector;normal:CubeVector;v:CubeVector};
export type CubePathNode={point:Point;cubeTurn:number};
export type CubeMoveTrace={state:State;playerPath:CubePathNode[];boxPaths:CubePathNode[][]};
export const CUBE_BASES:readonly CubeBasis[]=[
 {u:[1,0,0],normal:[0,1,0],v:[0,0,1]},{u:[0,-1,0],normal:[1,0,0],v:[0,0,1]},
 {u:[-1,0,0],normal:[0,-1,0],v:[0,0,1]},{u:[0,1,0],normal:[-1,0,0],v:[0,0,1]},
 {u:[1,0,0],normal:[0,0,1],v:[0,-1,0]},{u:[1,0,0],normal:[0,0,-1],v:[0,1,0]},
];
const dot=(a:CubeVector,b:CubeVector)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const same=(a:Point,b:Point)=>a.x===b.x&&a.z===b.z;
const cardinal=(dx:number,dz:number)=>Number.isInteger(dx)&&Number.isInteger(dz)&&Math.abs(dx)+Math.abs(dz)===1;
export function cubeFace(size:number,p:Point):number{if(!Number.isInteger(size)||size<1||!Number.isInteger(p.x)||!Number.isInteger(p.z)||p.x<0||p.x>=6*size||p.z<0||p.z>=size)throw new RangeError('Invalid cube cell');return Math.floor(p.x/size);}
export function cubeCellPosition(size:number,p:Point,cell=1):[number,number,number]{const b=CUBE_BASES[cubeFace(size,p)],u=p.x%size-(size-1)/2,v=p.z-(size-1)/2;return[0,1,2].map(i=>cell*(b.normal[i]*size/2+b.u[i]*u+b.v[i]*v))as[number,number,number];}
export function cubeDirection(dx:number,dz:number,turns:number):Point{for(let i=0;i<((turns%4)+4)%4;i++)[dx,dz]=[-dz,dx];return{x:dx,z:dz};}
export function cubeStep(size:number,p:Point,dx:number,dz:number):{point:Point;direction:Point;crossed:boolean}{
 if(!cardinal(dx,dz))throw new RangeError('Cube steps must be cardinal');const face=cubeFace(size,p),u=p.x%size,v=p.z,b=CUBE_BASES[face];
 if(u+dx>=0&&u+dx<size&&v+dz>=0&&v+dz<size)return{point:{x:p.x+dx,z:p.z+dz},direction:{x:dx,z:dz},crossed:false};
 const normal=b.u.map((n,i)=>n*dx+b.v[i]*dz)as unknown as CubeVector,next=CUBE_BASES.findIndex(n=>dot(n.normal,normal)===1),nb=CUBE_BASES[next];
 const center=b.normal.map((n,i)=>n*(size-1)+normal[i]*size+(dx===0?b.u[i]*(2*u+1-size):b.v[i]*(2*v+1-size)))as unknown as CubeVector;
 return{point:{x:next*size+(dot(center,nb.u)+size-1)/2,z:(dot(center,nb.v)+size-1)/2},direction:{x:-dot(b.normal,nb.u)||0,z:-dot(b.normal,nb.v)||0},crossed:true};
}
export function cubeChannelActive(level:Level,channel:number,state:Pick<State,'player'|'boxes'|'robots'>):boolean{return!!level.switches?.some(s=>s.channel===channel&&(same(s,state.player)||state.boxes.some(b=>same(s,b))||state.robots?.some(r=>same(s,r))));}
export function cubeTileAt(level:Level,p:Point,state:Pick<State,'player'|'boxes'|'robots'>):string{const b=level.bridges?.find(b=>same(b,p));if(b&&!cubeChannelActive(level,b.channel,state))return'~';return level.map[p.z]?.[p.x]??'#';}
export function cubeIsIce(level:Level,p:Point):boolean{return!!level.ice?.some(i=>same(i,p));}
const solved=(level:Level,boxes:Point[])=>boxes.length>0&&boxes.every(p=>(level.map[p.z]?.[p.x]??'#')==='.');
function turnAfter(input:Point,current:number,step:{direction:Point;crossed:boolean}){return step.crossed?[0,1,2,3].find(t=>same(cubeDirection(input.x,input.z,t),step.direction))!:current;}
type Slide={path:CubePathNode[];point:Point;direction:Point;cubeTurn:number;fall:Fall;loop:boolean};
function slide(level:Level,state:State,start:Point,direction:Point,input:Point,turn:number,kind:'player'|'box',index=-1):Slide{
 let point={...start},dir={...direction},cubeTurn=turn;const path=[{point:{...point},cubeTurn}],seen=new Set<string>();
 while(cubeIsIce(level,point)){
  const key=`${point.x},${point.z},${dir.x},${dir.z}`;if(seen.has(key))return{path,point,direction:dir,cubeTurn,fall:null,loop:true};seen.add(key);
  const pose=kind==='player'?{...state,player:point}:{...state,boxes:state.boxes.map((b,i)=>i===index?point:b)};
  const next=cubeStep(level.cube!.size,point,dir.x,dir.z),tile=cubeTileAt(level,next.point,pose);
  if(tile==='#'||(tile==='E'&&(kind!=='player'||!solved(level,state.boxes))))break;
  if(state.boxes.some((b,i)=>!(kind==='box'&&i===index)&&same(b,next.point))||state.robots?.some(r=>same(r,next.point))||(kind==='box'&&same(state.player,next.point)))break;
  cubeTurn=turnAfter(input,cubeTurn,next);point=next.point;dir=next.direction;path.push({point:{...point},cubeTurn});
  if(tile==='~')return{path,point,direction:dir,cubeTurn,fall:{kind,index},loop:false};if(tile==='E')break;
  const landed=kind==='player'?{...state,player:point}:{...state,boxes:state.boxes.map((b,i)=>i===index?point:b)},released=bridgeFall(level,landed);
  if(released)return{path,point,direction:dir,cubeTurn,fall:released,loop:false};
 }
 return{path,point,direction:dir,cubeTurn,fall:null,loop:false};
}
function bridgeFall(level:Level,state:State):Fall{const missing=(p:Point)=>!!level.bridges?.some(b=>same(b,p)&&!cubeChannelActive(level,b.channel,state));const box=state.boxes.findIndex(missing);if(box>=0)return{kind:'box',index:box};if(missing(state.player))return{kind:'player',index:-1};return null;}
function simulate(level:Level,state:State,dx:number,dz:number,collect:boolean):CubeMoveTrace|null{
 if(!level.cube||state.won||state.fall||!cardinal(dx,dz))return null;const input={x:dx,z:dz},size=level.cube.size,startTurn=state.cubeTurn??0,local=cubeDirection(dx,dz,startTurn),first=cubeStep(size,state.player,local.x,local.z),tile=cubeTileAt(level,first.point,state);
 if(tile==='#'||(tile==='E'&&!solved(level,state.boxes))||state.robots?.some(r=>same(r,first.point)))return null;const boxIndex=state.boxes.findIndex(p=>same(p,first.point));if(first.crossed&&boxIndex>=0)return null;
 const boxes=state.boxes.map(p=>({...p})),boxPaths=boxes.map(p=>[{point:{...p},cubeTurn:startTurn}]);let fall:Fall=null;
 if(boxIndex>=0){
  const landing=cubeStep(size,first.point,local.x,local.z),landingTile=cubeTileAt(level,landing.point,{...state,boxes});
  if(landingTile==='#'||landingTile==='E'||boxes.some((p,i)=>i!==boxIndex&&same(p,landing.point))||state.robots?.some(r=>same(r,landing.point))||same(state.player,landing.point))return null;
  boxes[boxIndex]=landing.point;const boxTurn=turnAfter(input,startTurn,landing);boxPaths[boxIndex].push({point:{...landing.point},cubeTurn:boxTurn});
  if(landingTile==='~')fall={kind:'box',index:boxIndex};else if(cubeIsIce(level,landing.point)){const result=slide(level,{...state,boxes},landing.point,landing.direction,input,boxTurn,'box',boxIndex);if(result.loop)return null;boxes[boxIndex]=result.point;fall=result.fall;boxPaths[boxIndex]=[{point:{...first.point},cubeTurn:startTurn},...result.path];}
 }
 let player=first.point,cubeTurn=turnAfter(input,startTurn,first),playerPath=[{point:{...state.player},cubeTurn:startTurn},{point:{...player},cubeTurn}];
 if(!fall&&tile==='~')fall={kind:'player',index:-1};else if(!fall&&cubeIsIce(level,player)){const result=slide(level,{...state,player,boxes},player,first.direction,input,cubeTurn,'player');if(result.loop)return null;player=result.point;cubeTurn=result.cubeTurn;fall=result.fall;playerPath=[playerPath[0],...result.path];}
 const moved:State={...state,player,boxes,cubeTurn,moves:state.moves+1,pushes:state.pushes+(boxIndex>=0?1:0),fall,won:false};if(!moved.fall)moved.fall=bridgeFall(level,moved);moved.won=!moved.fall&&cubeTileAt(level,moved.player,moved)==='E'&&solved(level,boxes);
 return{state:moved,playerPath:collect?playerPath:[],boxPaths:collect?boxPaths:[]};
}
export function traceCubeMove(level:Level,state:State,dx:number,dz:number):CubeMoveTrace|null{return simulate(level,state,dx,dz,true);}
export function attemptCubeMove(level:Level,state:State,dx:number,dz:number):State|null{return simulate(level,state,dx,dz,false)?.state??null;}
