import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS,createState,attemptMove,solve,isIce,type State} from '../src/puzzle.ts';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));
const baseline=read('pre-ice-levels');
assert.equal(LEVELS.length,44);
for(let i=0;i<31;i++)assert.deepEqual(LEVELS[i],{...baseline[i],name:({11:'Cargo Exchange',26:'Coupled Circuit'} as Record<number,string>)[i]??baseline[i].name},`Room ${i+1} preserved`);
for(const l of LEVELS)assert.ok(!/\b(final|last)\b/i.test(l.name));
const dirs=[{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}];
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
function exhaust(initial:State,disableStopper=false){
 const queue=[initial],seen=new Set<string>(),level=LEVELS[initial.level];
 const key=(s:State)=>`${s.player.x},${s.player.z}|${s.boxes.map(b=>`${b.x},${b.z}`).sort().join(';')}`;
 seen.add(key(initial));
 for(let c=0;c<queue.length;c++){
  assert.ok(queue.length<350000,'exhaustion proof must finish below guard');const s=queue[c];if(s.won)return {solvable:true,states:queue.length,exhaustive:false};
  for(const d of dirs){const n=attemptMove(s,d.x,d.z);if(!n||n.fall)continue;
   if(disableStopper&&n.boxes.some((b,i)=>distance(b,s.boxes[i])>0&&isIce(level,b)&&n.boxes.some((other,j)=>j!==i&&other.x===b.x+d.x&&other.z===b.z+d.z)))continue;
   const k=key(n);if(!seen.has(k)){seen.add(k);queue.push(n);}
  }
 }return {solvable:false,states:queue.length,exhaustive:true};
}
for(const design of read('ice-room-design')){
 const i=design.room-1,l=LEVELS[i];assert.deepEqual(l,design.level);
 assert.ok(l.ice?.length);assert.equal(new Set(l.ice.map(p=>`${p.x},${p.z}`)).size,l.ice.length);
 for(const p of l.ice)assert.equal(l.map[p.z]?.[p.x],' ','ice is an ordinary floor tile');
 let s=createState(i),playerSlide=0,crateSlide=0;
 const route=solve(s);assert.ok(route);assert.equal(route.length,design.metrics.moves,'shortest-move solver agrees');
 for(const d of design.path){const before=s;s=attemptMove(s,d.x,d.z)!;assert.ok(s&&!s.fall);playerSlide+=Math.max(0,distance(s.player,before.player)-1);s.boxes.forEach((b,j)=>crateSlide+=Math.max(0,distance(b,before.boxes[j])-1));}
 assert.ok(s.won);assert.equal(s.moves,design.metrics.moves);assert.equal(s.pushes,design.metrics.pushes);assert.ok(playerSlide>0&&crateSlide>0,'both actors use ice');
 const w=design.wrongStagingWitness;if(w){let before=createState(i);for(const d of design.path.slice(0,w.afterMoves))before=attemptMove(before,d.x,d.z)!;assert.deepEqual(before,w.before);const after=attemptMove(before,w.action.x,w.action.z)!;assert.ok(after&&!after.fall);assert.deepEqual(after,w.after);assert.deepEqual(exhaust(after),w.proof);}
 if(design.stopperNecessity)assert.deepEqual(exhaust(createState(i),true),design.stopperNecessity);
 console.log(`${design.room} ${l.name}: ${s.moves} moves, ${s.pushes} pushes, ${playerSlide}/${crateSlide} extra player/crate slide cells; design proofs pass`);
}
console.log('Ice chapter solved; first31 layouts preserved; misleading names removed.');
