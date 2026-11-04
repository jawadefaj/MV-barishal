export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Converts pixels/second into knots for the HUD. A gameplay scale, not a real one. */
export const PX_PER_SEC_TO_KNOTS = 0.12;

export const FONT = 'Segoe UI, Roboto, Helvetica, Arial, sans-serif';

export const COLORS = {
    land: 0x4a7a3c,
    landDark: 0x3c6631,
    sand: 0xd8c48c,
    shallows: 0x3f8e98,
    hudPanel: 0x0b1d26,
    hudAccent: 0x4fc3f7
};

/** Render order. Higher draws on top. */
export const DEPTH = {
    water: 0,
    ripples: 1,
    shallows: 2,
    wake: 3,
    land: 6,
    landDetail: 7,
    buoy: 8,
    boatShadow: 9,
    boat: 10,
    minimapMarker: 20
};
