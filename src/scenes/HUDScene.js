import { GAME_WIDTH, GAME_HEIGHT, FONT, PX_PER_SEC_TO_KNOTS } from '../config/constants.js';
import { MINIMAP } from './GameScene.js';

const HELP = [
    'W / S     throttle',
    'A / D     rudder',
    'Q / E     bow thruster (launch)',
    'SPACE    all stop (lever boats)',
    'C  camera    V  change vessel',
    'R  reset     ESC  menu    H  help'
].join('\n');

/** Dashboard overlay. Reads the player's boat from GameScene every frame. */
export class HUDScene extends Phaser.Scene {
    constructor() {
        super('HUD');
    }

    create() {
        this.gameScene = this.scene.get('Game');
        this.g = this.add.graphics();

        const text = (x, y, size, color = '#ffffff', bold = false) => this.add.text(x, y, '', {
            fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal'
        });

        // Vessel name, top-left
        this.nameText = text(24, 18, 24, '#ffffff', true);
        this.classText = text(24, 50, 14, '#b8d4de');

        // Dashboard, bottom-centre
        this.dash = { x: GAME_WIDTH / 2 - 250, y: GAME_HEIGHT - 112, w: 500, h: 96 };
        const d = this.dash;
        this.throttleLabel = text(d.x + 54, d.y + 18, 15, '#ffffff', true);
        this.throttleSub = text(d.x + 54, d.y + 42, 12, '#8fb3c0');
        this.speedText = text(d.x + d.w / 2 + 10, d.y + 40, 46, '#ffffff', true).setOrigin(0.5);
        this.unitText = text(d.x + d.w / 2 + 10, d.y + 76, 12, '#8fb3c0').setOrigin(0.5).setText('KNOTS');
        this.rudderText = text(d.x + d.w - 150, d.y + 14, 13, '#ffffff', true);
        this.headingText = text(d.x + d.w - 150, d.y + 60, 15, '#ffffff', true);

        // Under the minimap
        this.infoText = text(MINIMAP.x, MINIMAP.y + MINIMAP.h + 8, 12, '#d0e2e8');

        this.helpText = text(20, GAME_HEIGHT - 128, 13, '#d0e2e8').setText(HELP)
            .setBackgroundColor('rgba(11,29,38,0.7)').setPadding(10, 8, 10, 8);

        this.toastText = text(GAME_WIDTH / 2, 90, 20, '#ffffff', true).setOrigin(0.5)
            .setBackgroundColor('rgba(11,29,38,0.75)').setPadding(14, 6, 14, 6).setAlpha(0);

        const onToast = (msg) => this.showToast(msg);
        const onHelp = () => this.helpText.setVisible(!this.helpText.visible);
        this.gameScene.events.on('toast', onToast);
        this.gameScene.events.on('toggle-help', onHelp);
        this.events.once('shutdown', () => {
            this.gameScene.events.off('toast', onToast);
            this.gameScene.events.off('toggle-help', onHelp);
        });
    }

    showToast(msg) {
        this.tweens.killTweensOf(this.toastText);
        this.toastText.setText(msg).setAlpha(1);
        this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1200, duration: 500 });
    }

    update() {
        const boat = this.gameScene.boat;
        if (!boat) return;
        const s = boat.spec;
        const d = this.dash;
        const g = this.g;
        g.clear();

        this.nameText.setText(s.name);
        this.classText.setText(`${s.class}  ·  ${s.throttleMode === 'lever' ? 'throttle lever' : 'hold to accelerate'}`);

        // Panels
        g.fillStyle(0x0b1d26, 0.78).fillRoundedRect(d.x, d.y, d.w, d.h, 12);
        g.lineStyle(1, 0x2c4a57, 1).strokeRoundedRect(d.x, d.y, d.w, d.h, 12);

        // Throttle gauge (bar = engine output, triangle = lever position)
        const tx = d.x + 22;
        const ty = d.y + 12;
        const th = d.h - 24;
        const mid = ty + th / 2;
        g.fillStyle(0x1e3a46, 1).fillRect(tx, ty, 16, th);
        const eng = boat.engine;
        g.fillStyle(eng >= 0 ? 0x66bb6a : 0xffa726, 1);
        if (eng >= 0) g.fillRect(tx, mid - eng * th / 2, 16, eng * th / 2);
        else g.fillRect(tx, mid, 16, -eng * th / 2);
        g.lineStyle(2, 0xffffff, 0.8).lineBetween(tx - 3, mid, tx + 19, mid);
        const ly = mid - boat.throttle * th / 2;
        g.fillStyle(0xffffff, 1).fillTriangle(tx + 18, ly, tx + 26, ly - 5, tx + 26, ly + 5);

        this.throttleLabel.setText(throttleName(boat.throttle, s.throttleMode));
        this.throttleSub.setText(`Engine ${Math.round(Math.abs(eng) * 100)}%${eng < -0.01 ? ' astern' : ''}`);

        // Speed
        this.speedText.setText(boat.speedKnots.toFixed(1));

        // Rudder bar
        const rx = d.x + d.w - 150;
        const rw = 128;
        const ry = d.y + 38;
        g.fillStyle(0x1e3a46, 1).fillRect(rx, ry, rw, 8);
        g.lineStyle(1, 0xffffff, 0.6).lineBetween(rx + rw / 2, ry - 3, rx + rw / 2, ry + 11);
        const needle = rx + rw / 2 + boat.rudder * rw / 2;
        g.fillStyle(0x4fc3f7, 1).fillRect(Math.min(needle, rx + rw / 2), ry, Math.abs(needle - (rx + rw / 2)), 8);
        g.fillStyle(0xffffff, 1).fillRect(needle - 2, ry - 4, 4, 16);

        const deg = boat.rudder * s.maxRudderDeg;
        const side = Math.abs(deg) < 0.5 ? '' : deg < 0 ? ' PORT' : ' STBD';
        this.rudderText.setText(`RUDDER ${Math.abs(deg).toFixed(0)}°${side}`);
        this.headingText.setText(`HDG ${Math.round(boat.compassDeg).toString().padStart(3, '0')}°`);

        // Minimap frame + info
        g.lineStyle(2, 0xffffff, 0.7).strokeRect(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h);
        const cur = this.gameScene.world.current;
        const curKn = Math.hypot(cur.x, cur.y) * PX_PER_SEC_TO_KNOTS;
        this.infoText.setText(`Camera: ${this.gameScene.cameraMode.name}   ·   Current ${curKn.toFixed(1)} kn E`);
    }
}

function throttleName(t, mode) {
    if (mode === 'hold') {
        if (t > 0) return 'THROTTLE';
        if (t < 0) return 'REVERSE';
        return 'IDLE';
    }
    const a = Math.abs(t);
    if (a < 0.02) return 'STOP';
    const dir = t > 0 ? 'AHEAD' : 'ASTERN';
    if (a < 0.4) return `SLOW ${dir}`;
    if (a < 0.8) return `HALF ${dir}`;
    return `FULL ${dir}`;
}
