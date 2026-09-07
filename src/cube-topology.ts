import type { Level, Point, State } from './puzzle.ts';

export type CubeVector = readonly [number, number, number];
export type CubeBasis = { u: CubeVector; normal: CubeVector; v: CubeVector };
// u × normal = v. Atlas order: top, right, bottom, left, front, back.
export const CUBE_BASES: readonly CubeBasis[] = [
  { u: [1,0,0], normal: [0,1,0], v: [0,0,1] },
  { u: [0,-1,0], normal: [1,0,0], v: [0,0,1] },
  { u: [-1,0,0], normal: [0,-1,0], v: [0,0,1] },
  { u: [0,1,0], normal: [-1,0,0], v: [0,0,1] },
  { u: [1,0,0], normal: [0,0,1], v: [0,-1,0] },
  { u: [1,0,0], normal: [0,0,-1], v: [0,1,0] },
];
const dot = (a: CubeVector, b: CubeVector) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const same = (a: Point, b: Point) => a.x===b.x && a.z===b.z;
const cardinal = (dx: number, dz: number) => Number.isInteger(dx) && Number.isInteger(dz) && Math.abs(dx)+Math.abs(dz)===1;
export function cubeFace(size: number, p: Point): number {
  if (!Number.isInteger(size)||size<1||!Number.isInteger(p.x)||!Number.isInteger(p.z)||p.x<0||p.x>=6*size||p.z<0||p.z>=size) throw new RangeError('Invalid cube cell');
  return Math.floor(p.x/size);
}
export function cubeCellPosition(size: number, p: Point, cell=1): [number,number,number] {
  const b=CUBE_BASES[cubeFace(size,p)], u=p.x%size-(size-1)/2, v=p.z-(size-1)/2;
  return [0,1,2].map(i=>cell*(b.normal[i]*size/2+b.u[i]*u+b.v[i]*v)) as [number,number,number];
}
export function cubeDirection(dx: number, dz: number, turns: number): Point {
  for(let i=0;i<((turns%4)+4)%4;i++) [dx,dz]=[-dz,dx];
  return {x:dx,z:dz};
}
export function cubeStep(size: number, p: Point, dx: number, dz: number): {point:Point;direction:Point;crossed:boolean} {
  if(!cardinal(dx,dz)) throw new RangeError('Cube steps must be cardinal');
  const face=cubeFace(size,p), u=p.x%size, v=p.z, b=CUBE_BASES[face];
  if(u+dx>=0&&u+dx<size&&v+dz>=0&&v+dz<size) return {point:{x:p.x+dx,z:p.z+dz},direction:{x:dx,z:dz},crossed:false};
  const normal=b.u.map((n,i)=>n*dx+b.v[i]*dz) as unknown as CubeVector;
  const next=CUBE_BASES.findIndex(n=>dot(n.normal,normal)===1), nb=CUBE_BASES[next];
  // Integer half-cell units keep seams exact, including reversed edge order.
  const center=b.normal.map((n,i)=>n*(size-1)+normal[i]*size+(dx===0?b.u[i]*(2*u+1-size):b.v[i]*(2*v+1-size))) as unknown as CubeVector;
  return {point:{x:next*size+(dot(center,nb.u)+size-1)/2,z:(dot(center,nb.v)+size-1)/2}, direction:{x:-dot(b.normal,nb.u)||0,z:-dot(b.normal,nb.v)||0},crossed:true};
}
export function attemptCubeMove(level: Level, state: State, dx: number, dz: number): State|null {
  if(!level.cube||state.won||state.fall||!cardinal(dx,dz)) return null;
  const size=level.cube.size, local=cubeDirection(dx,dz,state.cubeTurn??0);
  const step=cubeStep(size,state.player,local.x,local.z), at=(p:Point)=>level.map[p.z]?.[p.x]??'#';
  const solved=(boxes:Point[])=>boxes.length>0&&boxes.every(p=>at(p)==='.');
  const tile=at(step.point);
  if(tile==='#'||tile==='~'||(tile==='E'&&!solved(state.boxes))||state.robots?.some(r=>same(r,step.point)))return null;
  const boxIndex=state.boxes.findIndex(p=>same(p,step.point));
  // A player cannot initiate a push onto a different face, even if space exists beyond it.
  if(step.crossed&&boxIndex>=0)return null;
  const boxes=state.boxes.map(p=>({...p}));
  if(boxIndex>=0){
    const landing=cubeStep(size,step.point,local.x,local.z).point;
    if(['#','~','E'].includes(at(landing))||boxes.some((p,i)=>i!==boxIndex&&same(p,landing))||state.robots?.some(r=>same(r,landing))||same(state.player,landing))return null;
    boxes[boxIndex]=landing;
  }
  let cubeTurn=state.cubeTurn??0;
  if(step.crossed) cubeTurn=[0,1,2,3].find(t=>same(cubeDirection(dx,dz,t),step.direction))!;
  return {...state,player:step.point,boxes,cubeTurn,moves:state.moves+1,pushes:state.pushes+(boxIndex>=0?1:0),fall:null,won:tile==='E'&&solved(boxes)};
}
