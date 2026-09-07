import type {Point} from './hub-world.ts';

export const HUB_RUN_MAX=2.4;
export const HUB_RUN_ACCELERATION=.65;
export const HUB_RUN_WARMUP_STEPS=3;

/** Only uninterrupted, successful strides build speed. Machinery keeps its own timing. */
export function createHubStride(){
  let direction:Point|null=null,steps=0,speed=1,generation=0;
  function reset(){steps=0;speed=1;generation++;}
  return {
    hold(next:Point|null){
      if(!next||!direction||next.x!==direction.x||next.z!==direction.z)reset();
      direction=next?{...next}:null;
    },
    stop:reset,
    complete(ticket=generation){if(direction&&ticket===generation)steps++;},
    ticket:()=>generation,
    update(dt:number,moving:boolean){if(direction&&moving&&steps>=HUB_RUN_WARMUP_STEPS)speed=Math.min(HUB_RUN_MAX,speed+Math.max(0,dt)*HUB_RUN_ACCELERATION);},
    speed:()=>speed,
    held:()=>direction!==null,
    snapshot:()=>({direction:direction?{...direction}:null,steps,speed}),
  };
}
