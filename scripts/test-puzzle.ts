import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEVELS, attemptMove, createState, solve, solved, tileAt, type State } from "../src/puzzle.ts";

const solutions: Array<{ level: number; name: string; moves: { x: number; z: number }[]; pushes: number }> = [];

assert.equal(LEVELS.length, 48);
const acceptedRooms = JSON.parse(readFileSync(new URL("./fixtures/accepted-rooms.json", import.meta.url), "utf8"));
for (const { index, level } of acceptedRooms.filter((entry: { index: number }) => entry.index < 4)) {
  assert.deepEqual(LEVELS[index], level, `Accepted room ${index + 1} must remain unchanged`);
}
for (let index = 0; index < 17; index += 1) {
  const level = LEVELS[index];
  assert.ok(!level.map[0].split("").every((cell) => cell === "#") && !level.map.at(-1)!.split("").every((cell) => cell === "#"), `${level.name} has an outer # row`);
  const initial = createState(index);
  assert.equal(solved(initial), false, `${level.name} must not begin solved`);
  const snapshot = structuredClone(initial);
  const solution = solve(initial);
  assert.ok(solution, `${level.name} must be solvable`);
  assert.deepEqual(initial, snapshot, "solver must not mutate its input");
  let state = initial;
  for (const direction of solution) {
    assert.equal(Number.isInteger(direction.x) && Number.isInteger(direction.z), true);
    assert.equal(Math.abs(direction.x) + Math.abs(direction.z), 1);
    const before = structuredClone(state);
    const next = attemptMove(state, direction.x, direction.z);
    assert.ok(next, `${level.name}: solver returned an illegal move`);
    assert.deepEqual(state, before, "moves must not mutate their input");
    assert.equal(next.fall, null, `${level.name}: solver must reject falling routes`);
    state = next;
  }
  assert.equal(state.won, true, `${level.name} solution must enter its exit`);
  assert.equal(solved(state), true);
  assert.equal(tileAt(level, state.player.x, state.player.z), "E");
  solutions.push({ level: index + 1, name: level.name, moves: solution, pushes: state.pushes });
}

assert.equal(tileAt(LEVELS[0], -1, 0), "~");
assert.equal(tileAt(LEVELS[0], 999, 999), "~");
assert.equal(tileAt(LEVELS[0], 1.5, 1), "~");

{
  const state = createState(0);
  const snapshot = structuredClone(state);
  for (const move of [[0, 0], [2, 0], [1, 1], [0.5, 0.5], [NaN, 1]] as const) assert.equal(attemptMove(state, move[0], move[1]), null);
  assert.deepEqual(state, snapshot);
}

{
  const state: State = { level: 2, player: { x: 3, z: 0 }, boxes: [{ x: 2, z: 2 }], moves: 0, pushes: 0, won: false, fall: null };
  assert.equal(attemptMove(state, 0, 1), null, "player cannot enter an interior wall");
}

{
  const state: State = { ...createState(0), player: { x: 0, z: 1 } };
  const fallen = attemptMove(state, -1, 0)!;
  assert.deepEqual(fallen.fall, { kind: "player", index: -1 });
  assert.equal(fallen.moves, 1);
  assert.equal(solve(fallen), null);
  assert.equal(attemptMove(fallen, 0, -1), null);
}

{
  const state: State = { level: 0, player: { x: 1, z: 1 }, boxes: [{ x: 1, z: 0 }], moves: 0, pushes: 0, won: false, fall: null };
  const fallen = attemptMove(state, 0, -1)!;
  assert.deepEqual(fallen.fall, { kind: "box", index: 0 });
  assert.equal(fallen.pushes, 1);
  assert.equal(solve(fallen), null);
}

{
  let state = createState(0);
  const locked = attemptMove({ ...state, player: { x: 4, z: 1 } }, 0, 1);
  assert.equal(locked, null, "exit is locked while crates remain unsolved");
  const solution = solve(state)!;
  for (const direction of solution) state = attemptMove(state, direction.x, direction.z)!;
  assert.equal(attemptMove(state, 1, 0), null, "won states reject further movement");
}

{
  const state: State = { ...createState(0), player: { x: 2, z: 2 }, boxes: [{ x: 3, z: 2 }] };
  assert.equal(attemptMove(state, 1, 0), null, "a box cannot be pushed onto the exit");
}

console.log(`First ${solutions.length} puzzles solved and replayed. Pushes: ${solutions.map(s=>s.pushes).join(", ")}`);

console.log("Tutorials preserved; replacement challenge rooms are checked by test-design-quality.ts.");
