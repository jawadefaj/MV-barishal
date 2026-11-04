import { VEHICLES } from '../config/vehicles.js';
import { WORLD } from '../config/world.js';
import { COLORS, DEPTH, GAME_WIDTH } from '../config/constants.js';
import { Boat } from '../entities/Boat.js';
import { WaterWorld } from '../world/WaterWorld.js';
import { WakeSystem } from '../systems/WakeSystem.js';
import { BoatControls } from '../systems/BoatControls.js';
import { clamp, damp, wrapAngle } from '../utils/math.js';

const CAMERA_MODES = [
    { name: 'Chase', zoom: 1, headingUp: false },
    { name: 'Heading-up', zoom: 1.1, headingUp: true },
    { name: 'Wide', zoom: 0.5, headingUp: false }
];

const PHYSICS_STEP = 1 / 120;

export const MINIMAP = { x: GAME_WIDTH - 16 - 225, y: 16, w: 225, h: 150 };

/** The driving scene: world, player boat, wake, cameras. UI lives in HUDScene. */
export class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    init(data) {
        this.vehicleIndex = Math.max(0, VEHICLES.findIndex((v) => v.id === data?.vehicleId));
        this.cameraModeIndex = 0;
        this.accumulator = 0;
    }

    create() {
        this.world = new WaterWorld(this, WORLD);
        this.wake = new WakeSystem(this);
        this.controls = new BoatControls(this);

        const { x, y, heading } = this.world.spawn;
        this.boat = new Boat(this, VEHICLES[this.vehicleIndex], x, y, heading);

        this.setupCameras();
        this.scene.launch('HUD');
    }

    setupCameras() {
        const cam = this.cameras.main;
        cam.setBackgroundColor(COLORS.land);
        cam.setBounds(0, 0, this.world.width, this.world.height);
        cam.startFollow(this.boat.sprite, false, 0.12, 0.12);
        cam.setZoom(this.boat.spec.zoom);
        this.lookX = 0;
        this.lookY = 0;
        this.camRotation = 0;

        // Minimap: whole world in the top-right corner
        const mm = MINIMAP;
        this.minimap = this.cameras.add(mm.x, mm.y, mm.w, mm.h)
            .setZoom(mm.w / this.world.width)
            .setBackgroundColor(COLORS.land);
        this.minimap.centerOn(this.world.width / 2, this.world.height / 2);
        this.minimap.ignore(this.wake.images);

        // Big arrow only the minimap sees
        this.marker = this.add.graphics().setDepth(DEPTH.minimapMarker);
        this.marker.fillStyle(0xffeb3b, 1);
        this.marker.fillTriangle(170, 0, -110, -110, -110, 110);
        this.marker.lineStyle(20, 0x000000, 1);
        this.marker.strokeTriangle(170, 0, -110, -110, -110, 110);
        cam.ignore(this.marker);
    }

    update(time, delta) {
        const dt = Math.min(delta / 1000, 0.1);
        this.handleHotkeys();

        const input = this.controls.read();

        // Fixed-step physics so handling is identical at any frame rate
        this.accumulator += dt;
        let impact = 0;
        while (this.accumulator >= PHYSICS_STEP) {
            this.accumulator -= PHYSICS_STEP;
            this.boat.update(PHYSICS_STEP, input, this.world.current);
            impact = Math.max(impact, this.world.resolveBoat(this.boat));
            this.world.updateBuoys(PHYSICS_STEP, this.boat);
        }
        if (impact > 60) {
            this.cameras.main.shake(150, clamp(impact / 20000, 0.002, 0.012));
        }

        this.boat.syncVisuals(dt);
        this.wake.emitFromBoat(this.boat, dt);
        this.wake.update(dt, this.world.current);
        this.world.update(dt);

        this.marker.setPosition(this.boat.x, this.boat.y).setRotation(this.boat.heading);
        this.updateCamera(dt);
    }

    handleHotkeys() {
        const c = this.controls;
        if (c.pressed('camera')) {
            this.cameraModeIndex = (this.cameraModeIndex + 1) % CAMERA_MODES.length;
            this.toast(`Camera: ${this.cameraMode.name}`);
        }
        if (c.pressed('vessel')) {
            this.switchVessel((this.vehicleIndex + 1) % VEHICLES.length);
        }
        if (c.pressed('reset')) {
            this.switchVessel(this.vehicleIndex, true);
        }
        if (c.pressed('help')) {
            this.events.emit('toggle-help');
        }
        if (c.pressed('menu')) {
            this.scene.stop('HUD');
            this.scene.start('Menu');
        }
    }

    /** Swap the player's boat. Keeps position and heading unless `toSpawn` is set. */
    switchVessel(index, toSpawn = false) {
        const old = this.boat;
        const pos = toSpawn ? this.world.spawn : { x: old.x, y: old.y, heading: old.heading };
        old.destroy();

        this.vehicleIndex = index;
        this.boat = new Boat(this, VEHICLES[index], pos.x, pos.y, pos.heading);
        this.world.resolveBoat(this.boat);
        this.wake.resetEmitters();
        if (toSpawn) this.wake.clear();

        this.cameras.main.startFollow(this.boat.sprite, false, 0.12, 0.12);
        this.toast(toSpawn ? 'Back at the ghat' : `Now driving: ${this.boat.spec.name}`);
    }

    get cameraMode() {
        return CAMERA_MODES[this.cameraModeIndex];
    }

    updateCamera(dt) {
        const cam = this.cameras.main;
        const boat = this.boat;
        const mode = this.cameraMode;
        const speedRatio = clamp(boat.waterSpeed / boat.spec.maxSpeed, 0, 1);

        // Zoom out a little at speed so you can see what's coming
        const targetZoom = boat.spec.zoom * mode.zoom * (1 - 0.18 * speedRatio);
        cam.setZoom(damp(cam.zoom, targetZoom, 2, dt));

        // Look ahead along the direction of travel
        const look = mode.headingUp ? 0.6 : 0.45;
        this.lookX = damp(this.lookX, boat.groundVx * look, 2, dt);
        this.lookY = damp(this.lookY, boat.groundVy * look, 2, dt);
        cam.setFollowOffset(-this.lookX, -this.lookY);

        // Heading-up rotates the world so the bow always points up the screen
        const targetRot = mode.headingUp ? -Math.PI / 2 - boat.heading : 0;
        this.camRotation += wrapAngle(targetRot - this.camRotation) * (1 - Math.exp(-4 * dt));
        cam.setRotation(this.camRotation);
        // Bounds clamping fights a rotated view, so drop it while rotated
        if (mode.headingUp) cam.removeBounds();
        else cam.setBounds(0, 0, this.world.width, this.world.height);
    }

    toast(message) {
        this.events.emit('toast', message);
    }
}
