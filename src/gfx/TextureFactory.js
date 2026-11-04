import { VEHICLES } from '../config/vehicles.js';
import { seededRandom } from '../utils/math.js';

/**
 * Draws every texture with the Canvas 2D API so the game runs with zero art files.
 * Boats are drawn top-down facing RIGHT (heading 0). Swap any of these for real
 * sprites later by loading an image with the same texture key.
 */
const BOAT_PAD = 4;

export function createTextures(scene) {
    makeCanvas(scene, 'water', 256, 256, drawWater);
    makeCanvas(scene, 'water-ripples', 256, 256, drawRipples);
    makeCanvas(scene, 'foam', 32, 32, drawFoam);
    makeCanvas(scene, 'buoy', 18, 18, drawBuoy);
    makeCanvas(scene, 'tree', 28, 28, drawTree);

    for (const v of VEHICLES) {
        const painter = BOAT_PAINTERS[v.painter];
        makeCanvas(scene, v.texture, v.length + BOAT_PAD * 2, v.width + BOAT_PAD * 2, (ctx) => painter(ctx, v));
    }
}

function makeCanvas(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, w, h);
    draw(tex.context, w, h);
    tex.refresh();
}

// ---------------------------------------------------------------------- environment

/** Draw something 9 times so it wraps across the edges of a tiling texture. */
function wrapped(size, x, y, fn) {
    for (let dx = -size; dx <= size; dx += size) {
        for (let dy = -size; dy <= size; dy += size) fn(x + dx, y + dy);
    }
}

function drawWater(ctx, w) {
    const rand = seededRandom(7);
    ctx.fillStyle = '#1d5c72';
    ctx.fillRect(0, 0, w, w);
    for (let i = 0; i < 70; i++) {
        const x = rand() * w;
        const y = rand() * w;
        const rx = 10 + rand() * 40;
        const ry = 4 + rand() * 12;
        const light = rand() > 0.5;
        ctx.fillStyle = light ? 'rgba(80,160,180,0.10)' : 'rgba(10,40,60,0.12)';
        wrapped(w, x, y, (px, py) => {
            ctx.beginPath();
            ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

function drawRipples(ctx, w) {
    const rand = seededRandom(13);
    ctx.lineCap = 'round';
    for (let i = 0; i < 55; i++) {
        const x = rand() * w;
        const y = rand() * w;
        const len = 6 + rand() * 16;
        ctx.strokeStyle = `rgba(200,235,245,${0.10 + rand() * 0.18})`;
        ctx.lineWidth = 1 + rand() * 1.2;
        wrapped(w, x, y, (px, py) => {
            ctx.beginPath();
            ctx.arc(px, py + len, len, Math.PI * 1.25, Math.PI * 1.75);
            ctx.stroke();
        });
    }
}

function drawFoam(ctx, w) {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(240,250,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
}

function drawBuoy(ctx, w) {
    const c = w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    circle(ctx, c + 1.5, c + 2, 7);
    ctx.fillStyle = '#d9342b';
    circle(ctx, c, c, 7);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, 4.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    circle(ctx, c - 2, c - 2, 1.6);
}

function drawTree(ctx, w) {
    const c = w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    circle(ctx, c + 3, c + 3, 11);
    ctx.fillStyle = '#2f5d27';
    circle(ctx, c, c, 11);
    ctx.fillStyle = '#3f7a33';
    circle(ctx, c - 3, c - 2, 7);
    circle(ctx, c + 4, c + 1, 5);
    ctx.fillStyle = '#5b9a45';
    circle(ctx, c - 4, c - 4, 3);
}

// ---------------------------------------------------------------------- boats

const BOAT_PAINTERS = {
    jetski(ctx, s) {
        const { L, W, x0, cy } = frame(s);
        ctx.fillStyle = '#1b1b1b';
        hullPath(ctx, x0, cy, L, W, 0.4, 0.1);
        ctx.fill();
        ctx.fillStyle = '#f2c300';
        hullPath(ctx, x0 + 1.5, cy, L - 3, W - 3, 0.4, 0.1);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        hullPath(ctx, x0 + L * 0.55, cy, L * 0.43, W * 0.5, 0.7, 0.05);
        ctx.fill();
        // Seat
        ctx.fillStyle = '#222831';
        roundRect(ctx, x0 + L * 0.18, cy - W * 0.2, L * 0.42, W * 0.4, 4);
        ctx.fill();
        // Handlebar
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + L * 0.64, cy - W * 0.38);
        ctx.lineTo(x0 + L * 0.64, cy + W * 0.38);
        ctx.stroke();
        // Jet nozzle
        ctx.fillStyle = '#444';
        ctx.fillRect(x0 - 1, cy - 2, 3, 4);
    },

    speedboat(ctx, s) {
        const { L, W, x0, cy } = frame(s);
        ctx.fillStyle = '#b5202a';
        hullPath(ctx, x0, cy, L, W, 0.35, 0.05);
        ctx.fill();
        ctx.fillStyle = '#f7f7f4';
        hullPath(ctx, x0 + 2, cy, L - 4, W - 4, 0.35, 0.05);
        ctx.fill();
        // Cockpit
        ctx.fillStyle = '#d8cdb5';
        roundRect(ctx, x0 + L * 0.12, cy - W * 0.33, L * 0.5, W * 0.66, 5);
        ctx.fill();
        // Seats
        ctx.fillStyle = '#3a4048';
        roundRect(ctx, x0 + L * 0.16, cy - W * 0.28, L * 0.14, W * 0.56, 3);
        ctx.fill();
        roundRect(ctx, x0 + L * 0.4, cy - W * 0.28, L * 0.1, W * 0.22, 2);
        ctx.fill();
        roundRect(ctx, x0 + L * 0.4, cy + W * 0.06, L * 0.1, W * 0.22, 2);
        ctx.fill();
        // Windshield
        ctx.fillStyle = 'rgba(40,90,120,0.85)';
        ctx.beginPath();
        ctx.moveTo(x0 + L * 0.58, cy - W * 0.36);
        ctx.quadraticCurveTo(x0 + L * 0.7, cy, x0 + L * 0.58, cy + W * 0.36);
        ctx.lineTo(x0 + L * 0.54, cy + W * 0.34);
        ctx.quadraticCurveTo(x0 + L * 0.64, cy, x0 + L * 0.54, cy - W * 0.34);
        ctx.closePath();
        ctx.fill();
        // Bow deck line
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0 + L * 0.7, cy);
        ctx.lineTo(x0 + L * 0.97, cy);
        ctx.stroke();
        // Outboard engine
        ctx.fillStyle = '#1f1f1f';
        roundRect(ctx, x0 - 2, cy - W * 0.16, 8, W * 0.32, 2);
        ctx.fill();
    },

    nouka(ctx, s) {
        const { L, W, x0, cy } = frame(s);
        ctx.fillStyle = '#3d2412';
        lensPath(ctx, x0, cy, L, W);
        ctx.fill();
        ctx.fillStyle = '#7a4a26';
        lensPath(ctx, x0 + 2, cy, L - 4, W - 4);
        ctx.fill();
        ctx.fillStyle = '#a06a3a';
        lensPath(ctx, x0 + L * 0.08, cy, L * 0.84, W * 0.7);
        ctx.fill();
        // Planks
        ctx.strokeStyle = 'rgba(60,35,15,0.5)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
            const x = x0 + L * (0.12 + i * 0.13);
            ctx.beginPath();
            ctx.moveTo(x, cy - W * 0.32);
            ctx.lineTo(x, cy + W * 0.32);
            ctx.stroke();
        }
        // Painted bow and stern
        ctx.fillStyle = '#c23b22';
        lensPath(ctx, x0 + L * 0.86, cy, L * 0.12, W * 0.35);
        ctx.fill();
        ctx.fillStyle = '#2e8b57';
        lensPath(ctx, x0 + L * 0.02, cy, L * 0.1, W * 0.3);
        ctx.fill();
        // Chhoi (bamboo canopy)
        ctx.fillStyle = '#c9a26b';
        roundRect(ctx, x0 + L * 0.3, cy - W * 0.42, L * 0.38, W * 0.84, 6);
        ctx.fill();
        ctx.strokeStyle = '#8f6d3f';
        ctx.lineWidth = 1.5;
        for (let x = x0 + L * 0.33; x < x0 + L * 0.67; x += 5) {
            ctx.beginPath();
            ctx.moveTo(x, cy - W * 0.4);
            ctx.lineTo(x, cy + W * 0.4);
            ctx.stroke();
        }
        // Engine
        ctx.fillStyle = '#3b3f44';
        roundRect(ctx, x0 + L * 0.14, cy - W * 0.16, L * 0.1, W * 0.32, 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        circle(ctx, x0 + L * 0.19, cy - W * 0.24, 2);
    },

    launch(ctx, s) {
        const { L, W, x0, cy } = frame(s);
        // Hull
        ctx.fillStyle = '#8d1c23';
        hullPath(ctx, x0, cy, L, W, 0.2, 0.03);
        ctx.fill();
        ctx.fillStyle = '#f2efe6';
        hullPath(ctx, x0 + 3, cy, L - 6, W - 6, 0.2, 0.03);
        ctx.fill();
        // Superstructure
        const sx = x0 + L * 0.06;
        const sw = L * 0.72;
        const sh = W - 14;
        ctx.fillStyle = '#e6dfc8';
        roundRect(ctx, sx, cy - sh / 2, sw, sh, 6);
        ctx.fill();
        ctx.strokeStyle = '#a59c84';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Cabin windows along both sides
        ctx.fillStyle = '#2a4458';
        for (let x = sx + 8; x < sx + sw - 8; x += 9) {
            ctx.fillRect(x, cy - sh / 2 + 3, 5, 3);
            ctx.fillRect(x, cy + sh / 2 - 6, 5, 3);
        }
        // Roof stripe with name
        ctx.fillStyle = '#2e5f9e';
        ctx.fillRect(sx + 10, cy - 7, sw - 20, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M.V. BARISHAL', sx + sw / 2, cy + 0.5);
        // Funnels
        ctx.fillStyle = '#e3b31c';
        roundRect(ctx, sx + sw * 0.2, cy - 15, 10, 7, 2);
        ctx.fill();
        roundRect(ctx, sx + sw * 0.2, cy + 8, 10, 7, 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.fillRect(sx + sw * 0.2, cy - 15, 3, 7);
        ctx.fillRect(sx + sw * 0.2, cy + 8, 3, 7);
        // Bridge
        const bx = sx + sw + 2;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, bx, cy - sh / 2 + 4, L * 0.08, sh - 8, 5);
        ctx.fill();
        ctx.fillStyle = '#1d3446';
        roundRect(ctx, bx + L * 0.08 - 5, cy - sh / 2 + 7, 4, sh - 14, 2);
        ctx.fill();
        // Life rings
        ctx.fillStyle = '#ff7a1a';
        for (const x of [sx + sw * 0.35, sx + sw * 0.6, sx + sw * 0.85]) {
            circle(ctx, x, cy - W / 2 + 4.5, 2.5);
            circle(ctx, x, cy + W / 2 - 4.5, 2.5);
        }
        // Anchor winch on the bow
        ctx.fillStyle = '#6c757d';
        circle(ctx, x0 + L * 0.9, cy - 5, 3);
        circle(ctx, x0 + L * 0.9, cy + 5, 3);
    }
};

// ---------------------------------------------------------------------- helpers

function frame(s) {
    return { L: s.length, W: s.width, x0: BOAT_PAD, cy: BOAT_PAD + s.width / 2 };
}

/** Pointed bow on the right, flat transom on the left. */
function hullPath(ctx, x0, cy, L, W, bow, stern) {
    const hw = W / 2;
    const xb = x0 + L;
    const bowStart = xb - L * bow;
    ctx.beginPath();
    ctx.moveTo(x0, cy - hw * 0.85);
    ctx.quadraticCurveTo(x0, cy - hw, x0 + L * stern, cy - hw);
    ctx.lineTo(bowStart, cy - hw);
    ctx.bezierCurveTo(bowStart + L * bow * 0.55, cy - hw, xb, cy - hw * 0.35, xb, cy);
    ctx.bezierCurveTo(xb, cy + hw * 0.35, bowStart + L * bow * 0.55, cy + hw, bowStart, cy + hw);
    ctx.lineTo(x0 + L * stern, cy + hw);
    ctx.quadraticCurveTo(x0, cy + hw, x0, cy + hw * 0.85);
    ctx.closePath();
}

/** Double-ended hull, pointed at both ends (country boat). */
function lensPath(ctx, x0, cy, L, W) {
    const hw = W / 2;
    const xb = x0 + L;
    ctx.beginPath();
    ctx.moveTo(x0, cy);
    ctx.bezierCurveTo(x0 + L * 0.2, cy - hw, x0 + L * 0.3, cy - hw, x0 + L * 0.5, cy - hw);
    ctx.bezierCurveTo(x0 + L * 0.7, cy - hw, x0 + L * 0.8, cy - hw, xb, cy);
    ctx.bezierCurveTo(x0 + L * 0.8, cy + hw, x0 + L * 0.7, cy + hw, x0 + L * 0.5, cy + hw);
    ctx.bezierCurveTo(x0 + L * 0.3, cy + hw, x0 + L * 0.2, cy + hw, x0, cy);
    ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}
