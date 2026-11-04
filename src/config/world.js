/** Layout of the river map. All positions in world pixels. */
export const WORLD = {
    width: 6000,
    height: 4000,
    shoreMargin: 220,           // land border thickness around the map
    seed: 1971,                 // change to get a different island layout
    islandCount: 14,

    /** River current applied to everything floating (px/s). Flows east. */
    current: { x: 12, y: 3 },

    /** Launch ghat on the north shore. */
    ghat: { x: 520, width: 380, depth: 50, gap: 70 },

    spawn: { x: 720, y: 430, heading: 0 },

    /** Areas kept clear of islands. */
    clearZones: [
        { x: 720, y: 400, r: 650 },     // around the ghat / spawn
        { x: 2100, y: 560, r: 800 }     // slalom course
    ],

    /** Slalom buoys east of the spawn. */
    slalom: { startX: 1400, endX: 2800, step: 200, yA: 470, yB: 650 },
    randomBuoys: 24
};
