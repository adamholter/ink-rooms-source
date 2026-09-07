import type { Level } from "./puzzle";

// Rooms18-27: elevators, bridges, then circuits with irreversible drops.
export const MACHINERY_LEVELS: Level[] = [
  {
    "name": "Freight Lift",
    "subtitle": "Raise the crate, then meet it upstairs.",
    "hint": "Load the right crate first. The other crate can keep the lift raised.",
    "lesson": "A crate on a pressure plate keeps every machine with that number active.",
    "map": [
      "~~~~~~~",
      "~.   E~",
      "~     ~",
      "~     ~",
      "~$ $ @~",
      "~.    ~",
      "~~~~~~~"
    ],
    "heights": [
      [
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
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        0,
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
        0
      ],
      [
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
    "switches": [
      {
        "x": 1,
        "z": 5,
        "channel": 1
      }
    ],
    "elevators": [
      {
        "x": 3,
        "z": 3,
        "low": 0,
        "high": 2,
        "channel": 1
      }
    ]
  },
  {
    "name": "Side Loading",
    "subtitle": "Load sideways, then find room for the turn upstairs.",
    "hint": "Push the raised crate fully onto the upper deck before turning toward the mark.",
    "jumping": true,
    "map": [
      "~~~~~~~~~",
      "~  .   E~",
      "~  #    ~",
      "~       ~",
      "~       ~",
      "~  $    ~",
      "~ $     ~",
      "~ .  @  ~",
      "~~~~~~~~~"
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
        0,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
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
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        2,
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
        0,
        0
      ]
    ],
    "switches": [
      {
        "x": 2,
        "z": 7,
        "channel": 1
      }
    ],
    "elevators": [
      {
        "x": 4,
        "z": 5,
        "low": 0,
        "high": 2,
        "channel": 1
      }
    ]
  },
  {
    "name": "Two Stops",
    "subtitle": "One plate raises two distant loads.",
    "hint": "Load both lifts before filling the plate.",
    "map": [
      "~~~~~~~",
      "~    .~",
      "~     ~",
      "~    .~",
      "~$$ $@~",
      "~.   E~",
      "~~~~~~~"
    ],
    "heights": [
      [
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
        2,
        0,
        2,
        0,
        2,
        0
      ],
      [
        0,
        2,
        0,
        2,
        0,
        2,
        0
      ],
      [
        0,
        2,
        0,
        2,
        0,
        2,
        0
      ],
      [
        0,
        2,
        0,
        2,
        0,
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
        0
      ],
      [
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
    "switches": [
      {
        "x": 1,
        "z": 5,
        "channel": 1
      }
    ],
    "elevators": [
      {
        "x": 2,
        "z": 3,
        "low": 0,
        "high": 2,
        "channel": 1
      },
      {
        "x": 4,
        "z": 3,
        "low": 0,
        "high": 2,
        "channel": 1
      }
    ]
  },
  {
    "name": "Lift Exchange",
    "subtitle": "The same elevator must carry two loads.",
    "hint": "Stand on the raised rear switch to lift a load. The front switch takes over as you unload it.",
    "jumping": true,
    "map": [
      "~~~~~~~~~",
      "~  . . E~",
      "~  # #  ~",
      "~       ~",
      "~       ~",
      "~  $    ~",
      "~ $     ~",
      "~    @  ~",
      "~~~~~~~~~"
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
        0,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
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
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        2,
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
        0,
        0
      ]
    ],
    "switches": [
      {
        "x": 4,
        "z": 6,
        "channel": 1
      },
      {
        "x": 4,
        "z": 4,
        "channel": 1
      }
    ],
    "elevators": [
      {
        "x": 4,
        "z": 5,
        "low": 0,
        "high": 2,
        "channel": 1
      }
    ]
  },
  {
    "name": "Span",
    "subtitle": "Hold the plate, cross the gap.",
    "hint": "Leave the first crate on the plate, then take the long way around it.",
    "lesson": "A held pressure plate unfolds its matching bridge. An empty plate folds it away.",
    "map": [
      "~~~~~~~",
      "~  ~ E~",
      "~  ~  ~",
      "~    .~",
      "~$@~ $~",
      "~. ~  ~",
      "~~~~~~~"
    ],
    "jumping": true,
    "switches": [
      {
        "x": 1,
        "z": 5,
        "channel": 1
      }
    ],
    "bridges": [
      {
        "x": 3,
        "z": 3,
        "height": 0,
        "channel": 1
      }
    ]
  },
  {
    "name": "Return Span",
    "subtitle": "Make room on the far bank before the final turns.",
    "hint": "Move each upper crate out from under its divider before turning it toward a mark.",
    "jumping": true,
    "map": [
      "~~~~~~~~~",
      "~  . . E~",
      "~  # #  ~",
      "~  $ $  ~",
      "~       ~",
      "~~~~ ~~~~",
      "~  #    ~",
      "~ $     ~",
      "~   .@  ~",
      "~~~~~~~~~"
    ],
    "switches": [
      {
        "x": 4,
        "z": 8,
        "channel": 1
      }
    ],
    "bridges": [
      {
        "x": 4,
        "z": 5,
        "height": 0,
        "channel": 1
      }
    ]
  },
  {
    "name": "Freight Crossing",
    "subtitle": "Both loads must pass through the shared crossing.",
    "hint": "Keep the bridge powered and clear the upper turning lane before sending the next crate.",
    "jumping": true,
    "map": [
      "~~~~~~~~~",
      "~  . . E~",
      "~  # #  ~",
      "~       ~",
      "~       ~",
      "~~~~ ~~~~",
      "~       ~",
      "~ $ $$  ~",
      "~   .@  ~",
      "~~~~~~~~~"
    ],
    "switches": [
      {
        "x": 4,
        "z": 8,
        "channel": 1
      }
    ],
    "bridges": [
      {
        "x": 4,
        "z": 5,
        "height": 0,
        "channel": 1
      }
    ]
  },
  {
    "name": "Relay Foundry",
    "subtitle": "Load below, relay above, then clear both keepers.",
    "hint": "Load the lift first. The left plate raises it; the numbered mark keeps the crossing open.",
    "map": [
      "~~~~~~~~~",
      "~.  .~  ~",
      "~ $     ~",
      "~ $  ~ .~",
      "~    ~  ~",
      "~  $ ~  ~",
      "~  @ ~ E~",
      "~~~~~~~~~"
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
        0,
        0
      ],
      [
        0,
        0,
        2,
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        0,
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
        0,
        0
      ]
    ],
    "jumping": true,
    "switches": [
      {
        "x": 1,
        "z": 3,
        "channel": 1
      },
      {
        "x": 4,
        "z": 1,
        "channel": 2
      }
    ],
    "elevators": [
      {
        "x": 3,
        "z": 4,
        "low": 0,
        "high": 2,
        "channel": 1
      }
    ],
    "bridges": [
      {
        "x": 5,
        "z": 2,
        "height": 2,
        "channel": 2
      }
    ]
  },
  {
    "name": "Downstream",
    "subtitle": "An upper crossing ends with a lower delivery.",
    "hint": "Send cargo across the upper bridge before dropping it onto the low landing mark.",
    "map": [
      "~~~~~~~~~",
      "~.  .~  ~",
      "~ $  ~  ~",
      "~ $     ~",
      "~    ~  ~",
      "~  $ ~ .~",
      "~  @ ~ E~",
      "~~~~~~~~~"
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
        0,
        0
      ],
      [
        0,
        0,
        2,
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        0,
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
        0,
        0
      ]
    ],
    "jumping": true,
    "switches": [
      {
        "x": 1,
        "z": 3,
        "channel": 1
      },
      {
        "x": 4,
        "z": 1,
        "channel": 2
      }
    ],
    "elevators": [
      {
        "x": 3,
        "z": 4,
        "low": 0,
        "high": 2,
        "channel": 1
      }
    ],
    "bridges": [
      {
        "x": 5,
        "z": 3,
        "height": 2,
        "channel": 2
      }
    ]
  },
  {
    "name": "Coupled Circuit",
    "subtitle": "The crossing opens above the lift, then the keeper must move again.",
    "hint": "The divider blocks the direct route. Free turning space before committing either switch keeper.",
    "map": [
      "~~~~~~~~~",
      "~.     .~",
      "~ $#.~  ~",
      "~ $  ~  ~",
      "~    ~  ~",
      "~  $ ~  ~",
      "~  @ ~ E~",
      "~~~~~~~~~"
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
        0,
        0
      ],
      [
        0,
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        0,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        0,
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
        0,
        0
      ]
    ],
    "jumping": true,
    "switches": [
      {
        "x": 1,
        "z": 3,
        "channel": 1
      },
      {
        "x": 4,
        "z": 2,
        "channel": 2
      }
    ],
    "elevators": [
      {
        "x": 3,
        "z": 4,
        "low": 0,
        "high": 2,
        "channel": 1
      }
    ],
    "bridges": [
      {
        "x": 5,
        "z": 1,
        "height": 2,
        "channel": 2
      }
    ]
  }
];
