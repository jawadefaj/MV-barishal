import { seededRandom } from '../utils/math.js';
import { COLORS, DEPTH, FONT } from '../config/constants.js';

/**
 * The river map: animated water, shore, islands (chars), the launch ghat and buoys.
 * Owns all static collision shapes ("solids") and resolves boat collisions against them.
 */
export class WaterWorld {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.width = config.width;
        this.height = config.height;
        this.current = { ...config.current };
        this.rand = seededRandom(config.seed);

        /** Solid shapes: { type: 'circle', x, y, r } or { type: 'rect', x, y, w, h } */
        this.solids = [];
        this.islands = [];
        this.buoys = [];

        this.buildWater();
        this.buildShore();
        this.buildGhat();
        this.buildIslands();
        this.buildBuoys();
    }

    get spawn() {
        return this.config.spawn;
    }

    // ------------------------------------------------------------------ build

    buildWater() {
        const { width, height } = this;
        this.water = this.scene.add.tileSprite(width / 2, height / 2, width, height, 'water')
            .setDepth(DEPTH.water);
        this.ripples = this.scene.add.tileSprite(width / 2, height / 2, width, height, 'water-ripples')
            .setDepth(DEPTH.ripples).setAlpha(0.8);
        this.waterTime = 0;
    }

    buildShore() {
        const { width: W, height: H } = this;
        const m = this.config.shoreMargin;
        const sand = 36;
        const shallow = 44;

        const shallows = this.scene.add.graphics().setDepth(DEPTH.shallows);
        shallows.fillStyle(COLORS.shallows, 0.45);
        shallows.fillRect(m, m, W - 2 * m, shallow);
        shallows.fillRect(m, H - m - shallow, W - 2 * m, shallow);
        shallows.fillRect(m, m, shallow, H - 2 * m);
        shallows.fillRect(W - m - shallow, m, shallow, H - 2 * m);

        const g = this.scene.add.graphics().setDepth(DEPTH.land);
        const borders = [
            { x: 0, y: 0, w: W, h: m },
            { x: 0, y: H - m, w: W, h: m },
            { x: 0, y: 0, w: m, h: H },
            { x: W - m, y: 0, w: m, h: H }
        ];
        g.fillStyle(COLORS.land, 1);
        for (const b of borders) {
            g.fillRect(b.x, b.y, b.w, b.h);
            this.solids.push({ type: 'rect', ...b });
        }
        // Sand strip along the waterline
        g.fillStyle(COLORS.sand, 1);
        g.fillRect(m - sand, m - sand, W - 2 * m + 2 * sand, sand);
        g.fillRect(m - sand, H - m, W - 2 * m + 2 * sand, sand);
        g.fillRect(m - sand, m, sand, H - 2 * m);
        g.fillRect(W - m, m, sand, H - 2 * m);

        // Trees and a few tin roofs on the banks
        for (let i = 0; i < 260; i++) {
            const side = Math.floor(this.rand() * 4);
            let x;
            let y;
            const inset = 20 + this.rand() * (m - sand - 40);
            if (side === 0) { x = this.rand() * W; y = inset; }
            else if (side === 1) { x = this.rand() * W; y = H - inset; }
            else if (side === 2) { x = inset; y = this.rand() * H; }
            else { x = W - inset; y = this.rand() * H; }
            this.scene.add.image(x, y, 'tree').setDepth(DEPTH.landDetail)
                .setScale(0.8 + this.rand() * 1.2).setRotation(this.rand() * Math.PI * 2);
        }
        const roofs = this.scene.add.graphics().setDepth(DEPTH.landDetail);
        const roofColors = [0x9aa3a8, 0xb5532f, 0x7d8a92, 0x5e7f9a];
        for (let i = 0; i < 26; i++) {
            const x = 200 + this.rand() * 2200;
            const y = 30 + this.rand() * (m - sand - 90);
            const w = 40 + this.rand() * 50;
            const h = 26 + this.rand() * 26;
            roofs.fillStyle(0x000000, 0.25);
            roofs.fillRect(x + 4, y + 5, w, h);
            roofs.fillStyle(roofColors[i % roofColors.length], 1);
            roofs.fillRect(x, y, w, h);
            roofs.lineStyle(1, 0x000000, 0.2);
            roofs.lineBetween(x, y + h / 2, x + w, y + h / 2);
        }
    }

    buildGhat() {
        const m = this.config.shoreMargin;
        const { x, width, depth, gap } = this.config.ghat;
        const g = this.scene.add.graphics().setDepth(DEPTH.land);

        // Walkway from the bank to the pontoon
        const walk = { type: 'rect', x: x + width / 2 - 20, y: m - 10, w: 40, h: gap + 10 };
        // Floating pontoon
        const pontoon = { type: 'rect', x, y: m + gap, w: width, h: depth };

        g.fillStyle(0x000000, 0.25);
        g.fillRect(pontoon.x + 5, pontoon.y + 6, pontoon.w, pontoon.h);
        g.fillStyle(0x8a6a44, 1);
        g.fillRect(walk.x, walk.y, walk.w, walk.h);
        g.lineStyle(1, 0x5a4329, 1);
        for (let yy = walk.y + 6; yy < walk.y + walk.h; yy += 8) g.lineBetween(walk.x, yy, walk.x + walk.w, yy);
        g.fillStyle(0x4b5560, 1);
        g.fillRect(pontoon.x, pontoon.y, pontoon.w, pontoon.h);
        g.fillStyle(0xe0b522, 1);
        g.fillRect(pontoon.x, pontoon.y + pontoon.h - 5, pontoon.w, 5);
        g.fillStyle(0x2b3238, 1);
        for (let bx = pontoon.x + 20; bx < pontoon.x + pontoon.w; bx += 60) g.fillCircle(bx, pontoon.y + 10, 5);

        this.solids.push(walk, pontoon);

        this.scene.add.text(x + width / 2, m - 70, 'BARISHAL LAUNCH GHAT', {
            fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
            stroke: '#203018', strokeThickness: 4
        }).setOrigin(0.5).setDepth(DEPTH.landDetail);
    }

    buildIslands() {
        const { width: W, height: H } = this;
        const m = this.config.shoreMargin;
        const shallowG = this.scene.add.graphics().setDepth(DEPTH.shallows);
        const landG = this.scene.add.graphics().setDepth(DEPTH.land);

        let attempts = 0;
        while (this.islands.length < this.config.islandCount && attempts < 2000) {
            attempts++;
            const r = 90 + this.rand() * 230;
            const x = m + r + 150 + this.rand() * (W - 2 * (m + r + 150));
            const y = m + r + 150 + this.rand() * (H - 2 * (m + r + 150));

            const blocked = this.config.clearZones.some((z) => Math.hypot(x - z.x, y - z.y) < z.r + r)
                || this.islands.some((o) => Math.hypot(x - o.x, y - o.y) < o.r + r + 260);
            if (blocked) continue;

            const island = { x, y, r, phases: [this.rand() * 6.28, this.rand() * 6.28, this.rand() * 6.28] };
            this.islands.push(island);
            // Blob edge varies up to ~±10%; collide slightly inside the drawn sand
            this.solids.push({ type: 'circle', x, y, r: r * 0.95 });

            shallowG.fillStyle(COLORS.shallows, 0.45);
            shallowG.fillPoints(blob(island, 1.22), true);
            landG.fillStyle(COLORS.sand, 1);
            landG.fillPoints(blob(island, 1.0), true);
            landG.fillStyle(COLORS.land, 1);
            landG.fillPoints(blob(island, 0.8), true);
            landG.fillStyle(COLORS.landDark, 1);
            landG.fillCircle(x + r * 0.2, y - r * 0.15, r * 0.3);

            const trees = Math.floor(r / 12);
            for (let i = 0; i < trees; i++) {
                const a = this.rand() * Math.PI * 2;
                const d = Math.sqrt(this.rand()) * r * 0.62;
                this.scene.add.image(x + Math.cos(a) * d, y + Math.sin(a) * d, 'tree')
                    .setDepth(DEPTH.landDetail).setScale(0.8 + this.rand() * 1.3).setRotation(this.rand() * 6.28);
            }
        }
    }

    buildBuoys() {
        const { startX, endX, step, yA, yB } = this.config.slalom;
        let i = 0;
        for (let x = startX; x <= endX; x += step, i++) {
            this.addBuoy(x, i % 2 === 0 ? yA : yB);
        }

        const m = this.config.shoreMargin;
        let placed = 0;
        let attempts = 0;
        while (placed < this.config.randomBuoys && attempts < 1000) {
            attempts++;
            const x = m + 120 + this.rand() * (this.width - 2 * m - 240);
            const y = m + 120 + this.rand() * (this.height - 2 * m - 240);
            if (this.islands.some((o) => Math.hypot(x - o.x, y - o.y) < o.r * 1.4)) continue;
            if (Math.hypot(x - this.spawn.x, y - this.spawn.y) < 400) continue;
            this.addBuoy(x, y);
            placed++;
        }
    }

    addBuoy(x, y) {
        const sprite = this.scene.add.image(x, y, 'buoy').setDepth(DEPTH.buoy);
        this.buoys.push({ sprite, x, y, ax: x, ay: y, vx: 0, vy: 0, r: 8, spin: 0, t: this.rand() * 10 });
    }

    // ------------------------------------------------------------------ update

    update(dt) {
        // Water texture drifts with the current
        this.waterTime += dt;
        this.water.tilePositionX -= this.current.x * dt;
        this.water.tilePositionY -= this.current.y * dt;
        this.ripples.tilePositionX -= this.current.x * 1.4 * dt + Math.sin(this.waterTime * 0.3) * 0.08;
        this.ripples.tilePositionY -= this.current.y * 1.4 * dt + Math.cos(this.waterTime * 0.23) * 0.08;
    }

    /** Push the boat out of every solid it overlaps. Returns the strongest impact this step. */
    resolveBoat(boat) {
        let strongest = 0;
        // Two passes so pushing out of one shape into another settles
        for (let pass = 0; pass < 2; pass++) {
            for (const c of boat.getColliders()) {
                for (const shape of this.solids) {
                    const hit = collideCircle(c.x, c.y, c.r, shape);
                    if (!hit) continue;
                    boat.x += hit.nx * hit.depth;
                    boat.y += hit.ny * hit.depth;
                    c.x += hit.nx * hit.depth;
                    c.y += hit.ny * hit.depth;
                    strongest = Math.max(strongest, boat.applyImpact(hit.nx, hit.ny, c.ox, c.oy));
                }
            }
        }
        return strongest;
    }

    /** Anchored buoys: spring back to their mooring, get shoved by boats. */
    updateBuoys(dt, boat) {
        const colliders = boat.getColliders();
        const drag = Math.exp(-2.0 * dt);
        for (const b of this.buoys) {
            b.vx += (b.ax - b.x) * 1.5 * dt;
            b.vy += (b.ay - b.y) * 1.5 * dt;
            b.vx *= drag;
            b.vy *= drag;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            for (const c of colliders) {
                const dx = b.x - c.x;
                const dy = b.y - c.y;
                const dist = Math.hypot(dx, dy);
                const depth = c.r + b.r - dist;
                if (depth <= 0 || dist === 0) continue;
                const nx = dx / dist;
                const ny = dy / dist;
                b.x += nx * depth;
                b.y += ny * depth;
                const rel = (b.vx - boat.groundVx) * nx + (b.vy - boat.groundVy) * ny;
                if (rel < 0) {
                    b.vx -= 1.3 * rel * nx;
                    b.vy -= 1.3 * rel * ny;
                    b.spin += -rel * 0.05;
                    boat.vx *= 0.995;
                    boat.vy *= 0.995;
                }
            }

            b.t += dt;
            b.spin *= drag;
            b.sprite.setPosition(b.x, b.y);
            b.sprite.rotation += b.spin * dt;
            b.sprite.setScale(1 + Math.sin(b.t * 3) * 0.06);
        }
    }

    isInWater(x, y, radius = 0) {
        return !this.solids.some((s) => collideCircle(x, y, radius, s));
    }
}

/** Irregular island outline. */
function blob(island, scale) {
    const pts = [];
    const n = 36;
    const [p1, p2, p3] = island.phases;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const k = 1 + 0.06 * Math.sin(3 * a + p1) + 0.03 * Math.sin(5 * a + p2) + 0.02 * Math.sin(7 * a + p3);
        const r = island.r * scale * k;
        pts.push({ x: island.x + Math.cos(a) * r, y: island.y + Math.sin(a) * r });
    }
    return pts;
}

/**
 * Circle vs shape. Returns { nx, ny, depth } where n points out of the shape, or null.
 */
function collideCircle(cx, cy, cr, s) {
    if (s.type === 'circle') {
        const dx = cx - s.x;
        const dy = cy - s.y;
        const dist = Math.hypot(dx, dy);
        const depth = cr + s.r - dist;
        if (depth <= 0) return null;
        if (dist === 0) return { nx: 1, ny: 0, depth };
        return { nx: dx / dist, ny: dy / dist, depth };
    }

    // Rectangle
    const px = Math.max(s.x, Math.min(cx, s.x + s.w));
    const py = Math.max(s.y, Math.min(cy, s.y + s.h));
    const dx = cx - px;
    const dy = cy - py;
    const d2 = dx * dx + dy * dy;

    if (d2 > 0) {
        if (d2 >= cr * cr) return null;
        const dist = Math.sqrt(d2);
        return { nx: dx / dist, ny: dy / dist, depth: cr - dist };
    }

    // Centre is inside the rect: push out along the shortest axis
    const left = cx - s.x;
    const right = s.x + s.w - cx;
    const top = cy - s.y;
    const bottom = s.y + s.h - cy;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { nx: -1, ny: 0, depth: left + cr };
    if (min === right) return { nx: 1, ny: 0, depth: right + cr };
    if (min === top) return { nx: 0, ny: -1, depth: top + cr };
    return { nx: 0, ny: 1, depth: bottom + cr };
}
