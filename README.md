# MV Barishal – River Boat Simulator

A top-down boat driving game built with **Phaser 4** (`phaser.js`, v4.2.1).
Drive four different water vehicles on a river with islands, a launch ghat, buoys and a current.

The current milestone is the **core driving mechanics**. Fuel, missions and the rest come later (see the roadmap below).

## Running it

The game uses ES modules, so it has to be served over HTTP. Opening `index.html` directly from disk won't work.

Pick any of these from the project folder:

```bash
# VS Code: install the "Live Server" extension, right-click index.html -> Open with Live Server
python -m http.server 8000      # then open http://localhost:8000
npx serve .                      # then open the URL it prints
```

## Controls

| Key | Action |
| --- | --- |
| `W` / `S` (or ↑ / ↓) | Throttle ahead / astern |
| `A` / `D` (or ← / →) | Rudder port / starboard |
| `Q` / `E` | Bow thruster (MV Barishal only) |
| `Space` | All stop (lever boats) |
| `C` | Cycle camera: Chase → Heading-up → Wide |
| `V` | Switch to the next vessel on the spot |
| `R` | Reset to the launch ghat |
| `H` | Show / hide the help panel |
| `Esc` | Back to the vessel menu |

## The vessels

| Vessel | Feel | Throttle |
| --- | --- | --- |
| **Jet Ski** | Tiny, very fast, slides through corners | Hold to accelerate |
| **Speedboat** | Fast, grippy, carves clean turns | Hold to accelerate |
| **Engine Nouka** | Slow wooden country boat, sluggish diesel | Lever (stays where you set it) |
| **MV Barishal** | Huge passenger launch, enormous inertia, bow thruster | Lever |

Measured handling (from a headless physics run):

| Vessel | Top speed | 0 → 90% | Full-lock turn keeps | Coast to stop |
| --- | --- | --- | --- | --- |
| Jet Ski | 46 kn | 2.2 s | ~46% speed | ~10 s |
| Speedboat | 41 kn | 2.8 s | ~70% speed | ~13 s |
| Engine Nouka | 19 kn | 4.6 s | ~77% speed | ~15 s |
| MV Barishal | 15 kn | 12.4 s | ~83% speed | ~50 s |

## Project structure

```
index.html                 Loads phaser.js, then src/main.js as a module
phaser.js                  Phaser 4.2.1
src/
  main.js                  Phaser game config and scene list
  config/
    constants.js           Screen size, colours, draw depths, px/s -> knots
    vehicles.js            ★ All vessel stats. Tune handling here.
    world.js               Map size, river current, ghat, spawn, island seed
  entities/
    Boat.js                ★ Boat physics (throttle, drag, keel, rudder, collisions)
  systems/
    BoatControls.js        Keyboard -> input object { throttleAxis, steerAxis, thrusterAxis, allStop }
    WakeSystem.js          Pooled foam particles: V-wake, prop churn, bow wave / spray
  world/
    WaterWorld.js          Water, shore, islands, ghat, buoys, collision shapes + resolution
  gfx/
    TextureFactory.js      Draws every texture in code (no art files needed yet)
  scenes/
    BootScene.js           Builds textures (load real assets here later)
    MenuScene.js           Vessel select
    GameScene.js           Main loop: fixed-step physics, cameras, minimap, hotkeys
    HUDScene.js            Dashboard: throttle, speed, rudder, heading, help, toasts
```

## How the driving model works

Everything is in [src/entities/Boat.js](src/entities/Boat.js). No physics engine. It's a small custom model that runs at a fixed 120 Hz.

1. **Throttle → engine.** Input moves the throttle (a pedal on small boats, a lever on big ones). Engine output follows the throttle at `engineResponse`, so a big diesel takes a while to spool up. The lever stops at STOP when you cross from ahead to astern.
2. **Forward motion.** Velocity is split into forward and sideways parts relative to the hull. Forward speed gets `thrust − (linearDrag·v + quadDrag·v²)`. `quadDrag` is derived so full throttle settles exactly at `maxSpeed`.
3. **Keel.** Sideways speed decays at `lateralGrip`. `keelCarry` decides how much of it is turned back into forward speed (a carved turn) and how much is scrubbed off (a skid). Drift happens naturally because the hull rotates while the velocity lags behind.
4. **Rudder.** Turn rate = `rudder × turnRate × authority`. Authority comes from water flowing past the rudder (forward speed ÷ `steerSpeedRef`) plus `propWash` from the engine. Reversing flips the steering, just like a real boat. `yawResponse` sets how heavy the hull feels.
5. **River current.** It is added to the boat's velocity, so idle boats drift downstream. The wake drifts with it too.
6. **Collisions.** The hull is a chain of circles along its centre line, tested against circles (islands) and rectangles (shore, ghat). Impacts bounce, scrape speed, spin the hull if off-centre and shake the camera. Buoys are moored on springs and get shoved aside.

### Adding a new vessel

1. Copy an entry in `src/config/vehicles.js` and give it a new `id`.
2. Point `painter` at an existing painter, or add one to `BOAT_PAINTERS` in `TextureFactory.js`. To use real art, load an image in `BootScene` with the key `boat-<id>`. Draw it facing right.
3. That's it. The menu, the `V` switching and the HUD pick it up automatically.

## Roadmap

**Phase 1 – Core driving (this milestone)** ✅
- [x] Four vessels on one shared physics model
- [x] Hold-throttle and lever-throttle styles, engine lag, reverse
- [x] Rudder needs flow; prop wash; drift; bow thruster
- [x] River current, collisions, buoys
- [x] Wake, spray, prop churn, planing shadow
- [x] Chase / heading-up / wide camera, minimap, dashboard HUD

**Phase 2 – Fuel & economy**
- Add `fuelCapacity` / `fuelBurn` to each vessel spec. Burn fuel in `Boat.update` in proportion to `|engine|`, and cut thrust when the tank is empty.
- Fuel stations as world zones (in `WaterWorld`, like the ghat). Slow down inside one to refuel. Fuel gauge in the HUD.
- Money: fares and deliveries pay; fuel and repairs cost.

**Phase 3 – Gameplay**
- Docking challenges: stop alongside the pontoon below a speed limit (bow thruster matters here).
- Passenger and cargo runs between ghats. Time trials through the slalom buoys.
- Hull damage from impacts (`applyImpact` already returns the impact strength).

**Phase 4 – World & feel**
- Larger river map (Tiled tilemap), more ghats, shallow water that slows you down
- Wind and waves, day/night, rain
- AI river traffic (it can reuse `Boat` and feed it its own input object, the same way `BoatControls` does)
- Engine and water sounds, horn
- Gamepad and touch controls (just produce the same input object)
- Save progress
