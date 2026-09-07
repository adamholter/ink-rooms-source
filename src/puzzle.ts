import { CHALLENGE_FLAT_LEVELS } from './challenge-flat-levels.ts';
import { CHALLENGE_CUBE_LEVELS } from './challenge-cube-levels.ts';
import { CUBE_LEVELS } from './cube-levels.ts';
import { attemptCubeMove } from './cube-topology.ts';
import { ROTATION_LEVELS } from "./rotation-levels.ts";
import { ICE_LEVELS } from './ice-levels.ts';
import { ROOM26 } from './room26-replacement.ts';
import { ROBOT_LEVELS } from './robot-levels.ts';
import { MACHINERY_LEVELS } from './machinery-levels.ts';
import { ORIGINAL_FLAT_ROOMS } from './original-flat-rooms.ts';
import { ORIGINAL_TERRACES } from './original-terraces.ts';
export type Point = { x: number; z: number };
export type Move = Point;
export type RobotState = Point & { direction: number; blocked?: boolean };

export type Fall = { kind: "player" | "box" | "robot"; index: number } | null;

export type State = {
  level: number;
  player: Point;
  boxes: Point[];
  robots?: RobotState[];
  rotations?: number[];
  cubeTurn?: number;
  moves: number;
  pushes: number;
  won: boolean;
  fall: Fall;
};

export type Level = {
  name: string;
  subtitle: string;
  hint: string;
  map: string[];
  cube?: { size: number };
  challenge?: boolean;
  heights?: number[][];
  jumping?: boolean;
  rotators?: (Point & { radius: number; channel: number })[];
  ice?: Point[];
  lesson?: string;
  robots?: (Point & { direction: number })[];
  switches?: (Point & { channel: number })[];
  elevators?: (Point & { low: number; high: number; channel: number })[];
  bridges?: (Point & { height: number; channel: number })[];
};

// Maps contain only the platform itself. Missing cells and '~' cutouts are void.
const LEVEL_BANK: Level[] = [
  {
    name: "First Impression",
    subtitle: "Bring the crate around to its mark.",
    hint: "Walk around the crate before you push.",
    map: ["~ . ~", "     ", " $@ E", "~   ~"],
  },
  {
    name: "Corner Turn",
    subtitle: "A straight push is only the beginning.",
    hint: "Push left first, then get underneath.",
    map: ["~.   ~", "      ", "  $@  ", "    E ", "~    ~"],
  },
  {
    name: "Ink Post",
    subtitle: "One obstacle changes the route.",
    hint: "Use the open side to get behind the crate twice.",
    map: ["~  .  ~", "   #   ", "  $    ", " @   E ", "~     ~"],
  },
  {
    name: "Offset Pair",
    subtitle: "Two crates, crossed destinations.",
    hint: "Move the right crate out of the lower lane first.",
    map: ["~.   .~", "   #   ", "  $ $  ", "    @E ", "~     ~"],
  },
];

export const LEVELS: Level[] = [...LEVEL_BANK, ...ORIGINAL_FLAT_ROOMS];

export function channelActive(level: Level, channel: number, state: Pick<State, 'player' | 'boxes' | 'robots' | 'rotations'>): boolean {
  return (level.switches || []).some(s => s.channel === channel && (same(s, state.player) || state.boxes.some(b => same(s, b)) || state.robots?.some(r => same(s, r))));
}
export function rotorIndex(level: Level, p: Point): number {
  return level.rotators?.findIndex(r => Math.abs(p.x-r.x)<=r.radius && Math.abs(p.z-r.z)<=r.radius) ?? -1;
}
function turnPoint(p: Point, center: Point, turns: number): Point {
  let dx=p.x-center.x, dz=p.z-center.z;
  for(let i=0;i<((turns%4)+4)%4;i++) [dx,dz]=[-dz,dx];
  return {x:center.x+dx,z:center.z+dz};
}
export function rotationPoint(level: Level, p: Point, state?: Pick<State, 'rotations'>): Point {
  const i=rotorIndex(level,p);
  return i<0 ? {...p} : turnPoint(p,level.rotators![i],state?.rotations?.[i] ?? 0);
}
function sourcePoint(level: Level, p: Point, state?: Pick<State, 'rotations'>): Point {
  const i=rotorIndex(level,p);
  return i<0 ? p : turnPoint(p,level.rotators![i],-(state?.rotations?.[i] ?? 0));
}
export function heightAt(level: Level, p: Point, state?: Pick<State, 'player' | 'boxes' | 'robots' | 'rotations'>): number {
  const lift = level.elevators?.find(e => same(e, p));
  if (lift) return state && channelActive(level, lift.channel, state) ? lift.high : lift.low;
  const bridge = level.bridges?.find(b => same(b, p));
  const source=sourcePoint(level,p,state);
  return bridge?.height ?? level.heights?.[source.z]?.[source.x] ?? 0;
}

export function tileAt(level: Level, x: number, z: number, state?: Pick<State, 'player' | 'boxes' | 'robots' | 'rotations'>): string {
  const bridge = state && level.bridges?.find(b => b.x === x && b.z === z);
  if (bridge && !channelActive(level, bridge.channel, state!)) return "~";
  ({x,z}=sourcePoint(level,{x,z},state));
  if (!Number.isInteger(x) || !Number.isInteger(z) || z < 0 || z >= level.map.length) return "~";
  const row = level.map[z];
  return x < 0 || x >= row.length ? "~" : row[x];
}

function same(a: Point, b: Point): boolean {
  return a.x === b.x && a.z === b.z;
}

export function targetPoints(level: Level, state?: Pick<State, 'rotations'>): Point[] {
  const result: Point[] = [];
  level.map.forEach((row, z) => [...row].forEach((cell, x) => {
    if (cell === ".") result.push(rotationPoint(level,{ x, z },state));
  }));
  return result;
}

export function createState(index: number): State {
  const level = LEVELS[index];
  if (!level) throw new RangeError(`Unknown level ${index}`);
  let player: Point | undefined;
  const boxes: Point[] = [];
  level.map.forEach((row, z) => [...row].forEach((cell, x) => {
    if (cell === "@") player = { x, z };
    if (cell === "$") boxes.push({ x, z });
  }));
  if (!player) throw new Error(`Level ${index} has no player`);
  return { level: index, player, boxes, ...(level.cube ? {cubeTurn:0} : {}), ...(level.rotators?.length ? {rotations: level.rotators.map(()=>0)} : {}), ...(level.robots?.length ? { robots: level.robots.map(r => ({...r, blocked:false})) } : {}), moves: 0, pushes: 0, won: false, fall: null };
}

export function solved(state: State): boolean {
  const level = LEVELS[state.level];
  if (!level || state.fall || state.boxes.length === 0) return false;
  const marks = targetPoints(level,state);
  return state.boxes.every((box) => marks.some((mark) => same(box, mark)));
}

// The solver uses the same automatic climbing limit as normal movement.
function landing(level: Level, from: Point, dx: number, dz: number, boxes: Point[], allowExit: boolean): Point | null {
  let to = { x: from.x + dx, z: from.z + dz };
  const tile = tileAt(level, to.x, to.z);
  if (tile === "#" || tile === "~" || (tile === "E" && !allowExit) || boxes.some(b => same(b, to))) return null;
  if (heightAt(level, to) - heightAt(level, from) > (level.jumping ? 2 : 1)) return null;
  return to;
}

export function isIce(level:Level,p:Point,state?:Pick<State,'rotations'>):boolean {const source=sourcePoint(level,p,state);return !!level.ice?.some(t=>same(t,source));}

// Momentum never initiates another push. An obstacle catches the sliding actor.
function slideOnIce(state:State,start:Point,dx:number,dz:number,kind:'player'|'box'|'robot',index=-1):{point:Point;fall:Fall} {
  const level=LEVELS[state.level];let p={...start};
  while(isIce(level,p,state)){
    const to={x:p.x+dx,z:p.z+dz},tile=tileAt(level,to.x,to.z,state);
    if(tile==='#'||(tile==='E'&&(kind!=='player'||!solved(state))))break;
    if(state.boxes.some((b,i)=>!(kind==='box'&&i===index)&&same(b,to))||state.robots?.some((r,i)=>!(kind==='robot'&&i===index)&&same(r,to))||(kind!=='player'&&same(state.player,to)))break;
    if(tile==='~')return kind==='robot'?{point:p,fall:null}:{point:to,fall:{kind,index}};
    const rise=heightAt(level,to,state)-heightAt(level,p,state);
    if(rise>0||(kind==='robot'&&rise!==0))break;
    p=to;
    if(tile==='E')break;
  }
  return {point:p,fall:null};
}

export function attemptMove(state: State, dx: number, dz: number, advanceRobots = true, rotate = true): State | null {
  if (state.won || state.fall || !Number.isInteger(dx) || !Number.isInteger(dz) || Math.abs(dx) + Math.abs(dz) !== 1) return null;
  const level = LEVELS[state.level];
  if (!level) return null;
  if (level.cube) return attemptCubeMove(level,state,dx,dz);
  const nextPlayer = { x: state.player.x + dx, z: state.player.z + dz };
  if (state.robots?.some(r => same(r, nextPlayer))) return null;
  const nextTile = tileAt(level, nextPlayer.x, nextPlayer.z, state);
  if (nextTile === "#" || (nextTile === "E" && !solved(state))) return null;
  if (nextTile !== "~" && heightAt(level, nextPlayer, state) - heightAt(level, state.player, state) > (level.jumping ? 2 : 1)) return null;
  const boxes = state.boxes.map(box => ({ ...box }));
  const boxIndex = boxes.findIndex(box => same(box, nextPlayer));
  let pushes = state.pushes;
  let fall: Fall = null;
  if (boxIndex >= 0) {
    if (heightAt(level, state.player, state) !== heightAt(level, nextPlayer, state)) return null;
    const nextBox = { x: nextPlayer.x + dx, z: nextPlayer.z + dz };
    const nextBoxTile = tileAt(level, nextBox.x, nextBox.z, state);
    if (nextBoxTile === "#" || nextBoxTile === "E" || state.robots?.some(r => same(r, nextBox)) || boxes.some((box, i) => i !== boxIndex && same(box, nextBox))) return null;
    if (nextBoxTile !== "~" && heightAt(level, nextBox, state) > heightAt(level, nextPlayer, state)) return null;
    boxes[boxIndex] = nextBox;
    pushes++;
    if (nextBoxTile === "~") fall = { kind: "box", index: boxIndex };
    else if(isIce(level,nextBox,state)){
      const slide=slideOnIce({...state,boxes},nextBox,dx,dz,'box',boxIndex);boxes[boxIndex]=slide.point;fall=slide.fall;
    }
  } else if (nextTile === "~") fall = { kind: "player", index: -1 };
  const moved: State = { ...state, level: state.level, player: nextPlayer, boxes, moves: state.moves + 1, pushes, won: false, fall };
  if(!moved.fall&&isIce(level,moved.player,moved)){
    const slide=slideOnIce({...state,boxes},moved.player,dx,dz,'player');moved.player=slide.point;moved.fall=slide.fall;
  }
  if (advanceRobots && !moved.fall && moved.robots?.length) advanceHelpers(moved,dx,dz);
  if (advanceRobots && rotate && !moved.fall && level.rotators?.length) {
    const turning=level.rotators.map(r=>!channelActive(level,r.channel,state)&&channelActive(level,r.channel,moved));
    moved.rotations=level.rotators.map((_,i)=>((state.rotations?.[i] ?? 0)+(turning[i]?1:0))%4);
    const carry=(p:Point):Point=>{const i=rotorIndex(level,p);return i>=0&&turning[i]?turnPoint(p,level.rotators![i],1):{...p};};
    moved.player=carry(moved.player);
    moved.boxes=moved.boxes.map(carry);
    moved.robots=moved.robots?.map(r=>({...r,...carry(r),direction:(r.direction+(turning[rotorIndex(level,r)]?1:0))%4}));
  }
  // A released switch retracts its bridge. Occupants fall and can undo the release.
  if (!moved.fall && level.bridges?.length) {
    const missing = (p: Point) => level.bridges!.some(b => same(b, p) && !channelActive(level, b.channel, moved));
    const box = moved.boxes.findIndex(missing);
    if (box >= 0) moved.fall = { kind: 'box', index: box };
    else if (missing(moved.player)) moved.fall = { kind: 'player', index: -1 };
    else { const robot=moved.robots?.findIndex(missing) ?? -1; if(robot>=0) moved.fall={kind:'robot',index:robot}; }
  }
  moved.won = !moved.fall && tileAt(level,moved.player.x,moved.player.z,moved) === "E" && solved(moved);
  return moved;
}

// Robots copy the direction of each legal player step. Blocked input does not advance the turn.
// Robots brake at platform edges and height changes; cargo may be delivered downhill.
function advanceHelpers(state: State, dx: number, dz: number): void {
  const level=LEVELS[state.level];
  state.robots=state.robots!.map(r=>({...r}));
  for(let i=0;i<state.robots.length;i++) {
    const robot=state.robots[i];
    robot.direction=DIRECTIONS.findIndex(d=>d.x===dx&&d.z===dz);
    const d=DIRECTIONS[robot.direction], to={x:robot.x+d.x,z:robot.z+d.z};
    robot.blocked=true;
    if(['#','~','E'].includes(tileAt(level,to.x,to.z,state)) || same(to,state.player) || state.robots.some((r,j)=>j!==i&&same(r,to))) continue;
    if(heightAt(level,to,state)!==heightAt(level,robot,state)) continue;
    const box=state.boxes.findIndex(b=>same(b,to));
    const cargo={x:to.x+d.x,z:to.z+d.z};
    if(box>=0 && (['#','~','E'].includes(tileAt(level,cargo.x,cargo.z,state)) || same(cargo,state.player) || state.robots.some((r,j)=>j!==i&&same(r,cargo)) || state.boxes.some((b,j)=>j!==box&&same(b,cargo)) || heightAt(level,cargo,state)>heightAt(level,to,state))) continue;
    const candidate={...state,robots:state.robots.map((r,j)=>j===i?{...r,...to}:r),boxes:state.boxes.map((b,j)=>j===box?cargo:b)};
    if(tileAt(level,to.x,to.z,candidate)==='~') continue;
    robot.x=to.x;robot.z=to.z;robot.blocked=false;
    if(box>=0){
      state.boxes[box]=cargo;state.pushes++;
      const slide=slideOnIce(state,cargo,dx,dz,'box',box);state.boxes[box]=slide.point;state.fall=slide.fall;
    }
    if(state.fall)break;
    const slide=slideOnIce(state,robot,dx,dz,'robot',i);robot.x=slide.point.x;robot.z=slide.point.z;
  }
}

const DIRECTIONS: Point[] = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }];
const pointKey = (p: Point) => `${p.x},${p.z}`;
const boxKey = (boxes: Point[]) => boxes.map(pointKey).sort().join(";");

type ReachStep = { point: Point; parent: string | null; direction: Move | null };

function flood(level: Level, start: Point, boxes: Point[], allowExit: boolean): Map<string, ReachStep> {
  const queue: Point[] = [start];
  const reached = new Map<string, ReachStep>([[pointKey(start), { point: start, parent: null, direction: null }]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const direction of DIRECTIONS) {
      const point = landing(level, current, direction.x, direction.z, boxes, allowExit);
      if (!point) continue;
      const key = pointKey(point);
      if (reached.has(key)) continue;
      reached.set(key, { point, parent: pointKey(current), direction });
      queue.push(point);
    }
  }
  return reached;
}

function routeTo(reached: Map<string, ReachStep>, goal: Point): Move[] | null {
  let step = reached.get(pointKey(goal));
  if (!step) return null;
  const reversed: Move[] = [];
  while (step.parent !== null) {
    reversed.push(step.direction!);
    step = reached.get(step.parent)!;
  }
  return reversed.reverse();
}

function deadSquares(level: Level): Set<string> {
  // Reverse every legal push from the targets. Height makes drops directional.
  const queue = targetPoints(level), reachable = new Set(queue.map(pointKey));
  const floor = (p: Point) => !["#", "~", "E"].includes(tileAt(level, p.x, p.z));
  for (let i = 0; i < queue.length; i++) for (const d of DIRECTIONS) {
    const to = queue[i], from = { x: to.x - d.x, z: to.z - d.z }, behind = { x: from.x - d.x, z: from.z - d.z };
    if (!floor(from) || !floor(behind) || heightAt(level, from) < heightAt(level, to) || heightAt(level, behind) !== heightAt(level, from)) continue;
    const key = pointKey(from);
    if (!reachable.has(key)) { reachable.add(key); queue.push(from); }
  }
  const dead = new Set<string>();
  level.map.forEach((row, z) => [...row].forEach((tile, x) => { if (!["#", "~", "E"].includes(tile) && !reachable.has(`${x},${z}`)) dead.add(`${x},${z}`); }));
  return dead;
}

export function solve(state: State): Move[] | null {
  if (state.fall) return null;
  if (state.won) return [];
  const level = LEVELS[state.level];
  if (!level) return null;
  if (level.cube || level.rotators?.length || level.switches?.length || level.robots?.length || level.ice?.length) return solveMachinery(state);
  type Node = { player: Point; boxes: Point[]; parent: number; edge: Move[] };
  const start: Node = { player: { ...state.player }, boxes: state.boxes.map((box) => ({ ...box })), parent: -1, edge: [] };
  const queue: Node[] = [start];
  const firstReach = flood(level, start.player, start.boxes, false);
  const canonical = (reach: Map<string, ReachStep>, boxes: Point[]) => `${level.jumping ? [...reach.keys()][0] : [...reach.keys()].sort()[0]}|${boxKey(boxes)}`;
  const seen = new Set([canonical(firstReach, start.boxes)]);
  const dead = deadSquares(level);
  if (state.boxes.some(b => dead.has(pointKey(b)))) return null;
  const exit = (() => {
    for (let z = 0; z < level.map.length; z += 1) for (let x = 0; x < level.map[z].length; x += 1) if (level.map[z][x] === "E") return { x, z };
    return null;
  })();
  const buildPath = (nodeIndex: number, tail: Move[]): Move[] => {
    const segments: Move[][] = [tail];
    for (let index = nodeIndex; index >= 0; index = queue[index].parent) segments.push(queue[index].edge);
    const result: Move[] = [];
    for (let index = segments.length - 1; index >= 0; index -= 1) result.push(...segments[index]);
    return result;
  };

  for (let cursor = 0; cursor < queue.length && seen.size <= 200_000; cursor += 1) {
    const current = queue[cursor];
    const reach = flood(level, current.player, current.boxes, false);
    const probe: State = { ...state, player: current.player, boxes: current.boxes, fall: null, won: false };
    if (solved(probe)) {
      if (!exit) return null;
      const route = routeTo(flood(level, current.player, current.boxes, true), exit);
      if (route) return buildPath(cursor, route);
    }
    for (let boxIndex = 0; boxIndex < current.boxes.length; boxIndex += 1) {
      const box = current.boxes[boxIndex];
      for (const direction of DIRECTIONS) {
        const behind = { x: box.x - direction.x, z: box.z - direction.z };
        const destination = { x: box.x + direction.x, z: box.z + direction.z };
        const destinationTile = tileAt(level, destination.x, destination.z);
        if (destinationTile === "#" || destinationTile === "~" || destinationTile === "E" || dead.has(pointKey(destination)) || current.boxes.some((other) => same(other, destination))) continue;
        if (heightAt(level, behind) !== heightAt(level, box) || heightAt(level, destination) > heightAt(level, box)) continue;
        const walk = routeTo(reach, behind);
        if (!walk) continue;
        const boxes = current.boxes.map((item) => ({ ...item }));
        boxes[boxIndex] = destination;
        const player = { ...box };
        const nextReach = flood(level, player, boxes, false);
        const key = canonical(nextReach, boxes);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ player, boxes, parent: cursor, edge: [...walk, direction] });
        }
      }
    }
  }
  return null;
}

// Elevation introductions, followed by the new independently designed terraces.
LEVELS.push(...[
  {
    "name": "First Ascent",
    "subtitle": "Walk up onto the terrace.",
    "hint": "Walk into a raised ledge to hop up automatically.",
    "map": [
      "~~~~~~~~",
      "~@  .  ~",
      "~   $  ~",
      "~     E~",
      "~     ~~",
      "~~~~~~~~"
    ],
    "heights": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        1,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        0,
        1,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        0,
        1,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        0,
        1,
        2,
        2,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ],
    "jumping": true,
    "lesson": "Walk into a ledge to hop up automatically."
  },
  {
    "name": "Keep One High",
    "subtitle": "The ramp only carries crates downward.",
    "hint": "Finish the upper mark before sending the other crate through the low opening.",
    "map": [
      "~~~~~~~~",
      "~ .#   ~",
      "~  #.$ ~",
      "~  # $ ~",
      "~    @E~",
      "~      ~",
      "~~~~~~~~"
    ],
    "heights": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        2,
        2,
        2,
        0
      ],
      [
        0,
        0,
        0,
        0,
        2,
        2,
        2,
        0
      ],
      [
        0,
        0,
        0,
        0,
        2,
        2,
        2,
        0
      ],
      [
        0,
        0,
        0,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ],
    "jumping": true,
    "lesson": "Crates can drop to a lower floor. They cannot climb back up."
  }
] as Level[]);
LEVELS.push(...ORIGINAL_TERRACES);


// Switch occupancy changes walkable routes and heights even without a crate push.
// Search complete moves here; the original static-room push solver remains unchanged.
function solveMachinery(initial: State): Move[] | null {
  const key = (s: State) => `${pointKey(s.player)}|${boxKey(s.boxes)}|${(s.robots||[]).map(r=>pointKey(r)).join(";")}|${(s.rotations||[]).join(",")}|${s.cubeTurn??0}`;
  const queue: {state: State; parent: number; direction: Move | null}[] = [{state: initial, parent: -1, direction: null}];
  const seen = new Set([key(initial)]);
  for (let cursor = 0; cursor < queue.length && queue.length < 350_000; cursor++) {
    const current = queue[cursor];
    if (current.state.won) {
      const path: Move[] = [];
      for (let i = cursor; queue[i].direction; i = queue[i].parent) path.push(queue[i].direction!);
      return path.reverse();
    }
    for (const d of DIRECTIONS) {
      const next = attemptMove(current.state, d.x, d.z);
      if (!next || next.fall) continue;
      const k = key(next);
      if (!seen.has(k)) { seen.add(k); queue.push({state: next, parent: cursor, direction: d}); }
    }
  }
  return null;
}

LEVELS.push(...MACHINERY_LEVELS);

LEVELS[25]=ROOM26;
LEVELS.push(...ROBOT_LEVELS);

LEVELS.push(...ICE_LEVELS);
LEVELS.push(...ROTATION_LEVELS);

LEVELS.push(...CUBE_LEVELS);

LEVELS.push(...CHALLENGE_FLAT_LEVELS.map(level=>({...level,challenge:true})),...CHALLENGE_CUBE_LEVELS);
