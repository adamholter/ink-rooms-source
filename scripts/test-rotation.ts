import assert from 'node:assert/strict';
import {LEVELS,createState,attemptMove,rotationPoint,rotorIndex,targetPoints,tileAt,heightAt,isIce,solved,type Level} from '../src/puzzle.ts';
const level:Level={name:'Rotation test',subtitle:'',hint:'',map:['       ',' .#    ',' $~    ','       ',' @    E'],rotators:[{x:2,z:2,radius:1,channel:0}],switches:[{x:2,z:4,channel:0}],ice:[{x:1,z:1}],heights:Array.from({length:5},()=>Array(7).fill(0))};
level.heights![1][1]=2;
const index=LEVELS.length;LEVELS.push(level);
try {
 const initial=createState(index), snapshot=JSON.stringify(initial);
 assert.deepEqual(initial.rotations,[0]);
 assert.equal(rotorIndex(level,{x:3,z:3}),0);assert.equal(rotorIndex(level,{x:4,z:3}),-1);
 const first=attemptMove(initial,1,0)!;
 assert.deepEqual(first.rotations,[1]);assert.deepEqual(first.boxes,[{x:2,z:1}]);
 assert.deepEqual(targetPoints(level,first),[{x:3,z:1}]);
 assert.equal(tileAt(level,3,2,first),'#');assert.equal(tileAt(level,2,2,first),'~');
 assert.equal(heightAt(level,{x:3,z:1},first),2);assert(isIce(level,{x:3,z:1},first));assert(!isIce(level,{x:1,z:1},first));
 assert.equal(JSON.stringify(initial),snapshot);
 assert.deepEqual(attemptMove(initial,1,0,true,false)!.rotations,[0]);assert.deepEqual(attemptMove(initial,1,0,false)!.rotations,[0]);
 let state=first;
 for(let i=0;i<3;i++) {const released=attemptMove(state,-1,0)!;assert.deepEqual(released.rotations,state.rotations);state=attemptMove(released,1,0)!;assert.equal(state.fall,null);}
 assert.deepEqual(state.rotations,[0]);assert.deepEqual(state.boxes,initial.boxes);
 for(let z=0;z<5;z++)for(let x=0;x<7;x++)assert.equal(tileAt(level,x,z,state),tileAt(level,x,z,initial));
 assert.deepEqual(rotationPoint(level,{x:1,z:1},first),{x:3,z:1});
 assert(solved({...first,boxes:targetPoints(level,first)}));
 // A robot inside the square turns with its floor after processing the command.
 const robots={...initial,robots:[{x:3,z:3,direction:0}]};
 const robotTurn=attemptMove(robots,1,0)!; // Robot leaves square, so receives no turn.
 assert.equal(robotTurn.robots![0].direction,1);
 const trapped={...initial,robots:[{x:1,z:1,direction:0}]}; // Wall immediately east blocks command.
 const carried=attemptMove(trapped,1,0)!;
 assert.deepEqual(carried.robots![0],{x:3,z:1,direction:2,blocked:true});
 assert.equal(trapped.robots[0].direction,0);
 const rider={...initial,player:{x:1,z:3},robots:[{x:1,z:4,direction:0}]};
 const ride=attemptMove(rider,1,0)!;assert.deepEqual(ride.player,{x:1,z:2});assert.equal(ride.fall,null);assert.notEqual(tileAt(level,ride.player.x,ride.player.z,ride),'~');
 // Continuing occupancy is not a rising edge even when another actor walks.
 const held={...initial,boxes:[{x:2,z:4}],player:{x:4,z:4}};
 assert.deepEqual(attemptMove(held,1,0)!.rotations,[0]);
 console.log('Rotation invariants passed');
}finally{LEVELS.splice(index,1);}
