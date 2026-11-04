/**
 * Vehicle definitions. Every boat uses the same physics code (src/entities/Boat.js);
 * these numbers alone make them feel different.
 *
 * Units: pixels, seconds, radians. Speeds are px/s (HUD converts to knots).
 *
 *  length, width     Hull size in px. Also drives the collision shape.
 *  thrust            Acceleration at full throttle (px/s²).
 *  maxSpeed          Top speed through the water at full throttle (px/s).
 *  linearDrag        Water drag that matters at low speed (how fast it coasts to a stop).
 *  reverseRatio      Reverse thrust as a fraction of forward thrust.
 *  engineResponse    How fast engine power follows the throttle (per second). Low = sluggish diesel.
 *  throttleMode      'hold'  -> W/S work like a gas pedal, release to idle.
 *                    'lever' -> W/S move a throttle lever that stays where you leave it.
 *  leverRate         Lever travel per second while W/S is held ('lever' mode only).
 *  maxRudderDeg      Rudder angle at full lock (HUD display only).
 *  rudderRate        How fast the rudder swings to full lock (per second, 0..1 range).
 *  rudderReturn      How fast the rudder re-centres when A/D are released.
 *  turnRate          Max yaw rate (rad/s) at full rudder once moving at steerSpeedRef.
 *  steerSpeedRef     Speed (px/s) at which the rudder reaches full authority.
 *  propWash          Steering you get from engine thrust even when barely moving.
 *  yawResponse       How quickly the hull follows the rudder. Low = heavy, slow to start/stop turning.
 *  lateralGrip       How fast sideways sliding dies out. Low = drifty.
 *  keelCarry         Share of sideways speed the keel turns back into forward speed (0..1).
 *  turnDrag          Extra speed lost while turning hard.
 *  bowThruster       Extra yaw rate from Q/E at low speed (0 = none).
 *  planing           Planing hulls lift at speed (bigger shadow, flat spray instead of bow wave).
 *  zoom              Default camera zoom for this vessel.
 */
const RAW_VEHICLES = [
    {
        id: 'jetski',
        name: 'Jet Ski',
        class: 'Personal watercraft',
        description: 'Tiny, twitchy and quick. Slides through corners.',
        painter: 'jetski',
        length: 44, width: 20,
        thrust: 320, maxSpeed: 380, linearDrag: 0.35, reverseRatio: 0.3,
        engineResponse: 4.0, throttleMode: 'hold', leverRate: 0,
        maxRudderDeg: 30, rudderRate: 6.0, rudderReturn: 8.0,
        turnRate: 3.2, steerSpeedRef: 110, propWash: 0.7, yawResponse: 8.0,
        lateralGrip: 1.6, keelCarry: 0.85, turnDrag: 0.1,
        bowThruster: 0, planing: true, zoom: 1.35
    },
    {
        id: 'speedboat',
        name: 'Speedboat',
        class: 'Outboard runabout',
        description: 'Fast and planted. Carves clean turns at speed.',
        painter: 'speedboat',
        length: 76, width: 28,
        thrust: 220, maxSpeed: 340, linearDrag: 0.25, reverseRatio: 0.3,
        engineResponse: 2.5, throttleMode: 'hold', leverRate: 0,
        maxRudderDeg: 30, rudderRate: 3.5, rudderReturn: 4.0,
        turnRate: 1.9, steerSpeedRef: 140, propWash: 0.35, yawResponse: 4.0,
        lateralGrip: 3.2, keelCarry: 0.9, turnDrag: 0.15,
        bowThruster: 0, planing: true, zoom: 1.05
    },
    {
        id: 'trawler',
        name: 'Engine Nouka',
        class: 'Wooden river boat',
        description: 'Slow diesel country boat. Set the lever and steer early.',
        painter: 'nouka',
        length: 100, width: 30,
        thrust: 70, maxSpeed: 160, linearDrag: 0.18, reverseRatio: 0.45,
        engineResponse: 1.2, throttleMode: 'lever', leverRate: 0.8,
        maxRudderDeg: 35, rudderRate: 1.6, rudderReturn: 1.2,
        turnRate: 0.9, steerSpeedRef: 80, propWash: 0.5, yawResponse: 1.8,
        lateralGrip: 2.2, keelCarry: 0.85, turnDrag: 0.15,
        bowThruster: 0, planing: false, zoom: 0.9
    },
    {
        id: 'launch',
        name: 'MV Barishal',
        class: 'Passenger river launch',
        description: 'Huge inertia. Plan every turn. Bow thruster for docking.',
        painter: 'launch',
        length: 210, width: 54,
        thrust: 18, maxSpeed: 125, linearDrag: 0.04, reverseRatio: 0.5,
        engineResponse: 0.45, throttleMode: 'lever', leverRate: 0.5,
        maxRudderDeg: 35, rudderRate: 0.7, rudderReturn: 0.3,
        turnRate: 0.32, steerSpeedRef: 70, propWash: 0.4, yawResponse: 0.6,
        lateralGrip: 1.0, keelCarry: 0.85, turnDrag: 0.1,
        bowThruster: 0.14, planing: false, zoom: 0.6
    }
];

/**
 * Derive values from the raw specs. quadDrag is chosen so that full throttle
 * settles exactly at maxSpeed: thrust = linearDrag*v + quadDrag*v².
 */
function finalize(spec) {
    const quadDrag = (spec.thrust - spec.linearDrag * spec.maxSpeed) / (spec.maxSpeed * spec.maxSpeed);
    return Object.freeze({
        ...spec,
        texture: `boat-${spec.id}`,
        quadDrag: Math.max(0, quadDrag)
    });
}

export const VEHICLES = RAW_VEHICLES.map(finalize);

export const getVehicle = (id) => VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
