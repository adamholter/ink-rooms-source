import type { Level } from './puzzle.ts';

// Original authored candidates, screened and replayed against the production rules.
export const CHALLENGE_CUBE_LEVELS: Level[] = [
  {
    "name": "Cold Meridian",
    "subtitle": "The ice carries both cargo and your route around the cube.",
    "hint": "Use the second crate as a brake before sending the first one across a seam.",
    "cube": {
      "size": 4
    },
    "map": [
      " ~E~   @ .    ~ ~   .   ",
      "   ~~            ~      ",
      "   ~  ~~ ~   ~$$ ~~  ~~ ",
      "  ~         ~    ~ ~~   "
    ],
    "ice": [
      {
        "x": 15,
        "z": 1
      },
      {
        "x": 5,
        "z": 1
      },
      {
        "x": 11,
        "z": 2
      },
      {
        "x": 11,
        "z": 1
      },
      {
        "x": 10,
        "z": 1
      },
      {
        "x": 21,
        "z": 0
      },
      {
        "x": 23,
        "z": 2
      }
    ],
    "challenge": true
  },
  {
    "name": "Polar Exchange",
    "subtitle": "A delivery on one face changes your approach to another.",
    "hint": "Trade which crate you move. Committing either one too early closes the useful approaches.",
    "cube": {
      "size": 4
    },
    "map": [
      ".  ~    ~ ~~  ~    ~~  ~",
      " ~~  ~             ~~~ ~",
      " ~@   ~  $ ~  ~~  ~ E $~",
      "       ~ ~ ~~.     ~~   "
    ],
    "ice": [
      {
        "x": 13,
        "z": 1
      },
      {
        "x": 13,
        "z": 2
      },
      {
        "x": 3,
        "z": 1
      },
      {
        "x": 15,
        "z": 3
      },
      {
        "x": 19,
        "z": 2
      },
      {
        "x": 14,
        "z": 3
      },
      {
        "x": 12,
        "z": 1
      },
      {
        "x": 18,
        "z": 3
      }
    ],
    "challenge": true
  },
  {
    "name": "Borrowed Passage",
    "subtitle": "The switch crate has another job after the crossing.",
    "hint": "Borrow a crate to hold the bridges, move the other cargo through, then recover your bridge weight.",
    "cube": {
      "size": 4
    },
    "map": [
      " ~ ~~    ~~. ~~ ~~  ~ ~ ",
      "~   ~  ~ E~ ~~   ~~ ~   ",
      " $$   ~~          @~   ~",
      "   ~      ~ .      ~~~  "
    ],
    "ice": [
      {
        "x": 15,
        "z": 2
      },
      {
        "x": 17,
        "z": 3
      },
      {
        "x": 16,
        "z": 3
      },
      {
        "x": 15,
        "z": 0
      },
      {
        "x": 18,
        "z": 3
      },
      {
        "x": 8,
        "z": 3
      },
      {
        "x": 0,
        "z": 2
      },
      {
        "x": 1,
        "z": 1
      }
    ],
    "switches": [
      {
        "x": 1,
        "z": 2,
        "channel": 0
      }
    ],
    "bridges": [
      {
        "x": 16,
        "z": 1,
        "channel": 0,
        "height": 0
      },
      {
        "x": 13,
        "z": 3,
        "channel": 0,
        "height": 0
      }
    ],
    "challenge": true
  },
  {
    "name": "Permafrost Circuit",
    "subtitle": "Keep the circuit alive while the cargo changes faces.",
    "hint": "Use the frozen lanes to stage cargo before releasing the switch. Check which bridge you still need.",
    "cube": {
      "size": 4
    },
    "map": [
      "~  ~   E~   ~      ~  ~ ",
      "~@  ~~~~ $~  ~~ ~ ~.    ",
      "     ~ $           . ~ ~",
      "  ~          ~   ~~  ~ ~"
    ],
    "ice": [
      {
        "x": 18,
        "z": 2
      },
      {
        "x": 3,
        "z": 1
      },
      {
        "x": 17,
        "z": 0
      },
      {
        "x": 15,
        "z": 2
      },
      {
        "x": 7,
        "z": 3
      },
      {
        "x": 20,
        "z": 3
      },
      {
        "x": 11,
        "z": 0
      }
    ],
    "switches": [
      {
        "x": 7,
        "z": 2,
        "channel": 0
      }
    ],
    "bridges": [
      {
        "x": 15,
        "z": 1,
        "channel": 0,
        "height": 0
      },
      {
        "x": 19,
        "z": 3,
        "channel": 0,
        "height": 0
      }
    ],
    "challenge": true
  }
];
