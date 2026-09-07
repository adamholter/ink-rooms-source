import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {LEVELS,createState,solve,attemptMove,heightAt,type Move} from '../src/puzzle.ts';
import {boardFromRows,search,serialSearch,assignmentDistance,movesFromPushes} from './lib/push-search.mjs';
const d:Record<string,Move>={U:{x:0,z:-1},R:{x:1,z:0},D:{x:0,z:1},L:{x:-1,z:0}};
const serialFixture=boardFromRows(['      ',' $ .  ',' $ .@ ','      ']);
assert.ok(serialSearch(serialFixture),'Independent crates can be delivered one at a time');
const expectedMinimums=[18,19,23,24,24,25,30,35];
const report:any[]=[];
for(let i=4;i<12;i++){
 const level=LEVELS[i],board=boardFromRows(level.map),assessment=search(board,{graph:true,cap:100000});
 assert.ok(assessment&&!assessment.capped,`${level.name} independent exhaustive search completes`);
 assert.equal(assessment.pushes,expectedMinimums[i-4],`${level.name} push difficulty regression`);
 assert.ok(assessment.detour>=8,'Requires at least eight pushes beyond independent crate routing distance');
 assert.ok(board.n<=35&&assessment.pushesPerCell>=.55,'Compact board with substantial push work');
 assert.equal(serialSearch(board),null,`${level.name} cannot be solved by completing one crate at a time`);
 assert.ok(assessment.nonCornerDeadlockChoices>0,'Requires planning beyond avoiding obvious dead squares');
 let state=createState(i);const path=solve(state);assert.ok(path);
 for(const move of path){state=attemptMove(state,move.x,move.z)!;assert.ok(state&&!state.fall);}
 assert.ok(state.won);assert.equal(state.pushes,assessment.pushes,'Production solver agrees with independent minimum push search');
 const trap=movesFromPushes(board,assessment.trapExamples[0]);let trapped=createState(i),before=trapped;
 for(const letter of trap){before=trapped;trapped=attemptMove(trapped,d[letter].x,d[letter].z)!;assert.ok(trapped&&!trapped.fall,'Deadlock witness stays on the board');}
 assert.ok(solve(before),'State immediately before mistake is solvable');assert.equal(solve(trapped),null,'Last witness push creates a losing state');
 report.push({room:i+1,name:level.name,crates:board.boxes.length,floorCells:board.n,minimumPushes:assessment.pushes,independentRoutingLowerBound:assessment.lowerBound,extraRequiredPushes:assessment.detour,pushesPerCell:Number(assessment.pushesPerCell.toFixed(3)),serialDeliveryPossible:false,nonCornerDeadlockChoicesOnOneOptimalPath:assessment.nonCornerDeadlockChoices,reachablePushStates:assessment.reachableStates,solvablePushStates:assessment.solvableStates,movesOnPushOptimalRoute:path.length,movesAreNotProvenMinimum:true,solution:path,deadlockWitness:trap});
}
const terraces=JSON.parse(readFileSync(new URL('./fixtures/original-terraces-design.json',import.meta.url),'utf8'));
for(const proof of terraces.rooms){
 const i=proof.room-1,level=LEVELS[i];assert.deepEqual(level,proof.level,'Published terrace agrees with assessed design');
 let state=createState(i);const path=solve(state);assert.ok(path);let drops=0;
 for(const move of path){const old=state;state=attemptMove(state,move.x,move.z)!;assert.ok(state&&!state.fall);drops+=state.boxes.filter((b,j)=>heightAt(level,b)<heightAt(level,old.boxes[j])).length;}
 assert.ok(state.won);assert.equal(state.pushes,proof.metrics.optimalPushes);assert.ok(drops>=1);
 const witness=proof.irreversibleDropWitness;let before=createState(i);
 for(const move of [...proof.solution.slice(0,witness.solutionPrefixMoves),...witness.approach]){before=attemptMove(before,move.x,move.z)!;assert.ok(before&&!before.fall);}
 assert.deepEqual(before,witness.before);assert.ok(solve(before));const after=attemptMove(before,witness.drop.x,witness.drop.z)!;assert.deepEqual(after,witness.after);assert.equal(solve(after),null);
 const board=boardFromRows(level.map),lower=assignmentDistance(board,board.boxes);
 report.push({room:i+1,name:level.name,crates:board.boxes.length,floorCells:board.n,minimumPushes:state.pushes,independentRoutingLowerBound:lower,extraRequiredPushes:state.pushes-lower,pushesPerCell:Number((state.pushes/board.n).toFixed(3)),requiredPermanentDrops:drops,verifiedIrreversibleDropTrap:true,movesOnPushOptimalRoute:path.length,movesAreNotProvenMinimum:true,solution:path});
}
const output={generatedAt:new Date().toISOString(),method:'Flat rooms use an independent exhaustive push graph and serial-delivery search. Minimum pushes exclude walking and exit approach. Routing bound assigns crates to targets by shortest floor paths ignoring other crates and pushing-side restrictions. Extra pushes measure forced detours beyond that bound. Terrace minimum pushes use the production push BFS, replayed against movement rules, with explicit irreversible-drop witnesses. These measures screen difficulty; human play remains the final judge.',rooms:report};
writeFileSync(new URL('./fixtures/original-quality-report.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.table(report.map(({room,floorCells,minimumPushes,extraRequiredPushes,serialDeliveryPossible,requiredPermanentDrops})=>({room,floorCells,minimumPushes,extraRequiredPushes,serialDeliveryPossible,requiredPermanentDrops})));
console.log('Replacement room difficulty, independent push optima, crate dependency and deadlock witnesses pass.');
