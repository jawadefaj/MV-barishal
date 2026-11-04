import { VEHICLES } from '../config/vehicles.js';
import { GAME_WIDTH, GAME_HEIGHT, FONT, PX_PER_SEC_TO_KNOTS } from '../config/constants.js';

/** Vehicle select screen. Click a card or press 1-4 (arrows + Enter also work). */
export class MenuScene extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        this.selected = 0;
        this.cards = [];

        this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'water');
        this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'water-ripples').setAlpha(0.8);
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x06141b, 0.45);

        this.add.text(GAME_WIDTH / 2, 70, 'MV BARISHAL', {
            fontFamily: FONT, fontSize: '54px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH / 2, 120, 'River Boat Simulator  ·  choose your vessel', {
            fontFamily: FONT, fontSize: '20px', color: '#b8d4de'
        }).setOrigin(0.5);

        const cardW = 270;
        const gap = 24;
        const total = VEHICLES.length * cardW + (VEHICLES.length - 1) * gap;
        const startX = (GAME_WIDTH - total) / 2 + cardW / 2;
        VEHICLES.forEach((v, i) => this.cards.push(this.makeCard(v, i, startX + i * (cardW + gap), 400, cardW, 400)));

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'Click a vessel or press 1-4  ·  ← → and ENTER', {
            fontFamily: FONT, fontSize: '16px', color: '#8fb3c0'
        }).setOrigin(0.5);

        const kb = this.input.keyboard;
        ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((key, i) => {
            kb.on(`keydown-${key}`, () => i < VEHICLES.length && this.startGame(i));
        });
        kb.on('keydown-LEFT', () => this.select((this.selected + VEHICLES.length - 1) % VEHICLES.length));
        kb.on('keydown-RIGHT', () => this.select((this.selected + 1) % VEHICLES.length));
        kb.on('keydown-ENTER', () => this.startGame(this.selected));

        this.select(0);
    }

    makeCard(v, index, x, y, w, h) {
        const bg = this.add.rectangle(x, y, w, h, 0x0b1d26, 0.85).setStrokeStyle(2, 0x2c4a57);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => this.select(index));
        bg.on('pointerdown', () => this.startGame(index));

        const top = y - h / 2;
        this.add.text(x - w / 2 + 14, top + 12, `${index + 1}`, {
            fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#4fc3f7'
        });

        // Boat preview, scaled to fit the card, pointing up
        const img = this.add.image(x, top + 105, v.texture).setRotation(-Math.PI / 2);
        img.setScale(Math.min(2.2, 150 / v.length));

        this.add.text(x, top + 205, v.name, {
            fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);
        this.add.text(x, top + 233, v.class, {
            fontFamily: FONT, fontSize: '14px', color: '#8fb3c0'
        }).setOrigin(0.5);
        this.add.text(x, top + 262, v.description, {
            fontFamily: FONT, fontSize: '13px', color: '#d0e2e8', align: 'center', wordWrap: { width: w - 30 }
        }).setOrigin(0.5, 0);

        const topSpeed = Math.round(v.maxSpeed * PX_PER_SEC_TO_KNOTS);
        const stats = [
            ['Speed', v.maxSpeed / 400, `${topSpeed} kn`],
            ['Accel', v.thrust / 320, ''],
            ['Handling', v.turnRate / 3.2, ''],
            ['Size', v.length / 210, '']
        ];
        const g = this.add.graphics();
        stats.forEach(([label, value, extra], i) => {
            const sy = top + 310 + i * 20;
            this.add.text(x - w / 2 + 18, sy - 8, label, { fontFamily: FONT, fontSize: '12px', color: '#8fb3c0' });
            g.fillStyle(0x1e3a46, 1).fillRect(x - 40, sy - 3, 120, 7);
            g.fillStyle(0x4fc3f7, 1).fillRect(x - 40, sy - 3, 120 * Math.min(1, Math.max(0.05, value)), 7);
            if (extra) this.add.text(x + 88, sy - 8, extra, { fontFamily: FONT, fontSize: '12px', color: '#ffffff' });
        });

        return { bg, img, baseScale: img.scaleX };
    }

    select(index) {
        this.selected = index;
        this.cards.forEach((c, i) => {
            const on = i === index;
            c.bg.setStrokeStyle(on ? 3 : 2, on ? 0x4fc3f7 : 0x2c4a57);
            c.bg.setFillStyle(on ? 0x12303d : 0x0b1d26, 0.9);
            c.img.setScale(c.baseScale * (on ? 1.08 : 1));
        });
    }

    startGame(index) {
        this.scene.start('Game', { vehicleId: VEHICLES[index].id });
    }
}
