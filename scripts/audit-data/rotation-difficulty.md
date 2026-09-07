# Rotation difficulty revision

Rooms 37 and 38 are unchanged. Room 39 was redesigned and room 44 was appended, preserving every other room and all existing room numbers.

| Room | Shortest moves | Pushes on shortest route | Minimum pushes across any route | Playable cells excluding exit | Moves per cell |
|---|---:|---:|---:|---:|---:|
| 39, previous | 24 | 5 | 5 | 19 | 1.26 |
| 39, Turn Order | 47 | 10 | 8 | 22 | 2.14 |
| 44, Corner Exchange | 56 | 12 | 10 | 16 | 3.50 |

Minimum-push searches assign zero cost to walking and rotation. Both rooms require moving a crate off a filled mark in every winning route. Restricting those moves exhausts the reachable graph without a win. Turning the mechanism off also makes both rooms unsolvable. The fixtures include reproducible staging mistakes with exhaustive deadlock proofs.

All 44 rooms passed the finite audit against 10,902 public entries. Neither changed room has an exact or near match at the 0.82 threshold, including comparisons with the rest of the campaign. This does not prove internet-wide uniqueness. Public layouts were used for rejection checks after authoring, not as design inputs.

Validation: npm run validate, headless browser replays with hints, full solutions, rendered actor positions, mid-turn undo, victory, restart, and phone-width layout checks.
