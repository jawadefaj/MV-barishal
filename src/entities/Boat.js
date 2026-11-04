import { clamp, approach, damp, wrapAngle } from '../utils/math.js';
import { PX_PER_SEC_TO_KNOTS, DEPTH } from '../config/constants.js';

/**
 * A drivable boat. Pure top-down 2D physics, no physics engine:
 *
 *  1. Throttle input -> lever position -> engine power (engine lags the lever).
 *  2. Velocity is split into forward and sideways parts relative to the hull.
 *     Forward: thrust minus drag. Sideways: decays by `lateralGrip` (the keel).
 *     Turning the hull while the velocity stays put is what produces drift.
 *  3. Rudder only works with water flowing past it, so turn rate scales with
 *     forward speed (plus a little prop wash). Reversing flips the steering.
 *  4. The river current is added on top, so everything drifts downstream.
 *
 * `vx/vy` is velocity through the water; `groundVx/groundVy` includes the current.
 */
export class Boat {
    constructor(scene, spec, x, y, heading = 0) {
        this.scene = scene;
        this.spec = spec;

        this.x = x;
        this.y = y;
        this.heading = heading;     // radians, 0 = east, clockwise positive (screen y is down)
        this.vx = 0;
        this.vy = 0;
        this.groundVx = 0;
        this.groundVy = 0;
        this.yawRate = 0;

        this.throttle = 0;          // lever / pedal position, -1..1
        this.engine = 0;            // actual engine output, -1..1
        this.rudder = 0;            // -1 (port) .. 1 (starboard)
        this.forwardSpeed = 0;
        this.sideSpeed = 0;
        this.leverLocked = false;   // lever stops at zero when crossing from ahead to astern

        this.bobTime = Math.random() * 10;

        this.shadow = scene.add.image(x, y, spec.texture)
            .setTint(0x000000).setAlpha(0.28).setDepth(DEPTH.boatShadow);
        this.sprite = scene.add.image(x, y, spec.texture).setDepth(DEPTH.boat);

        this.colliders = buildColliders(spec);
        this.syncVisuals(0);
    }

    // ------------------------------------------------------------------ physics

    /**
     * @param {number} dt seconds
     * @param {{throttleAxis:number, steerAxis:number, thrusterAxis:number, allStop:boolean}} input
     * @param {{x:number, y:number}} current river current (px/s)
     */
    update(dt, input, current) {
        const s = this.spec;

        this.updateThrottle(dt, input);
        this.engine = approach(this.engine, this.throttle, s.engineResponse * dt);

        if (input.steerAxis !== 0) {
            this.rudder = approach(this.rudder, input.steerAxis, s.rudderRate * dt);
        } else {
            this.rudder = approach(this.rudder, 0, s.rudderReturn * dt);
        }

        // Hull axes
        const fx = Math.cos(this.heading);
        const fy = Math.sin(this.heading);
        const rx = -fy;
        const ry = fx;

        let vf = this.vx * fx + this.vy * fy;   // forward speed
        let vs = this.vx * rx + this.vy * ry;   // sideways speed (positive = starboard)

        // Thrust and drag along the hull
        const thrust = this.engine >= 0 ? this.engine * s.thrust : this.engine * s.thrust * s.reverseRatio;
        const drag = s.linearDrag * vf + s.quadDrag * vf * Math.abs(vf);
        vf += (thrust - drag) * dt;
        vf -= vf * Math.min(1, Math.abs(this.yawRate) * s.turnDrag * dt);

        // Keel resists sideways motion and redirects most of it forward (like a fin),
        // so a carved turn keeps its speed while a skid scrubs it off.
        const vsAfter = vs * Math.exp(-s.lateralGrip * dt);
        if (Math.abs(vf) > 1) {
            // Forward speed that would keep total speed unchanged
            const keepSpeed = Math.sign(vf) * Math.sqrt(vf * vf + vs * vs - vsAfter * vsAfter);
            vf += (keepSpeed - vf) * s.keelCarry;
        }
        vs = vsAfter;

        // Steering: rudder needs flow. Signed, so steering reverses when going astern.
        const flow = clamp(vf / s.steerSpeedRef, -1, 1);
        const wash = Math.max(0, this.engine) * s.propWash;
        const authority = clamp(flow + wash * (1 - Math.abs(flow)), -1, 1);
        let targetYaw = this.rudder * s.turnRate * authority;

        // Bow thruster: strong at low speed, fades as the boat picks up speed
        if (s.bowThruster > 0 && input.thrusterAxis !== 0) {
            const eff = 1 - 0.8 * clamp(Math.abs(vf) / s.steerSpeedRef, 0, 1);
            targetYaw += input.thrusterAxis * s.bowThruster * eff;
            vs += input.thrusterAxis * s.bowThruster * 40 * eff * dt;
        }

        this.yawRate = damp(this.yawRate, targetYaw, s.yawResponse, dt);
        this.heading = wrapAngle(this.heading + this.yawRate * dt);

        // Back to world space
        this.vx = fx * vf + rx * vs;
        this.vy = fy * vf + ry * vs;
        this.forwardSpeed = vf;
        this.sideSpeed = vs;

        this.groundVx = this.vx + current.x;
        this.groundVy = this.vy + current.y;
        this.x += this.groundVx * dt;
        this.y += this.groundVy * dt;
    }

    updateThrottle(dt, input) {
        const s = this.spec;

        if (s.throttleMode === 'hold') {
            this.throttle = input.throttleAxis;
            return;
        }

        // Lever mode
        if (input.allStop) {
            this.throttle = 0;
            return;
        }
        if (this.leverLocked) {
            if (input.throttleAxis === 0) this.leverLocked = false;
            return;
        }
        if (input.throttleAxis === 0) return;

        const prev = this.throttle;
        let next = clamp(prev + input.throttleAxis * s.leverRate * dt, -1, 1);
        // Detent at STOP: going from ahead to astern (or back) pauses at zero until the key is released
        if (prev !== 0 && Math.sign(next) !== Math.sign(prev)) {
            next = 0;
            this.leverLocked = true;
        }
        this.throttle = next;
    }

    /**
     * Bounce off a solid. (nx, ny) points away from the obstacle,
     * (ox, oy) is where the hit happened relative to the boat centre.
     * Returns the impact strength (px/s of speed killed).
     */
    applyImpact(nx, ny, ox, oy) {
        const vn = this.vx * nx + this.vy * ny;
        if (vn >= 0) return 0;

        const restitution = 0.25;
        const j = -(1 + restitution) * vn;
        this.vx += nx * j;
        this.vy += ny * j;

        // Scrape: lose some speed along the wall
        const tx = -ny;
        const ty = nx;
        const vt = this.vx * tx + this.vy * ty;
        this.vx -= tx * vt * 0.15;
        this.vy -= ty * vt * 0.15;

        // Off-centre hits spin the hull (rod inertia ~ L²/12, halved to keep it playable)
        const L = this.spec.length;
        this.yawRate += (ox * ny - oy * nx) * j * 6 / (L * L);

        return j;
    }

    /** Collision circles along the hull centre line, in world space. */
    getColliders() {
        const fx = Math.cos(this.heading);
        const fy = Math.sin(this.heading);
        for (const c of this.colliders) {
            c.ox = fx * c.along;
            c.oy = fy * c.along;
            c.x = this.x + c.ox;
            c.y = this.y + c.oy;
        }
        return this.colliders;
    }

    // ------------------------------------------------------------------ info

    get speedKnots() {
        return Math.hypot(this.groundVx, this.groundVy) * PX_PER_SEC_TO_KNOTS;
    }

    get waterSpeed() {
        return Math.hypot(this.vx, this.vy);
    }

    /** 0..1, how far up on the plane a planing hull is. */
    get planeFactor() {
        if (!this.spec.planing) return 0;
        const m = this.spec.maxSpeed;
        return clamp((this.forwardSpeed - 0.35 * m) / (0.4 * m), 0, 1);
    }

    /** Compass heading in degrees, 0 = north. */
    get compassDeg() {
        const deg = (this.heading * 180) / Math.PI + 90;
        return ((deg % 360) + 360) % 360;
    }

    // ------------------------------------------------------------------ visuals

    syncVisuals(dt) {
        this.bobTime += dt;
        const s = this.spec;
        const plane = this.planeFactor;

        // Gentle bob, less on big ships
        const bob = Math.sin(this.bobTime * 2.2) * (0.012 * 60 / (s.length + 20));
        // Slight lean into turns squashes the hull width a touch
        const lean = clamp(Math.abs(this.yawRate * this.forwardSpeed) / (s.maxSpeed * 2), 0, 0.08);

        this.sprite.setPosition(this.x, this.y);
        this.sprite.setRotation(this.heading);
        this.sprite.setScale(1 + bob, 1 + bob - lean);

        // Planing hulls lift out of the water: shadow drifts further away
        const off = 3 + s.width * 0.08 + plane * 6;
        this.shadow.setPosition(this.x + off, this.y + off * 1.3);
        this.shadow.setRotation(this.heading);
        this.shadow.setScale(1, 1 - lean);
    }

    destroy() {
        this.sprite.destroy();
        this.shadow.destroy();
    }
}

function buildColliders(spec) {
    const r = spec.width / 2;
    const n = Math.max(2, Math.ceil(spec.length / spec.width));
    const span = spec.length / 2 - r;
    const out = [];
    for (let i = 0; i < n; i++) {
        const along = -span + (2 * span * i) / (n - 1);
        out.push({ along, r, x: 0, y: 0, ox: 0, oy: 0 });
    }
    return out;
}
