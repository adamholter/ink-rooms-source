import type { Level } from './puzzle.ts';

// Original constrained cube layouts. Exact shortest paths and engine replays are recorded in scripts/fixtures/cube-room-design.json.
export const CUBE_LEVELS: Level[] = [
  {
    "name": "Over the Edge",
    "subtitle": "A crate can leave the face beneath your feet.",
    "hint": "Push the crate across the edge, then approach it from the next face.",
    "lesson": "Walk over an edge to roll onto the next face. Crates wrap too; occupied landing tiles block crossings. Holes return you to your last safe move.",
    "cube": {
      "size": 4
    },
    "map": [
      "~~~~~  ~ ~   ~ ~ ~~     ",
      "~~~~ @~~~   ~~~~~ ~  ~  ",
      "     ~~~~~~$  ~~   ~E~~~",
      " ~  ~~~~~~  ~ ~~.~~~~~~~"
    ]
  },
  {
    "name": "Six Sides In",
    "subtitle": "Find a route around both deliveries.",
    "hint": "Circle the cube to reach the other side of each crate.",
    "cube": {
      "size": 4
    },
    "map": [
      "      ~    ~. ~ ~~  .$  ",
      " ~~~~~  ~~     ~~~ ~   ~",
      "~~~E ~ ~~~ ~~ $@ ~    ~~",
      "~   ~~ ~~~~ ~  ~  ~~  ~ "
    ]
  },
  {
    "name": "Round Trip",
    "subtitle": "Carry the route around the corners.",
    "hint": "Get behind each crate before sending it around the next corner.",
    "cube": {
      "size": 4
    },
    "map": [
      "    ~~~  ~  ~ E~~ ~    ~",
      " ~~    @~   ~ $  ~~   ~ ",
      " ~~ ~ $~ ~~      ~      ",
      "  ~ ~  ~.~~  ~~ .   ~  ~"
    ]
  },
  {
    "name": "Seam Allowance",
    "subtitle": "Leave room to approach the next edge.",
    "hint": "Keep the crossing tiles clear while you change faces.",
    "cube": {
      "size": 4
    },
    "map": [
      " ~   ~~   ~    ~.~   ~E ",
      "    ~ ~ ~~ ~   ~~~~  @~~",
      "  ~   $ ~~  ~ ~    ~   ~",
      "      ~      $  ~   ~ ~."
    ]
  }
];
