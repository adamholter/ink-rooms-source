import type { Level } from "./puzzle.ts";
// Independently authored additions. Replay and counterfactual proofs are in scripts/fixtures/rotation-room-design.json.
export const ROTATION_LEVELS: Level[] = [
  {
    "name": "Quarter Cargo",
    "subtitle": "",
    "hint": "The plate turns the square. Bring the crate aboard before turning it toward the mark.",
    "map": [
      "~~~~~~~",
      "~    #~",
      "~### .~",
      "~##  #~",
      "~   $ ~",
      "~@   E~",
      "~~~~~~~"
    ],
    "rotators": [
      {
        "x": 3,
        "z": 3,
        "radius": 1,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 1,
        "z": 4,
        "channel": 1
      }
    ],
    "lesson": "Step onto the plate to turn the square clockwise. Step off before triggering another turn. Everything aboard rides with it."
  },
  {
    "name": "Shared Deck",
    "subtitle": "",
    "hint": "Both crates ride the square. Give each one room to leave.",
    "map": [
      "~~~~~~~",
      "~.   #~",
      "~##  .~",
      "~ # $ ~",
      "~  $ #~",
      "~@#  E~",
      "~~~~~~~"
    ],
    "rotators": [
      {
        "x": 3,
        "z": 3,
        "radius": 1,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 1,
        "z": 4,
        "channel": 1
      }
    ]
  },
  {
    "name": "Turn Order",
    "subtitle": "",
    "hint": "Stage the crates before the next turn closes their route.",
    "map": [
      "~~~~~~~",
      "~#    ~",
      "~. #$#~",
      "~#$   ~",
      "~.    ~",
      "~@#  E~",
      "~~~~~~~"
    ],
    "rotators": [
      {
        "x": 3,
        "z": 3,
        "radius": 1,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 1,
        "z": 4,
        "channel": 1
      }
    ]
  },
  {
    "name": "Off Axis",
    "subtitle": "",
    "hint": "The upper marks need separate approaches. Use the square to change which side you can reach.",
    "map": [
      "~~~~~~~",
      "~..  #~",
      "~  $# ~",
      "~#  $ ~",
      "~  #  ~",
      "~@ ##E~",
      "~~~~~~~"
    ],
    "rotators": [
      {
        "x": 3,
        "z": 3,
        "radius": 1,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 1,
        "z": 4,
        "channel": 1
      }
    ]
  },
  {
    "name": "Lift and Drift",
    "subtitle": "",
    "hint": "Use the lift to change which side of the cargo you can reach. The ice square changes where you stop.",
    "map": [
      "~~~~~~~~",
      "~      ~",
      "~ $  # ~",
      "~  $ ##~",
      "~..# # ~",
      "~@ #  E~",
      "~~~~~~~~"
    ],
    "ice": [
      {
        "x": 2,
        "z": 3
      }
    ],
    "jumping": true,
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
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2
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
    "elevators": [
      {
        "x": 3,
        "z": 2,
        "low": 0,
        "high": 2,
        "channel": 1
      },
      {
        "x": 3,
        "z": 3,
        "low": 0,
        "high": 2,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 1,
        "z": 4,
        "channel": 1
      }
    ]
  },
  {
    "name": "Remote Brake",
    "subtitle": "",
    "hint": "Deliver both crates, then steer the robot onto the icy plate at the far right. Keep it there while crossing.",
    "map": [
      "~~~~~~~~",
      "~#    #~",
      "~.$$  #~",
      "~#  #  ~",
      "~ .   #~",
      "~@# # E~",
      "~~~~~~~~"
    ],
    "ice": [
      {
        "x": 5,
        "z": 1
      },
      {
        "x": 5,
        "z": 2
      },
      {
        "x": 3,
        "z": 3
      },
      {
        "x": 6,
        "z": 3
      },
      {
        "x": 3,
        "z": 4
      }
    ],
    "robots": [
      {
        "x": 4,
        "z": 1,
        "direction": 1
      }
    ],
    "bridges": [
      {
        "x": 5,
        "z": 5,
        "height": 0,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 6,
        "z": 3,
        "channel": 1
      }
    ]
  },
  {
    "name": "Turning Current",
    "subtitle": "",
    "hint": "The marks and ice turn with the crates. Leave room for the slide before you turn the square again.",
    "map": [
      "~~~~~~~",
      "~ ##  ~",
      "~..   ~",
      "~## # ~",
      "~ $$ #~",
      "~@   E~",
      "~~~~~~~"
    ],
    "ice": [
      {
        "x": 1,
        "z": 1
      },
      {
        "x": 3,
        "z": 2
      },
      {
        "x": 5,
        "z": 2
      },
      {
        "x": 3,
        "z": 3
      },
      {
        "x": 1,
        "z": 4
      }
    ],
    "rotators": [
      {
        "x": 3,
        "z": 3,
        "radius": 1,
        "channel": 1
      }
    ],
    "switches": [
      {
        "x": 1,
        "z": 4,
        "channel": 1
      }
    ]
  }
];
