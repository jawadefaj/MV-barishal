export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Move `current` toward `target` by at most `maxDelta`. */
export const approach = (current, target, maxDelta) =>
    current < target ? Math.min(current + maxDelta, target) : Math.max(current - maxDelta, target);

/** Frame-rate independent exponential smoothing. */
export const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

/** Wrap an angle to [-PI, PI]. */
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Small seeded random generator so the world looks the same every run. */
export function seededRandom(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}
