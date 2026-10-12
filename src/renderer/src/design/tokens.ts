// Design tokens — single source of truth. Mirrors tokens.css for non-styled consumers (Pixi).
// Any change here must also update tokens.css.

export const colors = {
  cream: {
    50: 0xfffdf5,
    100: 0xfff8e7,
    200: 0xf4e9c7,
    300: 0xe8d9a0
  },
  paper: {
    100: 0xfcfaf0,
    200: 0xf0ead2
  },
  ink: {
    900: 0x1a1320,
    700: 0x3d2e4a,
    500: 0x6b5878,
    300: 0xa899b5,
    100: 0xd9cfe0
  },
  // v0.3.4 recalibration: same hues, professional saturation (mirrors tokens.css)
  accent: {
    coral: 0xd96a62,
    coralLight: 0xf3d3cd,
    mint: 0x5ca97a,
    mintLight: 0xd2e7da,
    sky: 0x4f9faf,
    skyLight: 0xcfe5e9,
    lemon: 0xdcab3c,
    lemonLight: 0xf3e4bc,
    lilac: 0x9482d3,
    lilacLight: 0xe0daf2,
    peach: 0xd99168,
    peachLight: 0xf3daca
  },
  status: {
    idle: 0xa199ab,
    thinking: 0x4f9faf,
    working: 0xdcab3c,
    blocked: 0xd96a62,
    success: 0x5ca97a,
    ghost: 0xd9d3de
  },
  world: {
    grassLight: 0xd4eab0,
    grassDark: 0xb5d589,
    woodLight: 0xe5c896,
    woodDark: 0xc9a66b,
    path: 0xe8d8b0,
    wall: 0x8b6f47
  },
  // Mirrors the new tokens.css groups added for theme-surface enablement
  // (worker-themeable-surfaces). Light-default values only — tokens.ts does
  // not mirror dark overrides, same as every other group above.
  terminal: {
    selectionBg: 0xffec99,
    black: 0x1a1320,
    red: 0xd1453b,
    green: 0x20904b,
    yellow: 0x9c6b00,
    blue: 0x2b6cb0,
    magenta: 0x8a5cf0,
    cyan: 0x1f9c94,
    white: 0x3a2f44,
    brightRed: 0xe0584e,
    brightGreen: 0x2e9e54,
    brightYellow: 0xb8860b,
    brightBlue: 0x3b7dc4,
    brightMagenta: 0x9b72f2,
    brightCyan: 0x2ba89f,
    brightWhite: 0x1a1320
  },
  termview: {
    bg: 0xfcfaf0,
    fg: 0x1a1320,
    brightBlack: 0x6b5878
  },
  legacy: {
    coral: 0xff6b6b,
    selection: 0xffec99
  },
  editor: {
    bg: 0xfcfaf0,
    text: 0x1a1320,
    gutterBg: 0xf0ead2,
    muted: 0x6b5878,
    border: 0xd9cfe0,
    searchMatch: 0xa8e6e0,
    searchMatchSelected: 0xffd93d,
    syntaxKeyword: 0xb197fc,
    syntaxString: 0x6bcf7f,
    syntaxFunction: 0xffa07a,
    syntaxType: 0x4ecdc4,
    syntaxProperty: 0x3d2e4a
  },
  release: {
    paper: 0xfffdf7,
    ink: 0x1b1b1b,
    inkFaint: 0x8a867a,
    yellow: 0xffca54,
    sky: 0x72c2df,
    maroon: 0xb23a4e
  },
  danger: {
    text: 0x6e1423
  }
} as const;

export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64
} as const;

export const type = {
  display: '"Press Start 2P", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Geeza Pro", "Noto Naskh Arabic", "Segoe UI Historic", monospace',
  ui: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Geeza Pro", "Noto Naskh Arabic", "Segoe UI Historic", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, "PingFang SC", "Microsoft YaHei", "Noto Sans Mono CJK SC", "Noto Sans CJK SC", "Geeza Pro", "Noto Naskh Arabic", "Segoe UI Historic", monospace'
} as const;

export const tileSize = 32; // px — the world is built from 32×32 tiles

export type AccentColorName =
  | 'coral' | 'mint' | 'sky' | 'lemon' | 'lilac' | 'peach';

export const accentByName: Record<AccentColorName, number> = {
  coral: colors.accent.coral,
  mint:  colors.accent.mint,
  sky:   colors.accent.sky,
  lemon: colors.accent.lemon,
  lilac: colors.accent.lilac,
  peach: colors.accent.peach
};

export const accentLightByName: Record<AccentColorName, number> = {
  coral: colors.accent.coralLight,
  mint:  colors.accent.mintLight,
  sky:   colors.accent.skyLight,
  lemon: colors.accent.lemonLight,
  lilac: colors.accent.lilacLight,
  peach: colors.accent.peachLight
};

// Convert 0xRRGGBB to "#RRGGBB"
export function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0').toUpperCase();
}
