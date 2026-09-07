# Challenge rooms

Rooms 49 through 58 are new layouts. Rooms 1 through 48 remain unchanged. Challenge replaces the Remix name and contains its two previous rooms plus these ten.

| Room | Mechanics | Shortest moves | Minimum pushes | Playable cells | Crate switches on recorded route |
|---|---|---:|---:|---:|---:|
| 49. Rime Relay | rotation, ice | 61 | 13 | 22 | 6 |
| 50. Frozen Ratchet | rotation, ice | 106 | 17 | 21 | 8 |
| 51. Cold Exchange | rotation, ice | 66 | 12 | 22 | 4 |
| 52. Remote Winter | robot, ice, switch bridge | 69 | 12 | 34 | 6 |
| 53. Signal Drift | robot, ice, switch bridge | 67 | 12 | 34 | 4 |
| 54. Crossed Dispatch | robot, ice, switch bridge | 57 | 12 | 38 | 3 |
| 55. Cold Meridian | cube, ice | 56 | 15 | 74 | 7 |
| 56. Polar Exchange | cube, ice | 66 | 13 | 67 | 3 |
| 57. Borrowed Passage | cube, ice, switch bridges | 69 | 13 | 66 | 4 |
| 58. Permafrost Circuit | cube, ice, switch bridges | 67 | 12 | 70 | 5 |

Minimum-push searches give walking and platform turns zero cost. These scores cannot be inflated by adding walking distance. Shortest moves use complete movement states, including robot positions, platform rotations, and cube orientation. Crate switches count changes between moving one crate and another on the recorded route. They are route observations, not proven minimums.

Each flat room is unsolvable with its main rotation or robot mechanic removed. Frozen Ratchet requires moving a crate away from a filled goal. The rotation rooms need 13, 18, and 8 platform turns on their shortest routes. The robot rooms need 7, 5, and 7 robot pushes on their shortest routes.

All four cube rooms are unsolvable without ice. Their recorded solutions visit five or six faces and cross edges with cargo repeatedly. The two cube bridge rooms cannot be solved with their bridges disabled. Every cube floor layout differs from the other seven under all 24 physical cube orientations.

Ice-removal checks distinguish necessity from difficulty. Remote Winter is unsolvable without ice. Removing ice reduces the shortest routes in Rime Relay, Frozen Ratchet, and Cold Exchange by 25, 35, and 11 moves. Signal Drift drops from 67 to 46 moves. Crossed Dispatch changes from 57 to 56 moves, so its difficulty rests on robot and bridge coordination, rather than a claimed move-count increase from ice. Its ice still changes cargo and robot movement.

The fixtures retain exact paths, bounded search results, and mechanic-removal checks. A capped search is not treated as proof of impossibility. These measurements screen for planning requirements; they do not prove that every player will find every room equally hard.

Level generation used original seeded floor patterns and reachable crate configurations. Public layouts were not used as generation inputs. The finite corpus audit and within-campaign comparisons are in [the originality report](challenge-expansion-audit.md). These checks do not prove worldwide uniqueness.
