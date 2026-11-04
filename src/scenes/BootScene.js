import { createTextures } from '../gfx/TextureFactory.js';

/** Builds all generated textures once, then opens the menu. Load real assets here later. */
export class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    create() {
        createTextures(this);
        this.scene.start('Menu');
    }
}
