import type { Level } from "./puzzle.ts";

// Original ice chapter. Replay proofs live in scripts/fixtures/ice-room-design.json.
export const ICE_LEVELS: Level[] = [
  {
    "name": "First Frost",
    "subtitle": "",
    "hint": "Push the crate across the blue strip, then follow it. The crate stops on dry floor and catches your slide.",
    "lesson": "Blue tiles are ice. You and crates slide straight until dry floor or an obstacle. Undo reverses the whole slide.",
    "map": [
      "~~~~~~~~",
      "~~    ~~",
      "~~   ~~~",
      "~ @$  .~",
      "~  ~ E ~",
      "~~ ~  ~~",
      "~~~~~~~~"
    ],
    "ice": [
      {
        "x": 4,
        "z": 3
      },
      {
        "x": 5,
        "z": 3
      }
    ]
  },
  {
    "name": "Crosscurrent",
    "subtitle": "",
    "hint": "Keep the lower lane clear. Deliver one crate into the right-hand bay before bringing the other down to its mark.",
    "map": [
      "~~~~~~~~~",
      "~~ E ~~~~",
      "~~   ~~~~",
      "~   #  ~~",
      "~      ~~",
      "~  # $@ ~",
      "~#$     ~",
      "~    . .~",
      "~~~~~~~~~"
    ],
    "ice": [
      {
        "x": 1,
        "z": 7
      },
      {
        "x": 2,
        "z": 3
      },
      {
        "x": 5,
        "z": 3
      },
      {
        "x": 4,
        "z": 7
      },
      {
        "x": 6,
        "z": 4
      },
      {
        "x": 5,
        "z": 6
      },
      {
        "x": 4,
        "z": 4
      }
    ]
  },
  {
    "name": "Long Thaw",
    "subtitle": "",
    "hint": "Bring the right-hand crate to the upper mark. Keep space below the left-hand crate for its trip to the right-hand bay.",
    "map": [
      "~~~~~~~~~~~",
      "~~~.    ~~~",
      "~~~   $$# ~",
      "~  @      ~",
      "~        .~",
      "~  E## ~ ~~",
      "~~~~~~~~~~~"
    ],
    "ice": [
      {
        "x": 5,
        "z": 1
      },
      {
        "x": 3,
        "z": 2
      },
      {
        "x": 6,
        "z": 1
      },
      {
        "x": 4,
        "z": 1
      },
      {
        "x": 4,
        "z": 4
      },
      {
        "x": 7,
        "z": 4
      },
      {
        "x": 5,
        "z": 2
      }
    ]
  },
  {
    "name": "Borrowed Brake",
    "subtitle": "",
    "hint": "Use one crate to catch the other on the ice. Leave the brake on the right while you bring the caught crate around to the left-hand bay.",
    "map": [
      "~~~~~~~~~",
      "~~~ E ~~~",
      "~~~   ~~~",
      "~~#  #  ~",
      "~~# $   ~",
      "~   $   ~",
      "~   #   ~",
      "~.@   . ~",
      "~~~~~~~~~"
    ],
    "ice": [
      {
        "x": 3,
        "z": 7
      },
      {
        "x": 2,
        "z": 5
      },
      {
        "x": 6,
        "z": 4
      },
      {
        "x": 5,
        "z": 5
      },
      {
        "x": 3,
        "z": 3
      },
      {
        "x": 6,
        "z": 6
      },
      {
        "x": 7,
        "z": 7
      }
    ]
  },
  {
    "name": "Cold Storage",
    "subtitle": "",
    "hint": "The lower crate needs room to turn. Stage it off the ice before sending its partner into the left-hand bay.",
    "map": [
      "~~~~~~~~~",
      "~~~ E ~~~",
      "~~~   ~~~",
      "~~    #.~",
      "~~  #   ~",
      "~  $  @ ~",
      "~  $    ~",
      "~. #   #~",
      "~~~~~~~~~"
    ],
    "ice": [
      {
        "x": 5,
        "z": 4
      },
      {
        "x": 2,
        "z": 5
      },
      {
        "x": 3,
        "z": 4
      },
      {
        "x": 5,
        "z": 7
      },
      {
        "x": 7,
        "z": 6
      },
      {
        "x": 5,
        "z": 6
      },
      {
        "x": 4,
        "z": 6
      }
    ]
  }
];
