import assert from 'node:assert/strict';
import { CUBE_BASES, cubeCellPosition, cubeDirection, cubeFace, cubeStep, attemptCubeMove } from '../src/cube-topology.ts';
import type { Level, Point, State } from '../src/puzzle.ts';
const dirs=[{x:1,z:0},{x:0,z:1},{x:-1,z:0},{x:0,z:-1}];
const same=(a:Point,b:Point)=>a.x===b.x&&a.z===b.z;
let seams=0;
for(const size of [1,2,3,4,5])for(let face=0;face<6;face++)for(let u=0;u<size;u++)for(let v=0;v<size;v++)for(const d of dirs){
  const p={x:face*size+u,z:v}, s=cubeStep(size,p,d.x,d.z);
  assert.equal(Math.abs(s.direction.x)+Math.abs(s.direction.z),1);
  assert.equal(s.crossed,cubeFace(size,s.point)!==face);
  const reverse=cubeStep(size,s.point,-s.direction.x,-s.direction.z);
  assert.deepEqual(reverse.point,p);
  assert.ok(same(reverse.direction,{x:-d.x,z:-d.z}));
  const a=cubeCellPosition(size,p), b=cubeCellPosition(size,s.point);
  const distance=a.reduce((sum,n,i)=>sum+(n-b[i])**2,0);
  assert.equal(distance,s.crossed?0.5:1);
  if(s.crossed)seams++;
  let point=p, direction=d;
  for(let i=0;i<4*size;i++){const next=cubeStep(size,point,direction.x,direction.z);point=next.point;direction=next.direction;}
  assert.deepEqual(point,p,'four-face great circle returns to start');
  assert.ok(same(direction,d));
}
assert.equal(seams,24*(1+2+3+4+5));
assert.throws(()=>cubeStep(3,{x:0,z:0},1,1));
for(let t=0;t<4;t++)for(const d of dirs)assert.ok(same(cubeDirection(cubeDirection(d.x,d.z,t).x,cubeDirection(d.x,d.z,t).z,4-t),d));
for(const b of CUBE_BASES){const cross=[b.u[1]*b.normal[2]-b.u[2]*b.normal[1],b.u[2]*b.normal[0]-b.u[0]*b.normal[2],b.u[0]*b.normal[1]-b.u[1]*b.normal[0]];assert.ok(cross.every((n,i)=>n===b.v[i]));}
const size=3;
function fixture(player:Point,boxes:Point[]=[],tiles:{p:Point;t:string}[]=[]):{level:Level;state:State}{
  const map=Array.from({length:size},()=>Array(6*size).fill(' '));
  for(const {p,t} of tiles)map[p.z][p.x]=t;
  return {level:{name:'Test',subtitle:'',hint:'',cube:{size},map:map.map(r=>r.join(''))},state:{level:0,player,boxes,moves:0,pushes:0,won:false,fall:null,cubeTurn:0}};
}
// Verify input transport for every seam and every camera orientation.
for(let f=0;f<6;f++)for(const local of dirs)for(let t=0;t<4;t++){
  const p={x:f*size+(local.x===1?2:local.x===-1?0:1),z:local.z===1?2:local.z===-1?0:1};
  const {level,state}=fixture(p);state.cubeTurn=t;
  const world=cubeDirection(local.x,local.z,-t), expected=cubeStep(size,p,local.x,local.z);
  const moved=attemptCubeMove(level,state,world.x,world.z)!;
  assert.deepEqual(moved.player,expected.point);
  assert.ok(same(cubeDirection(world.x,world.z,moved.cubeTurn!),expected.direction));
  const back=attemptCubeMove(level,moved,-world.x,-world.z)!;assert.deepEqual(back.player,p);assert.equal(back.cubeTurn,t);
  const blocked=fixture(p,[expected.point]);blocked.state.cubeTurn=t;
  assert.equal(attemptCubeMove(blocked.level,blocked.state,world.x,world.z),null,'cross-face crate blocks player');
}
const crate={x:2,z:1}, destination=cubeStep(size,crate,1,0).point;
{
 const {level,state}=fixture({x:1,z:1},[crate,{x:12,z:0}],[{p:destination,t:'.'}]);const before=JSON.stringify(state);
 const moved=attemptCubeMove(level,state,1,0)!;assert.deepEqual(moved.player,crate);assert.deepEqual(moved.boxes,[destination,{x:12,z:0}]);assert.equal(moved.pushes,1);assert.equal(moved.moves,1);assert.equal(moved.cubeTurn,0);assert.equal(moved.fall,null);assert.equal(JSON.stringify(state),before);
 assert.equal(attemptCubeMove(level,moved,1,0),null,'cannot follow crate across seam');
}
for(const t of ['#','~','E']){const {level,state}=fixture({x:1,z:1},[crate],[{p:destination,t}]);assert.equal(attemptCubeMove(level,state,1,0),null);}
{const {level,state}=fixture({x:1,z:1},[crate,destination]);assert.equal(attemptCubeMove(level,state,1,0),null);}
{const {level,state}=fixture(crate,[],[{p:destination,t:'#'}]);assert.equal(attemptCubeMove(level,state,1,0),null);}
{const goal={x:12,z:2}, {level,state}=fixture(crate,[goal],[{p:goal,t:'.'},{p:destination,t:'E'}]);const won=attemptCubeMove(level,state,1,0)!;assert.equal(won.won,true);assert.equal(attemptCubeMove(level,won,1,0),null);state.boxes=[{x:13,z:2}];assert.equal(attemptCubeMove(level,state,1,0),null);}
console.log(`Cube topology/rules passed: ${seams} directed seam cells, reversible transport, circuits, camera turns, cross-face crates, walls, exits, purity.`);
