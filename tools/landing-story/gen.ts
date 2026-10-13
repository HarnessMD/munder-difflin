import { getBuf, sceneFrameBufs, PORTRAIT_W, PORTRAIT_H, SCENE_W, SCENE_H } from './pa';
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';
function crc32(b: Buffer){let c:number,t:number[]=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}let x=0xffffffff;for(const v of b)x=t[(x^v)&0xff]^(x>>>8);return (x^0xffffffff)>>>0}
function chunk(type:string,data:Buffer){const l=Buffer.alloc(4);l.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([l,td,c])}
function png(w:number,h:number,rgba:Uint8ClampedArray){const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;Buffer.from(rgba.buffer,rgba.byteOffset+y*w*4,w*4).copy(raw,y*(w*4+1)+1)}const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
function sheet(frames:Uint8ClampedArray[],w:number,h:number){const out=new Uint8ClampedArray(w*frames.length*h*4);frames.forEach((f,i)=>{for(let y=0;y<h;y++)for(let x=0;x<w*4;x++)out[(y*w*frames.length*4)+i*w*4+x]=f[y*w*4+x]});return png(w*frames.length,h,out)}
const names=['michael','dwight','jim','pam','angela','oscar','kevin','creed','stanley','andy','kelly','ryan'];
const out:any={};
for(const n of names){const f=sceneFrameBufs(n as any);out[n]={portrait:'data:image/png;base64,'+png(PORTRAIT_W,PORTRAIT_H,getBuf(n as any)).toString('base64'),walk:'data:image/png;base64,'+sheet([f.front[1],f.front[0],f.front[2],f.front[0]],SCENE_W,SCENE_H).toString('base64')}}
writeFileSync('cast.json',JSON.stringify(out));
writeFileSync('michael.png',png(PORTRAIT_W,PORTRAIT_H,getBuf('michael' as any)));
