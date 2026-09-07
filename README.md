# Ink Rooms

A monochrome 3D puzzle game by Adam Holter, built with help from OpenAI Astra, using Three.js. Push crates onto marks across 48 rooms. Later rooms add height, switches, elevators, bridges, robots, ice, rotating sections, and cube worlds.

[Play the game](https://adam-ink-playground.vercel.app/) · [Support Adam](https://buymeacoffee.com/adamholter)

The code is MIT-licensed. Adam's character and the bundled media are included under a separate [reserved asset license](ASSET-RIGHTS.md), so you can run the game locally without granting general reuse of his likeness.

![Ink Rooms](docs/screenshot.png)

The screenshot and character shown above are covered by the reserved asset license.

## Run locally

Use Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Everything runs in your browser. No account, API key, or backend is needed.

```sh
npm run validate   # puzzle tests, typecheck, production build
npm run build      # static files in dist-game/
npm run preview    # serve the production build locally
```

## Controls

- WASD or arrow keys to move and push. Touch devices have directional buttons.
- Z to undo, R to restart, H for a hint, V for the full-platform view.
- Drag to orbit and scroll to zoom.
- Use Levels to visit the level world. Walk into a door beneath its miniature to enter that room. The dropdown remains available.
- The area buttons take you to themed islands. One crate push opens the bridge island; the cube gate takes you onto the walkable cube.
- In the level world, hold one direction for three steps to start accelerating, up to 2.4 times normal speed. Stopping or turning resets your speed.
- Stand on the Rotation island switch to turn its floor. The Ice island uses a checkerboard with dry stopping tiles.
- Use Levels again to resume your unfinished room. Finishing room 48 returns to the level world.
- Walk into raised ledges to climb automatically. There is no jump button.
- The speaker and theme buttons toggle sound and the white or black background.

Progress and preferences stay in local storage. Music begins after your first interaction.

## Mechanics

Crates move across the same floor height or down to a lower floor. Drops between floors are permanent until you undo. Falling off the platform restores the previous safe move.

Pressure plates operate numbered elevators and bridges. Each successful player move tells the robot to move in the same direction. If the robot is blocked, it stays put while you move.

On ice, the player or a pushed crate slides straight until reaching dry floor or an obstacle. Sliding over an open edge causes a fall. Robots brake at edges.

A newly activated turntable switch rotates its section clockwise by 90 degrees, carrying its floor, walls, targets, and occupants. Release and reactivate the switch for another turn. Undo works during the animation.

Rooms 45 through 48 are cube worlds. Walk across an edge to roll the next face upward. Crates can cross an edge, but a crate on the landing tile blocks you from following. Missing tiles open into a black hole at the center. Walking or pushing a crate into a hole plays an inward fall, then restores the last safe move. Drag to inspect the other faces, including underneath.

## Source map

- `src/puzzle.ts`: movement, machinery, state, and hint solving.
- `src/game.ts`: rendering, input, camera, and animation.
- `src/cube-topology.ts`, `src/cube-view.ts`: six-face movement and whole-cube animation.
- `src/*-levels.ts`: room layouts.
- `src/art.ts`, `src/machinery-art.ts`, `src/robot-art.ts`, `src/rotation-art.ts`: procedural models.
- `src/hint-worker.ts`: background hint worker.
- `public/character.glb`: rigged character with Idle and Run animations.
- `public/audio/`: music and sound effects.
- `scripts/test-*.ts` and `scripts/fixtures/`: rules, solution paths, and difficulty checks.

The current layouts replaced early designs that reused public Sokoban puzzles. A finite audit of all 48 current room maps found no exact matches against 10,902 public entries. Rooms 37 through 44 also passed the [near-match checks](scripts/audit-data/rotation-expansion-audit.md). This does not prove worldwide uniqueness. Public puzzle collections are not bundled here. `npm run audit:originality` downloads the attributed collections listed in `scripts/audit-data/sources.json` and runs the comparison.

The cube chapter has separate shortest-path, minimum-push, and required cargo-crossing proofs in `scripts/fixtures/cube-room-design.json`. The [cube audit](scripts/audit-data/cube-expansion-audit.md) compares the stored six-face map strips against the flat public corpus. It does not establish originality against other cube-world puzzles.

The [rotation difficulty report](scripts/audit-data/rotation-difficulty.md) records the room 39 revision and room 44 addition, with minimum-push and temporary-parking proofs.

## Credits and license

Source code is MIT-licensed under [LICENSE-CODE](LICENSE-CODE). The character, likeness, and bundled media are excluded. See [license scope](LICENSE), [asset rights](ASSET-RIGHTS.md), and [credits](CREDITS.md).

You may clone the repository and play or test the game locally under the asset terms. To publish your own game or reuse the character elsewhere, replace the reserved assets or obtain Adam's separate written permission. These asset restrictions do not restrict reuse of the MIT-licensed code.

The public source release is [adamholter/ink-rooms-source](https://github.com/adamholter/ink-rooms-source). Its history begins with these separate license terms.

## Adding rooms to the level world

The hub catalog reads `LEVELS`. New flat rooms receive doors and miniatures on themed extension islands; new cube rooms receive doors on the cube. Validation requires exactly one hub entrance per campaign room and checks that extension paths reach each island without passing through a room door.

The current cube pavilion has space for 24 cube rooms. Exceeding that capacity fails validation and requires expanding the pavilion before publishing.
