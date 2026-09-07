import type { Level } from "./puzzle.ts";

// Independently authored mirror-control chapter. Paths and proofs live in scripts/fixtures/robot-room-design.json.
export const ROBOT_LEVELS: Level[] = [
  {
    "name": "Same Direction",
    "subtitle": "",
    "hint": "Bring the robot above its crate. Use the bay edges to line up the left and downward pushes.",
    "map": [
      "~~~~~~~~~~~",
      "~    ~    ~",
      "~ $ .~ $  ~",
      "~   ~~. # ~",
      "~E@  ~    ~",
      "~~~~~~~~~~~"
    ],
    "robots": [
      {
        "x": 9,
        "z": 3,
        "direction": 1
      }
    ],
    "lesson": "The robot copies your steps. Edges and obstacles can hold it while you move."
  },
  {
    "name": "Separate Duties",
    "subtitle": "",
    "hint": "Leave room behind both robot crates. Use the platform edges to line up your next push.",
    "map": [
      "~~~~~~~~~~~~",
      "~.   ~~.   ~",
      "~ #$E~~  $ ~",
      "~  @  ~ #$ ~",
      "~    ~~.   ~",
      "~~~~~~~~~~~~"
    ],
    "robots": [
      {
        "x": 7,
        "z": 2,
        "direction": 1
      }
    ]
  },
  {
    "name": "Shared Signal",
    "subtitle": "",
    "hint": "Keep the lower lane clear while you move both robot crates around the post. Park on the lower plates to leave.",
    "map": [
      "~~~~~~~~~~~~",
      "~~   ~~.   ~",
      "~    ~~ #$ ~",
      "~ #@  ~.   ~",
      "~ $  ~~  $ ~",
      "~~ . ~~~   ~",
      "~~E~~~~~~~~~"
    ],
    "robots": [
      {
        "x": 10,
        "z": 4,
        "direction": 1
      }
    ],
    "bridges": [
      {
        "x": 2,
        "z": 5,
        "height": 0,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 8,
        "z": 5,
        "channel": 1
      },
      {
        "x": 9,
        "z": 5,
        "channel": 1
      }
    ]
  },
  {
    "name": "Hold the Line",
    "subtitle": "",
    "hint": "Deliver the crates, then steer the robot onto the lower plates to open your exit.",
    "map": [
      "~~~~~~~~~~~",
      "~.  ~~  . ~",
      "~$#@ ~  $ ~",
      "~    ~~ $ ~",
      "~    ~   .~",
      "~~   ~    ~",
      "~~E~~~~~~~~"
    ],
    "robots": [
      {
        "x": 9,
        "z": 2,
        "direction": 1
      }
    ],
    "bridges": [
      {
        "x": 2,
        "z": 5,
        "height": 0,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 8,
        "z": 5,
        "channel": 1
      },
      {
        "x": 9,
        "z": 5,
        "channel": 1
      }
    ]
  }
];
