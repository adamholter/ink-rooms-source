import type { Level } from './puzzle.ts';

// New layouts created 2026-09-05 from seeded geometry search, then individually revised.
// No imported level data. Design evidence lives in original-terraces-design.json.
export const ORIGINAL_TERRACES: Level[] = [
  {
    "name": "Upper Berth",
    "subtitle": "Three crates share the upper loading lane.",
    "hint": "Keep access behind the upper crates before committing one to the lower mark.",
    "map": [
      "~~~~~~~~~",
      "~   .# #~",
      "~  .   #~",
      "~ #  @  ~",
      "~   $$$ ~",
      "~E# #. #~",
      "~ # #   ~",
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
        0,
        0,
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
      ]
    ],
    "jumping": true
  },
  {
    "name": "Narrow Landing",
    "subtitle": "The turning space belongs to every crate.",
    "hint": "Use the upper turning space. The small lower pocket cannot return a crate.",
    "map": [
      "~~~~~~~~~",
      "~  E   #~",
      "~ ##  $ ~",
      "~.## #$ ~",
      "~   #   ~",
      "~  @.$  ~",
      "~   . ##~",
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
        0,
        0,
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
        0,
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
      ]
    ],
    "jumping": true
  },
  {
    "name": "The Long Way Down",
    "subtitle": "Two upper marks and one final descent.",
    "hint": "The shortest route to a mark can block the route needed by the next crate.",
    "map": [
      "~~~~~~~~~",
      "~   .#  ~",
      "~ # $ $@~",
      "~.#  #$ ~",
      "~    . #~",
      "~  # #  ~",
      "~  E    ~",
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
        0,
        0,
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
      ]
    ],
    "jumping": true
  }
];
