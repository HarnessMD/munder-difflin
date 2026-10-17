import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ThemeConfig } from '../../src/renderer/src/scene/office/themeRegistry';

const repoRoot = resolve(__dirname, '../../..');
const assetsDir = resolve(repoRoot, 'src/renderer/src/assets');

const officeMapRaw = readFileSync(resolve(assetsDir, 'maps/office.tmj'), 'utf-8');
const brooklyn99MapRaw = readFileSync(resolve(assetsDir, 'maps/brooklyn99.tmj'), 'utf-8');

export const ORACLE_OFFICE_THEME: ThemeConfig = {
  id: 'office' as any,
  mapRaw: officeMapRaw,
  tilesets: [
    { url: '', embedded: true },
    { url: '', firstgid: 513, image: 'a5', imagewidth: 256, imageheight: 512, tilewidth: 16, tileheight: 16, columns: 16, tilecount: 512 },
    { url: '', interiorsUrl: undefined, firstgid: 1025, image: 'interiors', imagewidth: 256, imageheight: 1424, tilewidth: 16, tileheight: 16, columns: 16, tilecount: 1424 } as any,
  ],
  primarySeatNames: [
    'desk-ceo',
    'pc-1', 'pc-2', 'pc-3', 'pc-4', 'pc-5', 'pc-6',
    'desk-chief-architect', 'desk-product-manager', 'desk-team-lead',
    'desk-backend-engineer', 'desk-ui-ux-expert', 'desk-data-engineer',
    'desk-project-manager', 'desk-market-researcher', 'desk-agent-organizer',
  ],
  cafeSeatNames: ['cafe-seat-1', 'cafe-seat-2', 'cafe-seat-3', 'cafe-seat-4'],
  cafeStands: [
    ['cafe-stand-coffee', 'coffee'],
    ['cafe-stand-vending', 'vending'],
  ],
  coffee: {
    trayTile: { x: 29, y: 15 },
    trayStand: { x: 29, y: 16 },
    machineStand: { x: 26, y: 20 },
    sinkTile: { x: 28, y: 18 },
    sinkStand: { x: 28, y: 20 },
    maxCups: 4,
  },
  anchors: {
    calendar: { x: 4, y: 1 },
    boards: { x: 6, y: 10 },
    clock: { x: 1, y: 1 },
  },
  errandSpots: [
    { kind: 'water', stand: { x: 2, y: 20 }, facing: 'left', fx: { x: 1, y: 20 }, duration: 4.5 },
    { kind: 'water', stand: { x: 22, y: 20 }, facing: 'right', fx: { x: 23, y: 20 }, duration: 4.5 },
    { kind: 'water', stand: { x: 30, y: 20 }, facing: 'right', fx: { x: 31, y: 20 }, duration: 4.5 },
    { kind: 'water', stand: { x: 6, y: 4 }, facing: 'up', fx: { x: 6, y: 3 }, duration: 4.5, orchestratorOnly: true },
    { kind: 'smoke', stand: { x: 2, y: 3 }, facing: 'up', fx: { x: 2, y: 1 }, duration: 18, orchestratorOnly: true },
    { kind: 'water', stand: { x: 17, y: 4 }, facing: 'up', fx: { x: 17, y: 3 }, duration: 4.5 },
    { kind: 'window', stand: { x: 10, y: 3 }, facing: 'up', fx: { x: 10, y: 1 }, duration: 5 },
    { kind: 'window', stand: { x: 15, y: 3 }, facing: 'up', fx: { x: 14, y: 1 }, duration: 5 },
    { kind: 'dispenser', stand: { x: 16, y: 3 }, facing: 'down', fx: { x: 16, y: 4 }, duration: 3.5 },
    { kind: 'dispenser', stand: { x: 32, y: 4 }, facing: 'up', fx: { x: 32, y: 3 }, duration: 3.5 },
    { kind: 'fridge', stand: { x: 29, y: 20 }, facing: 'up', fx: { x: 29, y: 19 }, duration: 3.2 },
    { kind: 'shelf', stand: { x: 30, y: 20 }, facing: 'up', fx: { x: 30, y: 18 }, duration: 4 },
    { kind: 'bin', stand: { x: 18, y: 20 }, facing: 'left', fx: { x: 17, y: 20 }, duration: 2.6 },
    { kind: 'bin', stand: { x: 31, y: 16 }, facing: 'right', fx: { x: 32, y: 16 }, duration: 2.6 },
  ],
  monitor: {
    offTopLeftGid: 365,
    onGids: [
      [367, 0, 0], [368, 1, 0],
      [383, 0, 1], [384, 1, 1],
    ],
  },
  palette: {
    background: 0x1a1320,
    noteColors: { todo: 0xf2df8a, doing: 0x9ecbf0, blocked: 0xf0a3a3, done: 0xa8e0b0 },
  },
  seatFacing: { 'desk-ceo': 'down' },
  cast: undefined as any,
};

export const ORACLE_BROOKLYN99_THEME: ThemeConfig = {
  id: 'brooklyn99' as any,
  mapRaw: brooklyn99MapRaw,
  tilesets: ORACLE_OFFICE_THEME.tilesets,
  primarySeatNames: [
    'desk-ceo',
    'pc-1', 'pc-2', 'pc-3', 'pc-4',
    'pc-5', 'pc-6', 'pc-7', 'pc-8',
  ],
  cafeSeatNames: ['cafe-seat-1', 'cafe-seat-2', 'cafe-seat-3', 'cafe-seat-4'],
  cafeStands: [
    ['cafe-stand-coffee', 'coffee'],
    ['cafe-stand-vending', 'vending'],
  ],
  coffee: {
    trayTile: { x: 33, y: 18 },
    trayStand: { x: 33, y: 19 },
    machineStand: { x: 30, y: 21 },
    sinkTile: { x: 31, y: 18 },
    sinkStand: { x: 31, y: 19 },
    maxCups: 4,
  },
  anchors: {
    calendar: { x: 4, y: 1 },
    boards: { x: 14, y: 1 },
    clock: { x: 1, y: 1 },
  },
  errandSpots: [
    { kind: 'water', stand: { x: 2, y: 13 }, facing: 'left', fx: { x: 1, y: 13 }, duration: 4.5 },
    { kind: 'water', stand: { x: 24, y: 15 }, facing: 'right', fx: { x: 25, y: 15 }, duration: 4.5 },
    { kind: 'water', stand: { x: 13, y: 15 }, facing: 'down', fx: { x: 13, y: 16 }, duration: 4.5 },
    { kind: 'water', stand: { x: 28, y: 6 }, facing: 'up', fx: { x: 28, y: 5 }, duration: 4.5, orchestratorOnly: true },
    { kind: 'smoke', stand: { x: 34, y: 2 }, facing: 'up', fx: { x: 34, y: 0 }, duration: 18, orchestratorOnly: true },
    { kind: 'window', stand: { x: 14, y: 1 }, facing: 'up', fx: { x: 14, y: 0 }, duration: 5 },
    { kind: 'window', stand: { x: 22, y: 1 }, facing: 'up', fx: { x: 22, y: 0 }, duration: 5 },
    { kind: 'dispenser', stand: { x: 8, y: 15 }, facing: 'down', fx: { x: 8, y: 16 }, duration: 3.5 },
    { kind: 'dispenser', stand: { x: 17, y: 20 }, facing: 'down', fx: { x: 17, y: 21 }, duration: 3.5 },
    { kind: 'fridge', stand: { x: 29, y: 21 }, facing: 'up', fx: { x: 29, y: 20 }, duration: 3.2 },
    { kind: 'shelf', stand: { x: 34, y: 18 }, facing: 'up', fx: { x: 34, y: 17 }, duration: 4 },
    { kind: 'bin', stand: { x: 19, y: 20 }, facing: 'left', fx: { x: 18, y: 20 }, duration: 2.6 },
    { kind: 'bin', stand: { x: 34, y: 15 }, facing: 'up', fx: { x: 34, y: 14 }, duration: 2.6 },
  ],
  monitor: ORACLE_OFFICE_THEME.monitor,
  palette: ORACLE_OFFICE_THEME.palette,
  cast: undefined as any,
};
