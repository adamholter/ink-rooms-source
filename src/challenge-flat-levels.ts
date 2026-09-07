import type { Level } from './puzzle.ts';
// Original mixed challenges. Exact replay and search proofs are in scripts/fixtures/challenge-flat-design.json.
export const CHALLENGE_FLAT_LEVELS: Level[] = [
  {
    "name": "Rime Relay",
    "subtitle": "",
    "hint": "The three left-hand marks need different approaches. Use repeated turns to bring each crate out of the square.",
    "map": [
      "~~~~~~~~",
      "~.     ~",
      "~@##$# ~",
      "~  $ ##~",
      "~. $#  ~",
      "~.   #E~",
      "~~~~~~~~"
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
        "z": 3,
        "channel": 1
      }
    ],
    "ice": [
      {
        "x": 3,
        "z": 1
      },
      {
        "x": 2,
        "z": 3
      },
      {
        "x": 1,
        "z": 4
      },
      {
        "x": 2,
        "z": 5
      },
      {
        "x": 4,
        "z": 5
      }
    ]
  },
  {
    "name": "Frozen Ratchet",
    "subtitle": "",
    "hint": "A filled mark is temporary storage. Return that crate to the square before making the lower deliveries.",
    "map": [
      "~~~~~~~~",
      "~.# # E~",
      "~ $    ~",
      "~@ #$  ~",
      "~#$# .#~",
      "~# #  .~",
      "~~~~~~~~"
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
        "z": 2,
        "channel": 1
      }
    ],
    "ice": [
      {
        "x": 5,
        "z": 1
      },
      {
        "x": 5,
        "z": 3
      },
      {
        "x": 6,
        "z": 3
      }
    ]
  },
  {
    "name": "Cold Exchange",
    "subtitle": "",
    "hint": "Move the crates between the square and the outside lane. Leave room to reach the upper plate again.",
    "map": [
      "~~~~~~~~",
      "~.# #  ~",
      "~@$#  E~",
      "~  #$# ~",
      "~. $ .#~",
      "~#     ~",
      "~~~~~~~~"
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
        "z": 1,
        "channel": 1
      }
    ],
    "ice": [
      {
        "x": 5,
        "z": 2
      },
      {
        "x": 1,
        "z": 3
      },
      {
        "x": 2,
        "z": 3
      },
      {
        "x": 5,
        "z": 4
      },
      {
        "x": 5,
        "z": 5
      }
    ]
  },
  {
    "name": "Remote Winter",
    "subtitle": "",
    "hint": "The robot must work around the icy plate while moving both crates. Line up your exit crossing before releasing the plate.",
    "map": [
      "~~~~~~~~~~~~",
      "~    #~ #  ~",
      "~#$   ~ $$ ~",
      "~    #~.   ~",
      "~   @.~# # ~",
      "~E####~ .  ~",
      "~~~~~~~~~~~~"
    ],
    "robots": [
      {
        "x": 9,
        "z": 3,
        "direction": 0
      }
    ],
    "bridges": [
      {
        "x": 1,
        "z": 4,
        "height": 0,
        "channel": 2
      }
    ],
    "switches": [
      {
        "x": 8,
        "z": 3,
        "channel": 2
      }
    ],
    "ice": [
      {
        "x": 4,
        "z": 2
      },
      {
        "x": 10,
        "z": 2
      },
      {
        "x": 3,
        "z": 3
      },
      {
        "x": 8,
        "z": 3
      },
      {
        "x": 10,
        "z": 5
      }
    ]
  },
  {
    "name": "Signal Drift",
    "subtitle": "",
    "hint": "Use the upper ice to change your timing against the robot. Finish its right-hand delivery before crossing the bridge.",
    "map": [
      "~~~~~~~~~~~~",
      "~     ~  . ~",
      "~  #.#~ # #~",
      "~ $# #~ $$#~",
      "~    #~   .~",
      "~E#@  ~   #~",
      "~~~~~~~~~~~~"
    ],
    "robots": [
      {
        "x": 9,
        "z": 5,
        "direction": 0
      }
    ],
    "bridges": [
      {
        "x": 1,
        "z": 4,
        "height": 0,
        "channel": 2
      }
    ],
    "switches": [
      {
        "x": 10,
        "z": 4,
        "channel": 2
      }
    ],
    "ice": [
      {
        "x": 4,
        "z": 1
      },
      {
        "x": 8,
        "z": 1
      },
      {
        "x": 1,
        "z": 2
      }
    ]
  },
  {
    "name": "Crossed Dispatch",
    "subtitle": "",
    "hint": "The lower ice sends cargo across the robot bay. Catch each crate before lining up the robot with the plate.",
    "map": [
      "~~~~~~~~~~~~",
      "~     ~  # ~",
      "~ $#. ~    ~",
      "~  #  ~ $  ~",
      "~   @#~ $# ~",
      "~E#   ~.  .~",
      "~~~~~~~~~~~~"
    ],
    "robots": [
      {
        "x": 8,
        "z": 5,
        "direction": 0
      }
    ],
    "bridges": [
      {
        "x": 1,
        "z": 4,
        "height": 0,
        "channel": 2
      }
    ],
    "switches": [
      {
        "x": 10,
        "z": 4,
        "channel": 2
      }
    ],
    "ice": [
      {
        "x": 3,
        "z": 1
      },
      {
        "x": 1,
        "z": 2
      },
      {
        "x": 10,
        "z": 2
      },
      {
        "x": 3,
        "z": 4
      },
      {
        "x": 10,
        "z": 4
      },
      {
        "x": 8,
        "z": 5
      },
      {
        "x": 9,
        "z": 5
      }
    ]
  }
];
