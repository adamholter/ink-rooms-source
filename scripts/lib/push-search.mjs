// Independent push-space search for design assessment. No downloaded puzzle input.
export const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
export function boardFromRows(rows) {
  const cells=[], at=new Map(), goals=[], boxes=[]; let player=-1;
  rows.forEach((row,z)=>[...row].forEach((c,x)=>{if(!'#~E'.includes(c)){const i=cells.length;cells.push({x,z});at.set(`${x},${z}`,i);if(c==='.')goals.push(i);if(c==='$')boxes.push(i);if(c==='@')player=i;}}));
  const adj=cells.map(({x,z})=>dirs.map(([dx,dz])=>at.get(`${x+dx},${z+dz}`)??-1));
  return {cells,adj,goals,boxes,player,n:cells.length};
}
export function reach(b,player,boxes) {
  const used=new Uint8Array(b.n); for(const p of boxes)used[p]=2;
  const q=[player];used[player]=1;let canonical=player;
  for(let i=0;i<q.length;i++)for(const p of b.adj[q[i]])if(p>=0&&!used[p]){used[p]=1;q.push(p);if(p<canonical)canonical=p;}
  return {used,canonical};
}
export function legalPushes(b,player,boxes,reverse=false,dead=null){
  const {used}=reach(b,player,boxes), moves=[];
  for(let i=0;i<boxes.length;i++)for(let d=0;d<4;d++){
    const box=boxes[i],to=b.adj[box][d],behind=reverse?to:b.adj[box][(d+2)%4],stand=reverse&&to>=0?b.adj[to][d]:behind;
    if(to<0||stand<0||used[stand]!==1||used[to]===2||used[behind]!==1||dead?.has(to))continue;
    const next=boxes.slice();next[i]=to;moves.push({boxes:next,player:reverse?stand:box,box:i,dir:d,from:box,to});
  }
  return moves;
}
export function deadCells(b){
  const seen=new Set(b.goals),q=[...seen];
  for(let i=0;i<q.length;i++)for(let d=0;d<4;d++){const from=b.adj[q[i]][d],stand=from<0?-1:b.adj[from][d];if(from>=0&&stand>=0&&!seen.has(from)){seen.add(from);q.push(from);}}
  return new Set(b.cells.map((_,i)=>i).filter(i=>!seen.has(i)));
}
function boxCode(b,boxes){let code=0;for(const p of [...boxes].sort((a,c)=>a-c))code=code*b.n+p;return code;}
export function assignmentDistance(b,boxes){
  const dist=b.goals.map(goal=>{const a=Array(b.n).fill(1e6),q=[goal];a[goal]=0;for(let j=0;j<q.length;j++)for(const p of b.adj[q[j]])if(p>=0&&a[p]===1e6){a[p]=a[q[j]]+1;q.push(p);}return a;});
  function perm(i,mask){if(i===boxes.length)return 0;let best=1e6;for(let g=0;g<dist.length;g++)if(!(mask&(1<<g)))best=Math.min(best,dist[g][boxes[i]]+perm(i+1,mask|1<<g));return best;}
  return perm(0,0);
}
export function search(b,options={}){
  const dead=deadCells(b); if(b.boxes.some(p=>dead.has(p)))return null;
  const start={boxes:b.boxes,player:b.player,parent:-1,edge:null,depth:0};
  const nodes=[start], seen=new Map(), edges=options.graph?[]:null;
  const key=(p,boxes)=>boxCode(b,boxes)*b.n+reach(b,p,boxes).canonical;
  seen.set(key(start.player,start.boxes),0);const goalSet=new Set(b.goals);let winning=-1, expanded=0;
  for(let c=0;c<nodes.length;c++){
    if(nodes.length>(options.cap??100000))return {capped:true,states:nodes.length};
    const node=nodes[c];if(node.boxes.every(p=>goalSet.has(p))){if(winning<0)winning=c;if(!options.graph)break;}
    const nexts=legalPushes(b,node.player,node.boxes,false,dead);expanded++;
    if(edges)edges[c]=[];
    for(const move of nexts){const k=key(move.player,move.boxes);let index=seen.get(k);if(index===undefined){index=nodes.length;seen.set(k,index);nodes.push({boxes:move.boxes,player:move.player,parent:c,edge:move,depth:node.depth+1});}if(edges)edges[c].push(index);}
  }
  if(winning<0)return null;
  const path=[];for(let i=winning;nodes[i].parent>=0;i=nodes[i].parent)path.push(nodes[i].edge);path.reverse();
  const switches=path.slice(1).filter((p,i)=>p.box!==path[i].box).length;
  const turns=path.slice(1).filter((p,i)=>p.box===path[i].box&&p.dir!==path[i].dir).length;
  const visits=Array.from({length:b.boxes.length},()=>new Set());b.boxes.forEach((p,i)=>visits[i].add(p));let revisits=0;for(const e of path){if(visits[e.box].has(e.to))revisits++;visits[e.box].add(e.to);}
  let targetReleases=0;for(const e of path)if(goalSet.has(e.from))targetReleases++;
  const lower=assignmentDistance(b,b.boxes);
  const result={pushes:path.length,lowerBound:lower,detour:path.length-lower,pushesPerCell:path.length/b.n,crateSwitches:switches,turns,revisits,targetReleases,states:seen.size,expanded,path};
  if(edges){
    const incoming=nodes.map(()=>[]);edges.forEach((es,i)=>es.forEach(j=>incoming[j].push(i)));
    const win=new Uint8Array(nodes.length),q=[];
    nodes.forEach((n,i)=>{if(n.boxes.every(p=>goalSet.has(p))){win[i]=1;q.push(i);}});
    for(let c=0;c<q.length;c++)for(const i of incoming[q[c]])if(!win[i]){win[i]=1;q.push(i);}
    const chosen=[];for(let i=winning;i>=0;i=nodes[i].parent)chosen.push(i);chosen.reverse();
    let decisions=0,traps=0;const trapExamples=[];
    for(const i of chosen.slice(0,-1)){const moves=legalPushes(b,nodes[i].player,nodes[i].boxes,false,dead);if(moves.length>1)decisions++;for(const move of moves){const j=seen.get(key(move.player,move.boxes));if(!win[j]){traps++;if(trapExamples.length<4){const chain=[];for(let k=i;nodes[k].parent>=0;k=nodes[k].parent)chain.push(nodes[k].edge);trapExamples.push([...chain.reverse(),move]);}}}}
    Object.assign(result,{reachableStates:nodes.length,solvableStates:q.length,choicePositions:decisions,nonCornerDeadlockChoices:traps,trapExamples});
  }
  return result;
}
export function movesFromPushes(b,path){
 let p=b.player,boxes=b.boxes.slice(),result='';
 for(const edge of path){const goal=b.adj[boxes[edge.box]][(edge.dir+2)%4],used=new Set(boxes),q=[p],parent=new Map([[p,null]]);
 for(let c=0;c<q.length&&!parent.has(goal);c++)for(let d=0;d<4;d++){const to=b.adj[q[c]][d];if(to>=0&&!used.has(to)&&!parent.has(to)){parent.set(to,[q[c],d]);q.push(to);}}
 if(!parent.has(goal))throw Error('No route to push');const walk=[];for(let v=goal;parent.get(v);v=parent.get(v)[0])walk.push('URDL'[parent.get(v)[1]]);result+=walk.reverse().join('')+'URDL'[edge.dir];p=boxes[edge.box];boxes[edge.box]=edge.to;
 }return result;
}
// Can crates be delivered one at a time, never touching a finished crate again?
// Extra state tracks the active crate position and frozen goal positions, independent of box identity.
export function serialSearch(b,cap=100000){
 const dead=deadCells(b),goals=new Set(b.goals),q=[{boxes:b.boxes,player:b.player,active:-1,frozen:[],pushes:0}],seen=new Set();
 const key=n=>boxCode(b,n.boxes)+':'+reach(b,n.player,n.boxes).canonical+':'+n.active+':'+n.frozen.slice().sort((a,c)=>a-c).join(',');seen.add(key(q[0]));
 for(let i=0;i<q.length&&q.length<=cap;i++){
  const n=q[i];if(n.boxes.every(p=>goals.has(p)))return{pushes:n.pushes,states:q.length};
  for(const m of legalPushes(b,n.player,n.boxes,false,dead)){
   if(n.frozen.includes(m.from))continue;let frozen=n.frozen;
   if(n.active>=0&&m.from!==n.active){if(!goals.has(n.active))continue;frozen=[...frozen,n.active];}
   const next={boxes:m.boxes,player:m.player,active:m.to,frozen,pushes:n.pushes+1},k=key(next);
   if(!seen.has(k)){seen.add(k);q.push(next);}
  }
 }return q.length>cap?{capped:true}:null;
}
