'use strict';
/** PH gallery image 1 — 1270x760 plate: brand ground + the real cast at one
 *  continuous desk. Headline is layered in HTML so it gets real typography.
 *  Geometry rule that matters: the desk line and the monitor tops must both sit
 *  BELOW the chin, or the screens read as strapped to someone's chest. */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const art = require(path.join(ROOT, 'test/load-ts.cjs'))('src/renderer/src/scene/office/portraitArt.ts');

const W = 1270, H = 760, SW = art.SCENE_W, SH = art.SCENE_H;
const SCALE = 7;

const GROUND  = [253, 244, 209];
const WALL    = [244, 211, 94];
const WALL_HI = [248, 222, 122];
const DESK    = [58, 44, 32], DESK_T = [92, 70, 50];
const SCREEN  = [26, 30, 26], SCREEN_ON = [126, 217, 87];
const BEZEL   = [172, 162, 144], BEZEL_D = [128, 120, 106];

const buf = Buffer.alloc(W * H * 3);
const px = (x,y,c) => { if(x<0||y<0||x>=W||y>=H) return; const i=(y*W+x)*3; buf[i]=c[0];buf[i+1]=c[1];buf[i+2]=c[2]; };
const rect = (x0,y0,x1,y1,c) => { for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) px(x,y,c); };

const BAND_TOP = 300;    // cream above this = headline room
const DESK_Y   = 656;    // desk surface
const SPRITE_TOP = DESK_Y - SH * SCALE;  // bodies meet the desk exactly
const CHIN = SPRITE_TOP + 19 * SCALE;   // ~489 — nothing opaque above this line
const MON_TOP = CHIN + 10;

rect(0,0,W,H,GROUND);
rect(0,BAND_TOP,W,DESK_Y,WALL);
rect(0,BAND_TOP,W,BAND_TOP+26,WALL_HI);   // light falloff at the wall top

const CAST = ['michael','jim','pam','dwight','kevin'];
const gap = Math.floor((W - CAST.length*SW*SCALE) / (CAST.length+1));

// bodies first, desk drawn over them
CAST.forEach((name, i) => {
  const sp = art.sceneFrameBufs(name).front[0];
  const ox = gap + i*(SW*SCALE + gap);
  for (let sy=0; sy<SH; sy++) for (let sx=0; sx<SW; sx++) {
    const k=(sy*SW+sx)*4; if (sp[k+3]<128) continue;
    const c=[sp[k],sp[k+1],sp[k+2]];
    for(let dy=0;dy<SCALE;dy++) for(let dx=0;dx<SCALE;dx++) px(ox+sx*SCALE+dx, SPRITE_TOP+sy*SCALE+dy, c);
  }
});

// one continuous desk across the whole frame
rect(0, DESK_Y, W, DESK_Y+14, DESK_T);
rect(0, DESK_Y+14, W, H, DESK);

// terminals sitting ON the desk, tops clear of every chin
CAST.forEach((_, i) => {
  const ox = gap + i*(SW*SCALE + gap);
  const mw = 104, mx = ox + Math.floor((SW*SCALE - mw)/2);
  rect(mx-5, MON_TOP-5, mx+mw+5, DESK_Y+2, BEZEL);
  rect(mx-5, DESK_Y-4, mx+mw+5, DESK_Y+2, BEZEL_D);   // base shadow on the desk
  rect(mx, MON_TOP, mx+mw, DESK_Y-8, SCREEN);
  const rows = Math.floor((DESK_Y-8 - MON_TOP - 10) / 14);
  for (let l=0; l<rows; l++) {
    const wd = [62,34,76,48,58][(l+i)%5];
    rect(mx+9, MON_TOP+9+l*14, mx+9+Math.min(wd, mw-18), MON_TOP+16+l*14, SCREEN_ON);
  }
});

fs.writeFileSync('/tmp/gal1.ppm', Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), buf]));
console.log(`plate ${W}x${H}  chin=${CHIN}  monitorTop=${MON_TOP}  desk=${DESK_Y}`);
