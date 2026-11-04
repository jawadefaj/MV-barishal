import { clamp } from '../utils/math.js';
import { DEPTH } from '../config/constants.js';

/**
 * Foam trail behind boats. A fixed pool of images is recycled (oldest first),
 * so there is no garbage and no cap on how long you drive.
 */
export class WakeSystem {
    constructor(scene, size = 600) {
        this.scene = scene;
        this.particles = [];
        this.images = [];
        this.next = 0;

        for (let i = 0; i < size; i++) {
            const img = scene.add.image(0, 0, 'foam').setDepth(DEPTH.wake).setVisible(false);
            this.images.push(img);
            this.particles.push({ img, active: false, life: 0, maxLife: 1, vx: 0, vy: 0, s0: 1, s1: 1, a0: 1 });
        }
        this.resetEmitters();
    }

    resetEmitters() {
        this.trailAcc = 0;
        this.churnAcc = 0;
        this.bowAcc = 0;
    }

    spawn(x, y, vx, vy, life, s0, s1, a0) {
        const p = this.particles[this.next];
        this.next = (this.next + 1) % this.particles.length;
        p.active = true;
        p.life = 0;
        p.maxLife = life;
        p.vx = vx;
        p.vy = vy;
        p.s0 = s0;
        p.s1 = s1;
        p.a0 = a0;
        p.img.setPosition(x, y).setScale(s0).setAlpha(a0).setVisible(true);
    }

    emitFromBoat(boat, dt) {
        const s = boat.spec;
        const L = s.length;
        const W = s.width;
        const fx = Math.cos(boat.heading);
        const fy = Math.sin(boat.heading);
        const rx = -fy;
        const ry = fx;
        const speed = boat.waterSpeed;
        const ratio = clamp(speed / s.maxSpeed, 0, 1);
        const base = W / 32; // foam texture is 32px

        const sternX = boat.x - fx * L * 0.46;
        const sternY = boat.y - fy * L * 0.46;

        // V-shaped trail: particles left in place spread outward while the boat moves on
        if (speed > 8) {
            this.trailAcc += speed * dt;
            const spacing = Math.max(5, W * 0.3);
            while (this.trailAcc >= spacing) {
                this.trailAcc -= spacing;
                const spread = 6 + speed * 0.12;
                const life = 1.4 + ratio * 1.8 + L * 0.004;
                for (const side of [-1, 1]) {
                    this.spawn(
                        sternX + rx * side * W * 0.35, sternY + ry * side * W * 0.35,
                        rx * side * spread, ry * side * spread,
                        life, base * 0.45, base * (1.1 + ratio * 0.8), 0.25 + ratio * 0.45
                    );
                }
                const j = (Math.random() - 0.5) * W * 0.2;
                this.spawn(sternX + rx * j, sternY + ry * j, 0, 0,
                    0.8 + ratio * 1.2, base * 0.6, base * 1.4, 0.2 + ratio * 0.5);
            }
        }

        // Prop churn: white water when the engine works hard but the boat is slow
        const churn = Math.abs(boat.engine) * (1 - ratio * 0.7);
        if (churn > 0.15) {
            this.churnAcc += churn * dt * 30;
            const dir = boat.engine >= 0 ? -1 : 1;
            while (this.churnAcc >= 1) {
                this.churnAcc -= 1;
                const push = 20 + Math.random() * 40;
                const j = (Math.random() - 0.5) * W * 0.4;
                this.spawn(sternX + rx * j, sternY + ry * j,
                    fx * dir * push + rx * j, fy * dir * push + ry * j,
                    0.9, base * 0.4, base * 1.2, 0.45 * churn);
            }
        }

        // Bow wave (displacement hulls) or side spray (planing hulls)
        const sprayAt = s.planing ? 0.1 : 0.42;
        const minRatio = s.planing ? 0.5 : 0.12;
        if (ratio > minRatio && boat.forwardSpeed > 0) {
            this.bowAcc += speed * dt;
            const spacing = Math.max(6, W * 0.5);
            while (this.bowAcc >= spacing) {
                this.bowAcc -= spacing;
                const bx = boat.x + fx * L * sprayAt;
                const by = boat.y + fy * L * sprayAt;
                const out = 10 + speed * (s.planing ? 0.35 : 0.25);
                for (const side of [-1, 1]) {
                    this.spawn(bx + rx * side * W * 0.45, by + ry * side * W * 0.45,
                        rx * side * out, ry * side * out,
                        0.9 + ratio, base * 0.35, base * 1.0, 0.15 + ratio * 0.3);
                }
            }
        }
    }

    update(dt, current) {
        const drag = Math.exp(-1.5 * dt);
        for (const p of this.particles) {
            if (!p.active) continue;
            p.life += dt;
            const t = p.life / p.maxLife;
            if (t >= 1) {
                p.active = false;
                p.img.setVisible(false);
                continue;
            }
            p.vx *= drag;
            p.vy *= drag;
            const img = p.img;
            img.x += (p.vx + current.x) * dt;
            img.y += (p.vy + current.y) * dt;
            const ease = 1 - (1 - t) * (1 - t);
            img.setScale(p.s0 + (p.s1 - p.s0) * ease);
            img.setAlpha(p.a0 * (1 - t) * (1 - t * 0.5));
        }
    }

    clear() {
        for (const p of this.particles) {
            p.active = false;
            p.img.setVisible(false);
        }
        this.resetEmitters();
    }
}
