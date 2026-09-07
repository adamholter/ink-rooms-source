import type { Level } from './puzzle.ts';

// Fresh seeded grids, reverse pulls, shortcut removal and manual selection. See scripts/fixtures/original-flat-design.json.
export const ORIGINAL_FLAT_ROOMS: Level[] = [
  {
    "name": "Passing Place",
    "subtitle": "Two crates need room to pass.",
    "hint": "Keep the lower aisle open while bringing the upper crate around.",
    "map": [
      "~~~~~~~~",
      "~. ~   ~",
      "~   @$ ~",
      "~  #$~ ~",
      "~    ~~~",
      "~    ~~~",
      "~~.    ~",
      "~~~~~~E~"
    ]
  },
  {
    "name": "Three-Way Junction",
    "subtitle": "Three crates compete for the central turning space.",
    "hint": "Move a crate aside before trying to finish its neighbor.",
    "map": [
      "~~~~~~~~~",
      "~ .  ~ ~~",
      "~  # $ ~~",
      "~  #  $ ~",
      "~~.  ## ~",
      "~  $   .~",
      "~ ~@ ~  ~",
      "~~~~~~~E~"
    ]
  },
  {
    "name": "Parking Bay",
    "subtitle": "A marked space can be temporary parking.",
    "hint": "A crate on a mark may still need to move again.",
    "map": [
      "~~~~~~~~",
      "~ ~~   ~",
      "~  $@# ~",
      "~  $ $.~",
      "~  ## ~~",
      "~     ~~",
      "~  ~ ..~",
      "~~~~E~~~"
    ]
  },
  {
    "name": "Cross Traffic",
    "subtitle": "The same aisle carries crates in different directions.",
    "hint": "Keep a route behind the crates until the last turn is complete.",
    "map": [
      "~~~~~~~~",
      "~   .@~~",
      "~  .#$~~",
      "~~ ##  ~",
      "~~. #  ~",
      "~~  $$ ~",
      "~      ~",
      "~~~~~~E~"
    ]
  },
  {
    "name": "Holding Pattern",
    "subtitle": "Crates must repeatedly make room for one another.",
    "hint": "Keep a spare turning space until the last crate has passed.",
    "map": [
      "~~~~~~~~",
      "~.    ~~",
      "~   $@ ~",
      "~~ #   ~",
      "~   ##.~",
      "~ $$ #.~",
      "~  ~   ~",
      "~~~~~~E~"
    ]
  },
  {
    "name": "Return Ticket",
    "subtitle": "Three destinations share their approaches.",
    "hint": "Leave yourself a way behind each crate, even after reaching a mark.",
    "map": [
      "~~~~~~~~~",
      "~ ~  . ~~",
      "~.   #$~~",
      "~ #  # ~~",
      "~ . #   ~",
      "~~$   $ ~",
      "~ @ ~  ~~",
      "~~~~~~E~~"
    ]
  },
  {
    "name": "Narrow Margins",
    "subtitle": "The same turning space serves several deliveries.",
    "hint": "Clear the narrow central aisle before sending crates toward the left.",
    "map": [
      "~~~~~~~~~",
      "~ ~.  ~~~",
      "~ . # $ ~",
      "~   #$# ~",
      "~  # $@ ~",
      "~~      ~",
      "~.  ~   ~",
      "~~~~~~~E~"
    ]
  },
  {
    "name": "Cargo Exchange",
    "subtitle": "The upper and lower aisles depend on each other.",
    "hint": "A crate may have to retrace its route to free another crate.",
    "map": [
      "~~~~~~~~~",
      "~ ..    ~",
      "~~~   $ ~",
      "~  ## ~~~",
      "~. ##  ~~",
      "~ $$    ~",
      "~ @~~   ~",
      "~~~~~~~E~"
    ]
  }
];
