import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { LEVELS } from "../src/puzzle.ts";

type Source = { id: string; name: string; author: string; url: string; format?: "slc"|"xsb" };
type Cell = { x: number; y: number; kind: string };
type Parsed = { source: Source; number: number; title: string; cells: Cell[] };
const here = fileURLToPath(new URL(".", import.meta.url));
const dataDir = fileURLToPath(new URL("./audit-data/", import.meta.url));
const corpusDir = `${dataDir}corpus`;
const sources: Source[] = JSON.parse(await readFile(`${dataDir}sources.json`, "utf8"));
const offline = process.argv.includes("--offline");
const failOnMatch = process.argv.includes("--fail-on-match");
const candidatesArg=process.argv.find(a=>a.startsWith("--candidates="))?.slice("--candidates=".length);
const trialsArg=process.argv.find(a=>a.startsWith("--trials="))?.slice("--trials=".length);
const idsArg=process.argv.find(a=>a.startsWith("--ids="))?.slice("--ids=".length);
const reportPrefix=process.argv.find(a=>a.startsWith("--report-prefix="))?.slice("--report-prefix=".length)||"originality-report";
await mkdir(corpusDir, { recursive: true });

function decodeXml(s: string) {
  return s.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
}
function playableCells(rows:string[]):Cell[]{
  const cells:Cell[] = [], width=Math.max(...rows.map(r=>r.length)), height=rows.length;
  const at=(x:number,y:number)=>x<0||y<0||x>=width||y>=height?" ":(rows[y][x]||" ");
  const outside=new Set<string>(), queue:[number,number][]=[[-1,-1]];
  for(let q=0;q<queue.length;q++){
    const [x,y]=queue[q], k=`${x},${y}`; if(outside.has(k)||at(x,y)==="#")continue;
    outside.add(k);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx>=-1&&ny>=-1&&nx<=width&&ny<=height)queue.push([nx,ny]);}
  }
  rows.forEach((row,y)=>[...row.padEnd(width)].forEach((raw,x)=>{if(raw!=="#"&&!outside.has(`${x},${y}`))cells.push({x,y,kind:"$.*@+".includes(raw)?raw:" "});}));
  return cells;
}
function parseSlc(source: Source, xml: string): Parsed[] {
  const out: Parsed[] = [];
  for (const match of xml.matchAll(/<Level\b([^>]*)>([\s\S]*?)<\/Level>/gi)) {
    const attrs = match[1], body = match[2];
    const rows = [...body.matchAll(/<L>([\s\S]*?)<\/L>/gi)].map(m => decodeXml(m[1]));
    if (!rows.length) continue;
    // Walls and exterior whitespace are blocked. This catches a copied room
    // whose perimeter wall was later rendered as open void.
    const cells=playableCells(rows);
    const id = /\bId="([^"]*)"/i.exec(attrs)?.[1] || String(out.length + 1);
    out.push({ source, number: out.length + 1, title: decodeXml(id), cells });
  }
  return out;
}
function parseXsb(source: Source, text: string): Parsed[] {
  const out: Parsed[]=[]; let title=""; let rows:string[]=[];
  const flush=()=>{ if(!rows.length)return; const cells=playableCells(rows); out.push({source,number:out.length+1,title:title||String(out.length+1),cells}); rows=[]; };
  for(const line of text.split(/\r?\n/)){ if(line.startsWith(";")){flush();title=line.slice(1).trim();} else if(line.trim()==="")flush(); else if(/^[ #.$@+*_-]+$/.test(line))rows.push(line.replaceAll("_"," ").replaceAll("-"," ")); }
  flush(); return out;
}
function localCells(map: string[]): Cell[] {
  const cells: Cell[] = [];
  map.forEach((row, y) => [...row].forEach((raw, x) => {
    if (raw === "#" || raw === "~") return;
    // Exit cells are an Ink Rooms wrapper around each puzzle, not Sokoban
    // geometry, so exclude them from collision checks.
    if (raw !== "E") cells.push({ x, y, kind: raw });
  }));
  return cells;
}
const variantCache=new WeakMap<Cell[],Cell[][]>();
function variants(cells: Cell[]): Cell[][] {
  const cached=variantCache.get(cells); if(cached)return cached;
  const raw = [
    (x:number,y:number):[number,number]=>[x,y], (x:number,y:number):[number,number]=>[-x,y],
    (x:number,y:number):[number,number]=>[x,-y], (x:number,y:number):[number,number]=>[-x,-y],
    (x:number,y:number):[number,number]=>[y,x], (x:number,y:number):[number,number]=>[-y,x],
    (x:number,y:number):[number,number]=>[y,-x], (x:number,y:number):[number,number]=>[-y,-x],
  ];
  const result=raw.map(fn => {
    const t = cells.map(c => { const [x,y]=fn(c.x,c.y); return {...c,x,y}; });
    const minX=Math.min(...t.map(c=>c.x)), minY=Math.min(...t.map(c=>c.y));
    return t.map(c=>({...c,x:c.x-minX,y:c.y-minY}));
  });
  variantCache.set(cells,result); return result;
}
function cellKind(kind: string, mode: string): string {
  if (mode === "floor") return "f";
  const target = kind === "." || kind === "*" || kind === "+";
  const box = kind === "$" || kind === "*";
  const player = kind === "@" || kind === "+";
  if (mode === "structure") return target ? "t" : "f";
  if (mode === "pieces") return `${target?"t":"f"}${box?"b":""}`;
  return `${target?"t":"f"}${box?"b":""}${player?"p":""}`;
}
const setCache=new WeakMap<Cell[],Map<string,Set<string>>>();
function coordinateSet(cells:Cell[],mode:string){let modes=setCache.get(cells);if(!modes){modes=new Map();setCache.set(cells,modes);}let set=modes.get(mode);if(!set){set=new Set(cells.map(c=>`${c.x},${c.y}:${cellKind(c.kind,mode)}`));modes.set(mode,set);}return set;}
function key(cells: Cell[], mode: string) {
  return cells.map(c=>`${c.x},${c.y}:${cellKind(c.kind,mode)}`).sort().join("|");
}
function canonical(cells: Cell[], mode: string) { return variants(cells).map(v=>key(v,mode)).sort()[0]; }
function dims(cells: Cell[]) { return [Math.max(...cells.map(c=>c.x))+1,Math.max(...cells.map(c=>c.y))+1]; }
function similarity(a: Cell[], b: Cell[], mode: string): number {
  let best=0; if(Math.min(a.length,b.length)/Math.max(a.length,b.length)<0.82)return 0;
  const an=variants(a)[0];
  for (const v of variants(b)) {
    const [aw,ah]=dims(an), [bw,bh]=dims(v); if(Math.abs(aw-bw)>2||Math.abs(ah-bh)>2)continue;
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      const bk=coordinateSet(v,mode);
      let common=0; for(const c of an) if(bk.has(`${c.x-dx},${c.y-dy}:${cellKind(c.kind,mode)}`))common++;
      best=Math.max(best,common/(an.length+v.length-common));
    }
  }
  return best;
}

// Guard the comparison itself: translation, rotation, reflection, and a
// one-cell near variant must remain detectable if the implementation changes.
{
  const shape:Cell[]=[{x:4,y:7,kind:"@"},{x:5,y:7,kind:"$"},{x:6,y:7,kind:"."},{x:4,y:8,kind:" "},{x:4,y:9,kind:" "}];
  const rotated=shape.map(c=>({...c,x:-c.y+20,y:c.x+3}));
  const reflected=shape.map(c=>({...c,x:-c.x+20,y:c.y-2}));
  assert.equal(canonical(shape,"complete"),canonical(rotated,"complete"));
  assert.equal(canonical(shape,"complete"),canonical(reflected,"complete"));
  const near=[...shape,{x:5,y:8,kind:" "}]; assert.ok(similarity(shape,near,"floor")>=0.82);
}

const corpus: Parsed[]=[]; const sourceStats=[];
for (const source of sources) {
  let xml: string;
  const extension=source.format==="xsb"?"xsb":"slc";
  if (offline) xml=await readFile(`${corpusDir}/${source.id}.${extension}`,"utf8");
  else { const response=await fetch(source.url); if(!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`); xml=await response.text(); }
  const levels=source.format==="xsb"?parseXsb(source,xml):parseSlc(source,xml); corpus.push(...levels);
  const sha256=createHash("sha256").update(xml).digest("hex");
  await writeFile(`${corpusDir}/${source.id}.${extension}`,xml);
  sourceStats.push({...source,entries:levels.length,sha256});
}
const modes=["floor","structure","pieces","complete"];
const indexes=Object.fromEntries(modes.map(mode=>[mode,new Map<string,Parsed[]>()])) as Record<string,Map<string,Parsed[]>>;
for(const p of corpus) for(const mode of modes) { const k=canonical(p.cells,mode); indexes[mode].set(k,[...(indexes[mode].get(k)||[]),p]); }
let auditLevels:{name:string,map:string[]}[]=LEVELS;
if(candidatesArg){
  const input=JSON.parse(await readFile(candidatesArg,"utf8"));
  const candidates=Array.isArray(input)?input:(input.rooms||[]);
  const wanted=trialsArg?new Set(trialsArg.split(",").map(Number)):null;
  const wantedIds=idsArg?new Set(idsArg.split(",")):null;
  auditLevels=candidates.filter((c:any)=>(!wanted||wanted.has(c.trial))&&(!wantedIds||wantedIds.has(c.id))).map((c:any)=>{const v=c.level||c;return{name:c.id||v.name||`trial ${c.trial}`,map:v.rows||v.map};});
}
const rooms=auditLevels.map((level,index)=>{
  const cells=localCells(level.map); const exact:any={};
  for(const mode of modes) exact[mode]=(indexes[mode].get(canonical(cells,mode))||[]).map(p=>({collection:p.source.name,author:p.source.author,level:p.number,title:p.title}));
  const near=corpus.filter(p=>p.cells.length>0).map(p=>({
    collection:p.source.name,author:p.source.author,level:p.number,title:p.title,
    floor:similarity(cells,p.cells,"floor"), pieces:similarity(cells,p.cells,"pieces")
  })).filter(x=>x.floor>=0.82 || x.pieces>=0.82).sort((a,b)=>Math.max(b.floor,b.pieces)-Math.max(a.floor,a.pieces)).slice(0,8).map(x=>({...x,floor:Number(x.floor.toFixed(3)),pieces:Number(x.pieces.toFixed(3))}));
  return {room:index+1,name:level.name,cellCount:cells.length,exact,near};
});
const uniqueComplete=new Set(corpus.map(p=>canonical(p.cells,"complete"))).size;
const internalPairs:any[]=[];
for(let i=0;i<auditLevels.length;i++)for(let j=i+1;j<auditLevels.length;j++){
  const a=localCells(auditLevels[i].map),b=localCells(auditLevels[j].map);
  const floorRaw=similarity(a,b,"floor"),piecesRaw=similarity(a,b,"pieces");
  const exactFloor=canonical(a,"floor")===canonical(b,"floor"),exactComplete=canonical(a,"complete")===canonical(b,"complete");
  if(exactFloor||exactComplete||floorRaw>=0.82||piecesRaw>=0.82)internalPairs.push({a:{room:i+1,name:auditLevels[i].name},b:{room:j+1,name:auditLevels[j].name},exactFloor,exactComplete,floor:Number(floorRaw.toFixed(3)),pieces:Number(piecesRaw.toFixed(3))});
}
const report={generatedAt:new Date().toISOString(),method:{symmetry:"translation plus all 8 rotations/reflections",exactModes:{floor:"playable-cell geometry only",structure:"geometry plus target positions",pieces:"geometry, targets, and crates",complete:"geometry, targets, crates, and player"},near:"Jaccard similarity after symmetry and translations up to one cell; normalized dimensions may differ by up to two cells; reported at an unrounded score >= 0.82",limitations:"Finite public corpus. A clean result does not prove internet-wide uniqueness."},corpus:{entries:corpus.length,uniqueComplete,sources:sourceStats},rooms,internalPairs};
await writeFile(`${dataDir}${reportPrefix}.json`,JSON.stringify(report,null,2)+"\n");
const flagged=rooms.filter(r=>modes.some(m=>r.exact[m].length));
let md=`# Ink Rooms originality audit\n\nGenerated ${report.generatedAt}. Compared ${rooms.length} rooms with ${corpus.length} entries (${uniqueComplete} unique complete layouts) from ${sources.length} attributed collections.\n\nExact comparison removes translation and checks all eight rotations/reflections. Floor matches ignore all pieces. Structure adds targets. Pieces adds crates. Complete adds player start. Near matches use Jaccard overlap after symmetry and translations of up to one cell. Dimensions may differ by up to two cells. The review threshold is an unrounded score of 0.82.\n\nThis is a finite-corpus collision check, not proof of internet-wide uniqueness.\n\n## Exact matches\n\n`;
for(const r of flagged){ md+=`- Room ${r.room}, ${r.name}: `+modes.filter(m=>r.exact[m].length).map(m=>`${m} -> ${r.exact[m].map((x:any)=>`${x.collection} ${x.level}`).join(", ")}`).join("; ")+"\n"; }
if(!flagged.length) md+="No exact matches in the checked corpus.\n";
md+=`\n## Near-match review queue\n\n`;
const review=rooms.flatMap(r=>r.near.filter((n:any)=>!r.exact.floor.some((e:any)=>e.collection===n.collection&&e.level===n.level)).map((n:any)=>({room:r.room,name:r.name,...n})));
if(review.length) for(const n of review) md+=`- Room ${n.room}, ${n.name}: ${n.collection} ${n.level}, floor ${n.floor.toFixed(3)}, pieces ${n.pieces.toFixed(3)}\n`;
else md+=`No non-exact candidate reached the 0.82 review threshold.\n`;
md+=`\n## Internal similarity review\n\n`;
if(internalPairs.length)for(const p of internalPairs)md+=`- Room ${p.a.room}, ${p.a.name} vs room ${p.b.room}, ${p.b.name}: floor ${p.floor.toFixed(3)}, pieces ${p.pieces.toFixed(3)}, exact floor ${p.exactFloor}, exact complete ${p.exactComplete}\n`;
else md+=`No internal pair reached the review threshold and no exact internal collision was found.\n`;
md+=`\n## Corpus\n\n`+sourceStats.map(s=>`- ${s.name}, ${s.author}: ${s.entries} entries, SHA-256 ${s.sha256}`).join("\n")+"\n";
await writeFile(`${dataDir}${reportPrefix}.md`,md);
console.log(`Audited ${rooms.length} rooms against ${corpus.length} entries (${uniqueComplete} unique). ${flagged.length} rooms have an exact match in at least one mode.`);
for(const r of flagged) console.log(`Room ${r.room} ${r.name}: ${modes.filter(m=>r.exact[m].length).join(", ")}`);
const gatedInternal=internalPairs.filter(p=>((p.a.room>=5&&p.b.room<=17)||p.a.room===26||p.b.room===26||p.b.room>=28)&&(p.exactFloor||p.exactComplete||p.floor>=0.82||p.pieces>=0.82));
const gatedPublic=rooms.filter(r=>(r.room===26||r.room>=28)&&r.near.length);
if(failOnMatch && (flagged.length||gatedInternal.length||gatedPublic.length))process.exitCode=1;
