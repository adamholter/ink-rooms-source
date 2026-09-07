import { attemptMove, targetPoints, LEVELS, type State } from '../../src/puzzle.ts';

const directions = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
const same = (a:{x:number;z:number}, b:{x:number;z:number}) => a.x===b.x && a.z===b.z;
const key = (s:State) => JSON.stringify([s.player,s.boxes.map(b=>`${b.x},${b.z}`).sort(),s.rotations]);

// Zero-cost walking and turning prevent long corridors from inflating difficulty.
export function minimumPushes(initial:State):number {
  const buckets:State[][] = [[initial]], best = new Map([[key(initial),0]]);
  for(let cost=0;cost<buckets.length;cost++) {
    const queue=buckets[cost]||[];
    for(let cursor=0;cursor<queue.length;cursor++) {
      const state=queue[cursor];
      if(best.get(key(state))!==cost) continue;
      if(state.won) return cost;
      for(const d of directions) {
        const next=attemptMove(state,d.x,d.z);
        if(!next||next.fall) continue;
        const price=cost+next.pushes-state.pushes, id=key(next);
        if((best.get(id)??Infinity)<=price) continue;
        best.set(id,price); (buckets[price]??=[]).push(next);
      }
      if(best.size>=350000) throw Error('Minimum-push proof exceeded budget');
    }
  }
  throw Error('No winning route');
}

// Exhaust every route that leaves filled marks alone. If none wins, temporary
// parking is necessary in every solution, not merely in our recorded route.
export function permanentGoalProof(initial:State) {
  const level=LEVELS[initial.level], queue=[initial], seen=new Set([key(initial)]);
  for(let cursor=0;cursor<queue.length;cursor++) {
    const state=queue[cursor];
    if(state.won) return {unsolvable:false,states:seen.size};
    for(const d of directions) {
      const next=attemptMove(state,d.x,d.z);
      if(!next||next.fall) continue;
      const unturned=attemptMove(state,d.x,d.z,true,false)!;
      const goals=targetPoints(level,state);
      if(state.boxes.some((box,i)=>goals.some(goal=>same(box,goal))&&!same(box,unturned.boxes[i]))) continue;
      const id=key(next);
      if(!seen.has(id)) { seen.add(id); queue.push(next); }
    }
    if(seen.size>=350000) throw Error('Temporary-parking proof exceeded budget');
  }
  return {unsolvable:true,states:seen.size,exhaustive:true};
}
