import assert from 'node:assert/strict';
import {createHubStride,HUB_RUN_MAX,HUB_RUN_ACCELERATION} from '../src/hub-stride.ts';
const stride=createHubStride(),forward={x:0,z:-1};stride.hold(forward);
for(let i=0;i<3;i++){stride.update(.28,true);assert.equal(stride.speed(),1);stride.complete();}
stride.update(.5,true);assert.equal(stride.speed(),1+.5*HUB_RUN_ACCELERATION);
stride.update(10,true);assert.equal(stride.speed(),HUB_RUN_MAX);
stride.hold(null);assert.equal(stride.speed(),1);assert.equal(stride.snapshot().steps,0);
stride.hold(forward);for(let i=0;i<3;i++)stride.complete();stride.update(2,true);assert(stride.speed()>1);
const oldTicket=stride.ticket();stride.hold({x:1,z:0});stride.complete(oldTicket);assert.equal(stride.speed(),1);assert.equal(stride.snapshot().steps,0,'old-direction movement cannot count toward new warmup');
for(let i=0;i<3;i++)stride.complete();stride.update(1,false);assert.equal(stride.speed(),1,'standing still cannot build speed');
stride.update(1,true);stride.stop();assert.equal(stride.speed(),1);assert.equal(stride.snapshot().steps,0,'a blocker or machinery resets the run');
console.log('Hub acceleration: 3-step warmup, linear increase, 2.4x cap, release/turn/block resets passed');
