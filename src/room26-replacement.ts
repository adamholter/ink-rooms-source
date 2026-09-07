import type { Level } from "./puzzle";

export const ROOM26: Level = {
  name: "Transfer Yard",
  subtitle: "One keeper powers two stages of the same delivery.",
  hint: "Load the lift while it is down. Move the keeper from the lift plate to the bridge plate only after unloading upstairs.",
  jumping: true,
  map: [
    "~~~~~~~~~~",
    "~~~~~~~.~~",
    "~   ~~~ ~~",
    "~        ~",
    "~~   ~  E~",
    "~~     ~~~",
    "~~~$ $ .~~",
    "~~~ @~~~~~",
    "~~~~~~~~~~",
  ],
  heights: [
    [0,0,0,0,0,0,0,0,0,0],
    [0,2,2,2,2,0,2,2,2,0],
    [0,2,2,2,2,0,2,2,0,0],
    [0,2,2,2,2,2,2,2,0,0],
    [0,0,2,0,2,0,2,2,0,0],
    [0,0,2,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ],
  switches: [
    { x: 4, z: 6, channel: 1 },
    { x: 6, z: 6, channel: 2 },
  ],
  elevators: [
    { x: 3, z: 4, low: 0, high: 2, channel: 1 },
  ],
  bridges: [
    { x: 5, z: 3, height: 2, channel: 2 },
  ],
};
