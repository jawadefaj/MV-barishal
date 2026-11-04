/**
 * Keyboard -> driving input. Kept separate from the boat so a gamepad,
 * touch controls or an AI driver can produce the same input object later.
 */
export class BoatControls {
    constructor(scene) {
        this.keys = scene.input.keyboard.addKeys({
            up: 'W', down: 'S', left: 'A', right: 'D',
            up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
            thrusterLeft: 'Q', thrusterRight: 'E',
            stop: 'SPACE',
            camera: 'C', vessel: 'V', reset: 'R', menu: 'ESC', help: 'H'
        });
        this.input = { throttleAxis: 0, steerAxis: 0, thrusterAxis: 0, allStop: false };
    }

    read() {
        const k = this.keys;
        const axis = (neg, pos) => (pos ? 1 : 0) - (neg ? 1 : 0);

        this.input.throttleAxis = axis(k.down.isDown || k.down2.isDown, k.up.isDown || k.up2.isDown);
        this.input.steerAxis = axis(k.left.isDown || k.left2.isDown, k.right.isDown || k.right2.isDown);
        this.input.thrusterAxis = axis(k.thrusterLeft.isDown, k.thrusterRight.isDown);
        this.input.allStop = k.stop.isDown;
        return this.input;
    }

    pressed(name) {
        return Phaser.Input.Keyboard.JustDown(this.keys[name]);
    }
}
