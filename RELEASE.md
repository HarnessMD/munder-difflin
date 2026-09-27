<!-- RELEASE RUNNER, REQUIRED BEFORE YOU TAG: run RELEASE-CHECKLIST.md. This comment is not rendered in the published notes. -->
# Munder Difflin v0.5.4

**A local hive of Claude Code, Antigravity, Codex, Gemini, Cursor, Grok & Copilot agents that run themselves.**
Messaging, routing, and remembering, coordinated by your clone, who you talk to. Local-first.

### → [**munderdiffl.in**](https://munderdiffl.in/) · see it in action, then grab a build below

---

## What's new in 0.5.4

**Cancel your Granola and Wispr Flow subscriptions. The Stapler does both, all running locally, and every agent gets easier to start, restart and steer.**

- **Dictate into any app.** Hold Option on the Mac, or Control+Alt+Space on
  Windows and Linux (X11), talk, and let go. The words land in whatever field
  is in front of you, in any app, and in every text box inside Munder Difflin.
- **Meetings hear both sides.** Your microphone is written as You and the
  call's audio as Them, on Mac, Windows and Linux. Shift+Command+Space starts
  and stops a meeting on the Mac, Control+Shift+Space on Windows and Linux.
  Correct the transcript, add a description, and send it to any of your agents.
- **Transcription on your machine.** A Whisper model ships inside the app and
  is the default engine. A larger model is one download away, Apple's on device
  recogniser works on macOS 26, and Groq stays off unless you add a key.
- **Your words.** 126 built in technical names plus your own, for dictation
  and meetings. English for now.
- **Tell an agent from the Stapler.** Record message, several screenshots per
  message, and a To menu that remembers who you picked.
- **A missing CLI is a card, not an error.** Install and sign in from inside
  the app for every engine, with Set up manually when either fails.
- **Ask me** on every agent's Inbox, answered from one box over the composer.
- **Two floors on one machine.** New Floor asks where to start and runs a
  second office on its own hive, with one licence for the machine.
- **Send now goes straight in**, Restart & Continue keeps the conversation
  for every engine, and **Opus 5.5** is the default Claude model.
- **Settings, redesigned.** One Save for everything, inbound integrations
  for GitHub, Linear, Telegram and your own webhook with the agent that
  answers each, webhooks agents can add and edit, and custom secrets stored
  encrypted beside your provider keys.
- **Crashes keep your work.** A crashed agent keeps its uncommitted work and
  restarts in that folder.
- **Keep my agent order**, the new agent row and the new Classic cards, and
  the IDE on Command+I with find and replace.
- **Right to left.** Arabic reads right to left across the app and the
  terminal.

**Launch offer:** the Pro annual plan for $150 USD, adjusted for purchasing power in different countries and as low as $100 a year. [Get Pro](https://app.harnessmd.com/console/license)

<!-- Munder Difflin 0.5.4 release drop v3 (Pam). Built by build-drop.cjs from drop-053.src.html. Video: X post https://x.com/hicallmechai/status/2103600312296878304. Loads nothing from the network. -->
<!-- drop -->
<style>
@property --mo-amp{syntax:"<number>";inherits:true;initial-value:0}@property --mo-esx{syntax:"<number>";inherits:true;initial-value:1}@property --mo-esy{syntax:"<number>";inherits:true;initial-value:1}@property --mo-tilt{syntax:"<number>";inherits:true;initial-value:0}@property --mo-edy{syntax:"<number>";inherits:true;initial-value:0}@property --mo-edx{syntax:"<number>";inherits:true;initial-value:0}@property --mo-esx2{syntax:"<number>";inherits:true;initial-value:0}@property --mo-esy2{syntax:"<number>";inherits:true;initial-value:0}@property --mo-tilt2{syntax:"<number>";inherits:true;initial-value:0}@property --mo-edy2{syntax:"<number>";inherits:true;initial-value:0}@property --mo-lock{syntax:"<number>";inherits:true;initial-value:0}@property --mo-shake{syntax:"<number>";inherits:true;initial-value:0}@property --mo-rock{syntax:"<number>";inherits:true;initial-value:0}@property --mo-rockp{syntax:"<number>";inherits:true;initial-value:1}@property --mo-bdy{syntax:"<number>";inherits:true;initial-value:0}.mo-root,.mo-breathe,.mo-bob{transform-box:view-box;transform-origin:center}.mo-root{--mo-amp:0;--mo-morph:calc(.4s*var(--mo-rate,1));--mo-morph-ease:ease-in-out;--mo-tp:--mo-esx,--mo-esy,--mo-tilt,--mo-edy,--mo-edx,--mo-esx2,--mo-esy2,--mo-tilt2,--mo-edy2,--mo-lock,--mo-shake,--mo-rock,--mo-bdy;--mo-md:var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph),var(--mo-morph);--mo-me:var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease),var(--mo-morph-ease);transition-property:--mo-amp,transform,var(--mo-tp);transition-duration:calc(.4s*var(--mo-rate,1)),calc(.16s*var(--mo-rate,1)),var(--mo-md);transition-timing-function:ease-out,cubic-bezier(.23,1,.32,1),var(--mo-me);animation:mo-shake calc(.112s*var(--mo-rate,1))linear infinite}.mo-bob>g:not(.mo-eyes){fill:var(--mo-head);transition:fill var(--mo-morph)var(--mo-morph-ease)}.mo-eyes{fill:var(--mo-eye);transition:fill var(--mo-morph)var(--mo-morph-ease)}@keyframes mo-shake{0%,to{translate:calc(.62px*var(--mo-shake))calc(-.34px*var(--mo-shake))}25%{translate:calc(-.7px*var(--mo-shake))calc(.22px*var(--mo-shake))}50%{translate:calc(.38px*var(--mo-shake))calc(.66px*var(--mo-shake))}75%{translate:calc(-.44px*var(--mo-shake))calc(-.6px*var(--mo-shake))}}.mo-root.mo-expr{--mo-morph:calc(.3s*var(--mo-rate,1));--mo-morph-ease:cubic-bezier(.45,.05,.5,1)}.mo-root:hover{--mo-amp:1;transition-duration:calc(.4s*var(--mo-rate,1)),calc(.22s*var(--mo-rate,1)),var(--mo-md);transform:translateY(-1.5px)scale(1.04)}.mo-root.mo-always{--mo-amp:1}.mo-breathe{animation-name:mo-breathe;animation-duration:calc(2.8s*var(--mo-rate,1));animation-delay:calc(var(--mo-phase,0s)*var(--mo-rate,1));animation-iteration-count:infinite;animation-direction:alternate;animation-timing-function:ease-in-out}@keyframes mo-breathe{to{transform:scaleX(calc(1 + .022*var(--mo-amp)))scaleY(calc(1 + -1*.018*var(--mo-amp)))}}.mo-bob{translate:0 calc(var(--mo-bdy)*1px);animation-name:mo-bob;animation-duration:calc(3.4s*var(--mo-rate,1));animation-delay:calc(var(--mo-bob-phase,0s)*var(--mo-rate,1));animation-iteration-count:infinite;animation-direction:alternate;animation-timing-function:ease-in-out}@keyframes mo-bob{0%{transform:translateY(0)}to{transform:translateY(calc(-1.1px*var(--mo-amp)))}}.mo-eye{transform-box:view-box;--mo-sel:calc((var(--mo-wrap,1) + 1)/2);--mo-x:calc(var(--mo-esx) + var(--mo-esx2)*var(--mo-sel));--mo-y:calc(var(--mo-esy) + var(--mo-esy2)*var(--mo-sel));--mo-t:calc(var(--mo-tilt) + var(--mo-tilt2)*var(--mo-sel));--mo-ph:calc(var(--mo-sel)*(1 + -1*var(--mo-rock)) + var(--mo-rock)*((1 + var(--mo-wrap,1)*var(--mo-rockp))/2));translate:calc(var(--mo-edx)*var(--mo-wrap,1)*1px)calc((var(--mo-edy) + var(--mo-edy2)*var(--mo-ph))*1px);rotate:calc((var(--mo-t)*var(--mo-wrap,1) + -1*var(--mo-lean,0)*var(--mo-lock))*1deg);transform:rotate(calc(var(--mo-lean,0)*1deg))scaleX(var(--mo-x))scaleY(var(--mo-y))rotate(calc(var(--mo-lean,0)*-1deg));animation-name:mo-rock;animation-duration:calc(.9s*var(--mo-rate,1));animation-iteration-count:infinite;animation-timing-function:ease-in-out}@container style(--mo-rock:0){.mo-eye{animation-name:none}}@keyframes mo-rock{0%,to{--mo-rockp:1}50%{--mo-rockp:-1}}.mo-eye>*{transform-box:fill-box;transform-origin:center;animation-name:mo-blink,mo-wrap;animation-duration:calc(var(--mo-blink,4.8s)*var(--mo-rate,1)),calc(var(--mo-saccade,5.6s)*var(--mo-rate,1));animation-delay:calc(var(--mo-blink-phase,0s)*var(--mo-rate,1)),calc(var(--mo-saccade-phase,0s)*var(--mo-rate,1));animation-iteration-count:infinite;animation-timing-function:linear}@keyframes mo-blink{0%,97.2%{transform:rotate(calc(var(--mo-lean,0)*1deg))scaleY(1)rotate(calc(var(--mo-lean,0)*-1deg));animation-timing-function:ease-in}98.6%{transform:rotate(calc(var(--mo-lean,0)*1deg))scaleY(calc(1 + -1*.92*var(--mo-amp)))rotate(calc(var(--mo-lean,0)*-1deg));animation-timing-function:ease-out}to{transform:rotate(calc(var(--mo-lean,0)*1deg))scaleY(1)rotate(calc(var(--mo-lean,0)*-1deg))}}.mo-eyes{animation-name:mo-saccade;animation-duration:calc(var(--mo-saccade,5.6s)*var(--mo-rate,1));animation-delay:calc(var(--mo-saccade-phase,0s)*var(--mo-rate,1));animation-iteration-count:infinite;animation-timing-function:linear}@keyframes mo-saccade{0%,15%{translate:0}16.5%,31%{translate:calc(-.8px*var(--mo-look-x,1.4)*var(--mo-amp))calc(-.9px*var(--mo-look-y,1.1)*var(--mo-amp))}32.5%,47%{translate:calc(1px*var(--mo-look-x,1.4)*var(--mo-amp))calc(.1px*var(--mo-look-y,1.1)*var(--mo-amp))}48.5%,63%{translate:calc(-.15px*var(--mo-look-x,1.4)*var(--mo-amp))calc(.85px*var(--mo-look-y,1.1)*var(--mo-amp))}64.5%,79%{translate:calc(.75px*var(--mo-look-x,1.4)*var(--mo-amp))calc(-.8px*var(--mo-look-y,1.1)*var(--mo-amp))}80.5%,98.5%{translate:calc(-1px*var(--mo-look-x,1.4)*var(--mo-amp))calc(-.15px*var(--mo-look-y,1.1)*var(--mo-amp))}to{translate:0}}@keyframes mo-wrap{0%,15%{scale:1;rotate:none}16.5%,31%{scale:calc(1 + -1*.0176*var(--mo-look-mx,1.4)*var(--mo-amp) + .008*var(--mo-look-x,1.4)*var(--mo-wrap,1)*var(--mo-amp))calc(1 + -1*.027*var(--mo-look-my,1.1)*var(--mo-amp));rotate:calc(.648deg*var(--mo-look-x,1.4)*var(--mo-look-y,1.1)*var(--mo-wrap,1)*var(--mo-amp))}32.5%,47%{scale:calc(1 + -1*.022*var(--mo-look-mx,1.4)*var(--mo-amp) + -1*.01*var(--mo-look-x,1.4)*var(--mo-wrap,1)*var(--mo-amp))calc(1 + -1*.003*var(--mo-look-my,1.1)*var(--mo-amp));rotate:calc(.09deg*var(--mo-look-x,1.4)*var(--mo-look-y,1.1)*var(--mo-wrap,1)*var(--mo-amp))}48.5%,63%{scale:calc(1 + -1*.0033*var(--mo-look-mx,1.4)*var(--mo-amp) + .0015*var(--mo-look-x,1.4)*var(--mo-wrap,1)*var(--mo-amp))calc(1 + -1*.0255*var(--mo-look-my,1.1)*var(--mo-amp));rotate:calc(-.115deg*var(--mo-look-x,1.4)*var(--mo-look-y,1.1)*var(--mo-wrap,1)*var(--mo-amp))}64.5%,79%{scale:calc(1 + -1*.0165*var(--mo-look-mx,1.4)*var(--mo-amp) + -1*.0075*var(--mo-look-x,1.4)*var(--mo-wrap,1)*var(--mo-amp))calc(1 + -1*.024*var(--mo-look-my,1.1)*var(--mo-amp));rotate:calc(-.54deg*var(--mo-look-x,1.4)*var(--mo-look-y,1.1)*var(--mo-wrap,1)*var(--mo-amp))}80.5%,98.5%{scale:calc(1 + -1*.022*var(--mo-look-mx,1.4)*var(--mo-amp) + .01*var(--mo-look-x,1.4)*var(--mo-wrap,1)*var(--mo-amp))calc(1 + -1*.0045*var(--mo-look-my,1.1)*var(--mo-amp));rotate:calc(.135deg*var(--mo-look-x,1.4)*var(--mo-look-y,1.1)*var(--mo-wrap,1)*var(--mo-amp))}to{scale:1;rotate:none}}@media not ((hover:hover) and (pointer:fine)){.mo-root:hover{--mo-amp:0;transform:none}.mo-root.mo-always{--mo-amp:1}.mo-root:not(.mo-always),.mo-root:not(.mo-always) *{animation-play-state:paused}.mo-root.mo-expr:not(.mo-always) .mo-eye{animation-play-state:running}}.mo-slow{--mo-rate:5}@media (prefers-reduced-motion:reduce){.mo-root,.mo-breathe,.mo-bob,.mo-eyes,.mo-eye,.mo-eye>*{animation:none;transition:none}.mo-bob>g:not(.mo-eyes){transition:none}}

.m3{--bg:#FFFDF7;--sf:#FFFFFF;--sf2:#F5F2E8;--ink:#1B1B1B;--dim:#57544C;--faint:#8A867A;--ln:#1B1B1B;--soft:rgba(27,27,27,.14);--y:#FFC94F;--y2:#FFE7A8;--sky:#72C2DF;--skyS:#DCEFF7;--lil:#E4DEFB;--mint:#D6F3E1;--pch:#FBDDBE;--tan:#F1E6CC;--sh:#1B1B1B;--band:#1B1B1B;--bandInk:#F4F1EA;--bandDim:#BDB6A6;--bandSf:#26231D;color:var(--ink);font-family:var(--font-sans);overflow:hidden}
@media (prefers-color-scheme:dark){
 body{background:#15130F!important}
 .m3{--bg:#15130F;--sf:#1F1C17;--sf2:#26231D;--ink:#F4F1EA;--dim:#C9C2B2;--faint:#958E80;--ln:rgba(244,241,234,.30);--soft:rgba(244,241,234,.12);--y2:#3A3018;--skyS:#1B2E36;--lil:#29253D;--mint:#1C3127;--pch:#3A2B1D;--tan:#2E291F;--sh:#39332A;--band:#221F19;--bandSf:#2E2A22}
}
.m3 *{box-sizing:border-box}
.m3 a{color:inherit}
.m3 a:hover{color:inherit}
.m3 svg{border:0;width:100%;height:auto;display:block}
.m3 h1,.m3 h2,.m3 h3{font-family:var(--font-mono);color:var(--ink);letter-spacing:-.02em;margin:0}
.m3 p{margin:0}
.m3 .wrap{padding:0 clamp(20px,4.5vw,44px)}
.m3 .face{width:var(--s,80px);flex:none;position:relative}
.m3 .face svg{filter:drop-shadow(0 3px 6px rgba(26,19,32,.22))}
.m3 .kbd{display:inline-flex;align-items:center;gap:5px;font:600 12px/1 var(--font-mono);padding:6px 8px 5px;background:var(--sf);border:1px solid var(--ln);box-shadow:2px 2px 0 var(--sh);white-space:nowrap;color:var(--ink)}
.m3 .chip{display:inline-flex;align-items:center;gap:6px;font:600 11px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;padding:6px 9px;border:1px solid var(--ln);background:var(--sf);color:var(--ink)}
.m3 .chip.y{background:var(--y);color:#1B1B1B;border-color:#1B1B1B}
.m3 .eye{font:600 11px/1 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.m3 .rise{animation:m3rise .6s cubic-bezier(.2,.7,.3,1) both}
.m3 .d1{animation-delay:.08s}.m3 .d2{animation-delay:.16s}.m3 .d3{animation-delay:.24s}.m3 .d4{animation-delay:.32s}.m3 .d5{animation-delay:.4s}
@keyframes m3rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

/* HERO */
.m3 .hero{position:relative;background:radial-gradient(120% 90% at 85% 40%,var(--y2) 0,transparent 60%),var(--bg);padding:clamp(28px,5vw,48px) 0 clamp(26px,4vw,40px);border-bottom:1px solid var(--soft)}
.m3 .hgrid{display:grid;grid-template-columns:1.12fr .88fr;gap:clamp(18px,3vw,36px);align-items:center}
.m3 .hero h1{font-size:clamp(26px,4.2vw,40px);line-height:1.2;margin:14px 0 16px}
.m3 .hero h1 em{font-style:normal;background:var(--y);color:#1B1B1B;padding:0 .12em;box-shadow:3px 3px 0 var(--sh);white-space:nowrap}
.m3 .lede{font-size:clamp(15px,1.7vw,17px);line-height:1.55;color:var(--dim);max-width:44ch}
.m3 .keys{display:flex;flex-wrap:wrap;gap:10px 14px;margin-top:18px;align-items:center;font-size:12.5px;color:var(--faint)}
.m3 .keys span{display:inline-flex;gap:6px;align-items:center}
.m3 .stage{position:relative;aspect-ratio:1/1;max-width:340px;margin-left:auto;width:100%}
.m3 .rays{position:absolute;inset:6%;border-radius:50%;background:repeating-conic-gradient(from 0deg,var(--y) 0 7deg,transparent 7deg 22deg);opacity:.28;animation:m3spin 38s linear infinite;-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}
.m3 .stage .face{position:absolute;left:50%;top:44%;--s:52%;transform:translate(-50%,-50%)}
.m3 .meter{position:absolute;left:50%;top:76%;transform:translateX(-50%);display:flex;gap:4px;align-items:center;height:34px;padding:0 12px;background:rgba(26,19,32,.82);border-radius:17px}
.m3 .meter i{display:block;width:4px;height:6px;border-radius:2px;background:#FFF8E7;animation:m3lvl 1.1s ease-in-out infinite}
.m3 .meter i:nth-child(2n){animation-delay:-.3s}.m3 .meter i:nth-child(3n){animation-delay:-.62s;animation-duration:.9s}.m3 .meter i:nth-child(5n){animation-delay:-.8s;animation-duration:1.3s}
@keyframes m3lvl{0%,100%{height:5px}40%{height:22px}70%{height:11px}}
.m3 .bub{position:absolute;font:500 13px/1.3 var(--font-sans);padding:9px 12px;background:var(--sf);border:1px solid var(--ln);box-shadow:3px 3px 0 var(--sh);max-width:190px;color:var(--ink);animation:m3bub 6s ease-in-out infinite}
.m3 .bub b{font:700 10.5px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:4px}
.m3 .bub.you{left:-8%;top:-3%}.m3 .bub.you b{color:#2F7F9C}
.m3 .bub.them{right:-8%;top:-3%;animation-delay:-3s}.m3 .bub.them b{color:#6D5BC2}
@media (prefers-color-scheme:dark){.m3 .bub.you b{color:#8FD3EA}.m3 .bub.them b{color:#B9ADF5}}
@keyframes m3bub{0%,8%{opacity:0;transform:translateY(8px) scale(.96)}14%,46%{opacity:1;transform:none}54%,100%{opacity:0;transform:translateY(-6px)}}
.m3 .spark{position:absolute;width:12px;height:12px;background:var(--y);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);animation:m3tw 2.6s ease-in-out infinite}
@keyframes m3tw{0%,100%{transform:scale(.4) rotate(0);opacity:.3}50%{transform:scale(1) rotate(45deg);opacity:1}}
@keyframes m3spin{to{transform:rotate(360deg)}}
@keyframes m3bob{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,-56%)}}
.m3 .stage .face{animation:m3bob 3.2s ease-in-out infinite}

/* SECTION HEADS */
.m3 .sec{padding:clamp(34px,5vw,52px) 0 0}
.m3 .sh{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px}
.m3 .sh h2{font-size:clamp(22px,3.2vw,30px);line-height:1.1;margin-top:8px}
.m3 .sh .face{--s:64px}
.m3 .sh.share h2{font-size:clamp(18px,2.4vw,22px)}
.m3 .sh.share p{margin-top:8px;font-size:14px;line-height:1.5;color:var(--dim)}

/* SHOWCASE ROWS */
.m3 .row{display:grid;grid-template-columns:1fr 1fr;gap:clamp(18px,3vw,34px);align-items:center;margin-bottom:clamp(26px,4vw,38px)}
.m3 .row.flip .vig{order:2}
.m3 .row h3{font-size:19px;line-height:1.2;margin:10px 0 10px}
.m3 .row p{color:var(--dim);font-size:14.5px;line-height:1.6}
.m3 .row .keys{margin-top:14px}
.m3 .vig{position:relative;background:var(--sf2);border:1px solid var(--ln);box-shadow:6px 6px 0 var(--sh);padding:18px;min-height:210px;overflow:hidden}
.m3 .floors{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.m3 .floors .win{min-width:0}
.m3 .floors .win .bar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m3 .fdesk{display:flex;flex-direction:column;gap:7px;padding:12px}
.m3 .fdesk div{display:flex;min-width:0;align-items:center;gap:8px;font:600 11.5px/1.2 var(--font-mono);color:var(--ink)}
.m3 .fdesk i{width:8px;height:8px;display:block;flex:none;border:1px solid var(--ln);background:var(--mint)}
.m3 .fdesk i.b{background:var(--y)}
.m3 .fdesk em{margin-left:auto;font-style:normal;font-weight:500;color:var(--faint)}
.m3 .fnew{grid-column:1 / 3;display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;border:1px dashed var(--ln);font:600 11.5px/1 var(--font-mono);color:var(--dim);background:var(--bg)}
.m3 .flist{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:7px}
.m3 .flist li{color:var(--dim);font-size:14px;line-height:1.5;padding-left:16px;position:relative}
.m3 .flist li:before{content:"";position:absolute;left:0;top:.55em;width:7px;height:7px;background:var(--y);border:1px solid var(--ln)}
.m3 .vig.sky{background:var(--skyS)}.m3 .vig.lil{background:var(--lil)}.m3 .vig.mint{background:var(--mint)}
.m3 .win{background:var(--sf);border:1px solid var(--ln)}
.m3 .win .bar{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--soft);font:600 10.5px/1 var(--font-mono);color:var(--faint);letter-spacing:.06em}
.m3 .win .bar i{width:9px;height:9px;display:block;background:var(--y)}.m3 .win .bar i+i{background:var(--sky)}.m3 .win .bar i+i+i{background:var(--mint)}
.m3 .win .bar span{margin-left:8px}
.m3 .field{margin:14px;padding:11px 12px;border:1px solid var(--ln);background:var(--bg);font-size:14px;min-height:44px;display:flex;align-items:center}
.m3 .typed{display:inline-block;overflow:hidden;white-space:nowrap;max-width:100%;animation:m3type 7s steps(38,end) infinite}
.m3 .caret{display:inline-block;width:2px;height:17px;background:var(--ink);margin-left:2px;animation:m3blink 1s step-end infinite}
@keyframes m3type{0%,18%{width:0}58%,90%{width:100%}100%{width:100%}}
@keyframes m3blink{50%{opacity:0}}
.m3 .held{position:absolute;right:16px;bottom:16px;display:flex;align-items:center;gap:10px}
.m3 .held .face{--s:58px}
.m3 .cap{display:grid;place-items:center;width:46px;height:46px;background:var(--sf);border:1px solid var(--ln);box-shadow:3px 3px 0 var(--sh);font:700 20px/1 var(--font-mono);color:var(--ink);animation:m3press 7s ease-in-out infinite}
@keyframes m3press{0%,12%{transform:none;box-shadow:3px 3px 0 var(--sh)}16%,60%{transform:translate(3px,3px);box-shadow:0 0 0 var(--sh);background:var(--y);color:#1B1B1B}66%,100%{transform:none;box-shadow:3px 3px 0 var(--sh)}}
.m3 .ms{font:600 11px/1 var(--font-mono);color:var(--faint);margin:0 14px 12px}
.m3 .tr{padding:6px 14px 14px;display:grid;gap:9px}
.m3 .ln{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:start;font-size:13.5px;line-height:1.45;animation:m3line 9s ease-out infinite both}
.m3 .ln b{font:700 10.5px/1 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;padding:5px 0;text-align:center;border:1px solid var(--ln);color:#1B1B1B}
.m3 .ln.u b{background:var(--sky)}.m3 .ln.t b{background:#CBBFF7}
.m3 .ln:nth-child(2){animation-delay:.9s}.m3 .ln:nth-child(3){animation-delay:1.8s}.m3 .ln:nth-child(4){animation-delay:2.7s}
@keyframes m3line{0%{opacity:0;transform:translateY(6px)}6%,88%{opacity:1;transform:none}96%,100%{opacity:0}}
.m3 .rec{display:inline-flex;align-items:center;gap:6px;margin-left:auto;color:var(--ink)}
.m3 .rec:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--y);box-shadow:0 0 0 3px rgba(255,201,79,.35);animation:m3pulse 1.4s ease-in-out infinite}
@keyframes m3pulse{50%{box-shadow:0 0 0 6px rgba(255,201,79,0)}}
.m3 .note{font:500 11.5px/1.3 var(--font-mono);color:var(--faint);margin:0 14px 12px}
.m3 .puckcard{display:flex;gap:14px;align-items:center}
.m3 .puckcard .face{--s:84px}
.m3 .pc{flex:1;position:relative;height:118px}
.m3 .st{position:absolute;inset:0;background:var(--sf);border:1px solid var(--ln);box-shadow:4px 4px 0 var(--sh);padding:12px 14px;display:flex;flex-direction:column;justify-content:center;gap:8px;font-size:14px;opacity:0;animation:m3st 9s infinite}
.m3 .st small{font:600 10.5px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.m3 .st.s2{animation-delay:3s}.m3 .st.s3{animation-delay:6s;opacity:1}
@keyframes m3st{0%{opacity:0;transform:translateY(6px)}4%,30%{opacity:1;transform:none}34%,100%{opacity:0}}
.m3 .mini{display:flex;gap:3px;align-items:center;height:18px}
.m3 .mini i{width:3px;height:5px;background:var(--ink);border-radius:2px;animation:m3lvl .9s ease-in-out infinite}
.m3 .mini i:nth-child(2n){animation-delay:-.3s}.m3 .mini i:nth-child(3n){animation-delay:-.6s}
.m3 .dots:after{content:"";animation:m3dots 1.2s steps(4,end) infinite}
@keyframes m3dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
.m3 .sent{display:flex;align-items:center;gap:8px;font-weight:600}
.m3 .tick{width:18px;height:18px;display:grid;place-items:center;background:#8FD3A8;border:1px solid #1B1B1B;font:700 12px/1 var(--font-sans);color:#1B1B1B}

/* ENGINE BAND */
.m3 .band{background:var(--band);color:var(--bandInk);margin-top:clamp(8px,2vw,16px);padding:clamp(30px,5vw,46px) 0;position:relative}
.m3 .band h2{color:var(--bandInk);font-size:clamp(22px,3.2vw,30px);margin:8px 0 10px}
.m3 .band .eye{color:var(--y)}
.m3 .band .lead{color:var(--bandDim);font-size:15px;line-height:1.6;max-width:58ch}
.m3 .eng{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px}
.m3 .eng div{background:var(--bandSf);border:1px solid rgba(244,241,234,.18);padding:14px}
.m3 .eng b{display:block;font:700 22px/1 var(--font-mono);color:var(--y);margin-bottom:8px}
.m3 .eng strong{display:block;font-size:14px;color:var(--bandInk);margin-bottom:4px}
.m3 .eng span{font-size:12.5px;line-height:1.45;color:var(--bandDim)}
.m3 .band .fine{margin-top:16px;font:500 12px/1.6 var(--font-mono);color:var(--bandDim)}
.m3 .band .face{position:absolute;right:clamp(20px,4.5vw,44px);top:-34px;--s:74px;transform:rotate(8deg)}

/* OFFER */
.m3 .offer{position:relative;background:var(--y);color:#1B1B1B;border:1px solid #1B1B1B;box-shadow:8px 8px 0 var(--sh);padding:clamp(22px,4vw,34px);display:grid;grid-template-columns:auto 1fr;gap:clamp(16px,3vw,30px);align-items:center;overflow:hidden}
.m3 .offer:before{content:"";position:absolute;inset:-40%;background:repeating-conic-gradient(from 0deg at 12% 50%,rgba(255,255,255,.28) 0 6deg,transparent 6deg 18deg);animation:m3spin 60s linear infinite;pointer-events:none}
.m3 .offer>*{position:relative}
.m3 .offer .face{--s:clamp(96px,15vw,136px);animation:m3hop 2.4s ease-in-out infinite}
@keyframes m3hop{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-8px) rotate(4deg)}}
.m3 .stamp{display:inline-block;font:700 11px/1 var(--font-mono);letter-spacing:.16em;text-transform:uppercase;background:#1B1B1B;color:var(--y);padding:7px 10px;transform:rotate(-2deg)}
.m3 .offer h2{color:#1B1B1B;font-size:clamp(22px,3.4vw,32px);line-height:1.12;margin:12px 0 6px}
.m3 .price{display:flex;align-items:baseline;gap:8px;margin:6px 0 4px}
.m3 .price b{font:800 clamp(46px,8vw,72px)/.95 var(--font-mono);letter-spacing:-.04em}
.m3 .price span{font:600 15px/1.2 var(--font-mono)}
.m3 .ppp{font-size:12.5px;line-height:1.5;max-width:52ch;color:#3A3528}
.m3 .ctas{display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center;margin-top:18px}
.m3 .btn{position:relative;display:inline-grid;place-items:center;min-width:236px;height:50px;padding:0 22px;background:#1B1B1B;color:#FFF8E7;border:1px solid #1B1B1B;box-shadow:4px 4px 0 #FFFDF7;font:700 15px/1 var(--font-mono);text-decoration:none;transition:transform .08s,box-shadow .08s;outline:none}
.m3 .btn:hover{color:#FFF8E7;transform:translate(-1px,-1px);box-shadow:5px 5px 0 #FFFDF7}
.m3 .btn:active{transform:translate(4px,4px);box-shadow:0 0 0 #FFFDF7}
.m3 .btn .go,.m3 .btn .wait{grid-area:1/1;display:inline-flex;align-items:center;gap:10px;white-space:nowrap}
.m3 .btn .wait{opacity:0}
.m3 .btn:focus .go{animation:m3out 3.2s both}
.m3 .btn:focus .wait{animation:m3in 3.2s both}
@keyframes m3out{0%{opacity:1}6%,88%{opacity:0}100%{opacity:1}}
@keyframes m3in{0%{opacity:0}6%,88%{opacity:1}100%{opacity:0}}
.m3 .spin{width:14px;height:14px;border:2px solid rgba(255,248,231,.3);border-top-color:var(--y);border-radius:50%;animation:m3spin .7s linear infinite}
.m3 .lnk{font:600 13.5px/1 var(--font-mono);color:#1B1B1B;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px}
.m3 .lnk:hover{color:#1B1B1B;text-decoration-thickness:2px}
.m3 .teams{margin-top:18px;padding-top:14px;border-top:1px solid rgba(27,27,27,.25);font-size:13px;line-height:1.5;color:#3A3528}
.m3 .teams a{white-space:nowrap;font:700 13px/1 var(--font-mono);color:#1B1B1B;text-underline-offset:4px;margin-left:4px}

/* GRIDS */
.m3 .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.m3 .card{background:var(--sf);border:1px solid var(--ln);box-shadow:4px 4px 0 var(--sh);padding:16px 16px 17px}
.m3 .card.lil{background:var(--lil)}.m3 .card.mint{background:var(--mint)}.m3 .card.pch{background:var(--pch)}.m3 .card.sky{background:var(--skyS)}.m3 .card.tan{background:var(--tan)}
.m3 .card h3{font-size:15px;line-height:1.25;margin:0 0 7px}
.m3 .card p{font-size:13.5px;line-height:1.55;color:var(--dim)}
.m3 .card .ic{width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--ln);background:var(--bg);margin-bottom:12px;font:700 14px/1 var(--font-mono);color:var(--ink)}
.m3 .card .ic svg{width:17px;height:17px}
.m3 .card.wide{grid-column:span 2}
.m3 .grid.four{grid-template-columns:repeat(4,1fr)}
.m3 .grid.four .card h3{font-size:14px}
.m3 .small{font-size:12.5px;color:var(--faint);margin-top:10px}
.m3 .railwrap{display:grid;grid-template-columns:330px 1fr;gap:clamp(18px,3vw,34px);align-items:start}
.m3 .rail{background:var(--sf2);border:1px solid var(--ln);box-shadow:6px 6px 0 var(--sh);padding:12px 10px 10px;font-size:12px;color:var(--ink)}
.m3 .rail .av{flex:none;width:26px;height:26px;display:grid;place-items:center;font:700 12px/1 var(--font-mono);font-style:normal;color:#1B1B1B;border:1px solid #1B1B1B}
.m3 .rh{display:flex;gap:9px;align-items:center;padding:2px 4px 10px}
.m3 .rh b{display:block;font-size:13px}.m3 .rh small{color:var(--faint);font-size:11px}
.m3 .nav{display:grid;gap:1px;padding-bottom:8px;border-bottom:1px solid var(--soft);margin-bottom:8px}
.m3 .nav span{padding:5px 6px;color:var(--dim)}
.m3 .nav span:before{content:"";display:inline-block;width:9px;height:9px;border:1.5px solid var(--faint);margin-right:9px;vertical-align:-1px}
.m3 .ag{display:flex;justify-content:space-between;align-items:center;padding:6px;background:var(--soft)}
.m3 .ag b{font-size:12px}
.m3 .live{display:inline-flex;align-items:center;gap:5px;color:var(--dim);font-size:11px}
.m3 .live i{width:6px;height:6px;border-radius:50%;background:#3E9B5F}
.m3 .srch{margin:7px 0;padding:6px 8px;border:1px solid var(--soft);background:var(--sf);color:var(--faint);font-size:11.5px}
.m3 .pf{display:flex;justify-content:space-between;padding:8px 6px 4px;font:600 11px/1 var(--font-mono);color:var(--dim)}
.m3 .pf em{font-style:normal;color:var(--faint)}
.m3 .rr{position:relative;display:flex;gap:8px;padding:8px 8px 8px 8px;border:1px solid transparent;margin-bottom:3px}
.m3 .rr.sel{background:var(--sf);border-color:var(--ln)}
.m3 .rr.lift{animation:m3lift 6s ease-in-out infinite}
@keyframes m3lift{0%,62%,100%{transform:none;box-shadow:none}70%,86%{transform:translate(3px,-4px);box-shadow:4px 4px 0 var(--sh);background:var(--sf)}}
.m3 .rr .hd{position:absolute;left:14px;top:40px;width:12px;height:6px;background:radial-gradient(circle,var(--faint) 1px,transparent 1.4px) 0 0/4px 3px}
.m3 .rb{flex:1;min-width:0;display:grid;gap:4px}
.m3 .r1{display:flex;align-items:center;gap:6px;min-width:0}
.m3 .r1 b{white-space:nowrap}
.m3 .r1 b{font-size:12.5px}
.m3 .orch{font:600 9.5px/1 var(--font-mono);padding:3px 5px;background:var(--y2);color:var(--ink);border:1px solid var(--soft)}
.m3 .bdg{font:700 10px/1 var(--font-mono);min-width:17px;height:17px;display:grid;place-items:center;background:var(--y);color:#1B1B1B;border-radius:50%;animation:m3pulse 1.6s ease-in-out infinite}
.m3 .stw{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--dim)}
.m3 .stw i{width:7px;height:7px;display:block}
.m3 .stw.wk i{border-radius:50%;background:#3E9B5F}.m3 .stw.wk{color:#3E9B5F}
.m3 .stw.id i{border-radius:50%;border:1.5px solid var(--faint)}
.m3 .stw.nd i{background:var(--y);border:1px solid #1B1B1B;transform:rotate(45deg)}.m3 .stw.nd{color:var(--ink);font-weight:600}
.m3 .r2{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--dim)}
.m3 .rq{flex:none;padding:2px 5px;border:1px solid var(--soft);font-family:var(--font-mono);font-size:10px;white-space:nowrap}
.m3 .cx{flex:1;height:4px;background:var(--soft)}
.m3 .cx i{display:block;height:100%;width:var(--c);background:var(--ink);animation:m3fill 1.4s ease-out both}
@keyframes m3fill{from{width:0}}
.m3 .rpct{flex:none;font-family:var(--font-mono);font-size:10px;color:var(--faint)}
.m3 .tk{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m3 .tk code{font:600 10px/1 var(--font-mono);color:var(--faint);margin-right:5px}
.m3 .r3{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--faint)}
.m3 .r3 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m3 .r3 em{font-style:normal;font-family:var(--font-mono)}
.m3 .nt{font-size:11px;color:var(--dim);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;padding-left:16px;position:relative}
.m3 .nt:before{content:"";position:absolute;left:2px;top:2px;width:8px;height:10px;border:1.3px solid var(--faint)}
.m3 .ask{font-size:11px;padding:5px 7px;background:var(--y2);border:1px solid var(--soft);color:var(--ink)}
.m3 .list.one{grid-template-columns:1fr}
.m3 .set{display:grid;grid-template-columns:210px 1fr;border:1px solid var(--ln);box-shadow:6px 6px 0 var(--sh);background:var(--sf)}
.m3 .menu{display:flex;flex-direction:column;gap:2px;padding:14px 10px;background:var(--sf2);border-right:1px solid var(--soft)}
.m3 .menu b{font:700 12px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint);padding:4px 8px 10px}
.m3 .menu span{font-size:13px;padding:7px 8px;color:var(--dim)}
.m3 .menu span.on{background:var(--y);color:#1B1B1B;font-weight:600}
.m3 .pane{padding:16px 18px}
.m3 .ph{font:700 13px/1 var(--font-mono);margin-bottom:10px;color:var(--ink)}
.m3 .ir{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 11px;border:1px solid var(--soft);margin-bottom:6px;font-size:13px}
.m3 .ir .it{font-weight:600;color:var(--ink)}
.m3 .ir .ag{font:500 11.5px/1.2 var(--font-mono);color:var(--faint);text-align:right}
.m3 .ir.add .it{color:var(--dim);font-weight:500}
.m3 .sv{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:14px;font-size:12.5px;color:var(--faint)}
.m3 .sv i{font:700 13px/1 var(--font-mono);font-style:normal;padding:9px 16px;background:var(--y);color:#1B1B1B;border:1px solid #1B1B1B;box-shadow:3px 3px 0 var(--sh);animation:m3save 4s ease-in-out infinite}
@keyframes m3save{0%,60%,100%{transform:none}70%{transform:translate(3px,3px);box-shadow:0 0 0 var(--sh)}}
.m3 .list{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;margin:0;padding:0;list-style:none}
.m3 .list li{position:relative;padding-left:20px;font-size:14px;line-height:1.55;color:var(--dim)}
.m3 .list li:before{content:"";position:absolute;left:0;top:.5em;width:9px;height:9px;background:var(--y);border:1px solid var(--ln)}
.m3 .list b{color:var(--ink);font-weight:600}
.m3 details{margin-top:14px;border:1px solid var(--ln);background:var(--sf);box-shadow:4px 4px 0 var(--sh)}
.m3 summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;font:700 14px/1.2 var(--font-mono);color:var(--ink)}
.m3 summary::-webkit-details-marker{display:none}
.m3 summary:after{content:"+";font:700 18px/1 var(--font-mono);width:26px;height:26px;display:grid;place-items:center;border:1px solid var(--ln);background:var(--y);color:#1B1B1B;transition:transform .2s}
.m3 details[open] summary:after{transform:rotate(45deg)}
.m3 details .list{padding:4px 16px 18px}

/* VIDEO + SIGN OFF */
.m3 .vid{position:relative;display:block;aspect-ratio:16/9;background:#1B1B1B;border:1px solid var(--ln);box-shadow:8px 8px 0 var(--sh);overflow:hidden;text-decoration:none;color:#FFF8E7}
.m3 .vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.m3 .vid video{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:cover;background:#1B1B1B}
.m3 .yt{margin-top:12px;font:600 13px/1 var(--font-mono)}
.m3 .yt a{text-underline-offset:4px}
.m3 .vid .pv{position:absolute;inset:0;background:radial-gradient(70% 90% at 30% 50%,#3A3018 0,#1B1B1B 70%)}
.m3 .vid .pv:before{content:"";position:absolute;inset:-30%;background:repeating-conic-gradient(from 0deg at 30% 50%,rgba(255,201,79,.12) 0 6deg,transparent 6deg 20deg);animation:m3spin 50s linear infinite}
.m3 .vid .face{position:absolute;left:12%;top:50%;--s:24%;transform:translateY(-50%)}
.m3 .vid .play{position:absolute;left:58%;top:50%;transform:translate(-50%,-50%);width:84px;height:84px;border-radius:50%;background:var(--y);display:grid;place-items:center;box-shadow:0 0 0 10px rgba(255,201,79,.2);transition:transform .15s}
.m3 .vid:hover .play{transform:translate(-50%,-50%) scale(1.07)}
.m3 .vid .play:after{content:"";margin-left:6px;border-style:solid;border-width:15px 0 15px 25px;border-color:transparent transparent transparent #1B1B1B}
.m3 .vid .vt{position:absolute;left:58%;top:calc(50% + 62px);transform:translateX(-50%);display:inline-flex;align-items:center;gap:9px;font:700 13px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.m3 .vid .xm{width:22px;height:22px;display:grid;place-items:center;background:#FFF8E7;color:#1B1B1B}
.m3 .vid .xm svg{width:13px;height:13px}
.m3 .soc{display:grid;grid-template-columns:1fr 1fr 1fr 1.4fr;gap:12px;margin-top:18px}
.m3 .soc a,.m3 .soc div{display:flex;align-items:center;gap:11px;padding:13px 14px;background:var(--sf);border:1px solid var(--ln);box-shadow:3px 3px 0 var(--sh);text-decoration:none;color:var(--ink);transition:transform .08s,box-shadow .08s;min-width:0}
.m3 .soc a:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--sh);color:var(--ink)}
.m3 .soc a:active{transform:translate(3px,3px);box-shadow:0 0 0 var(--sh)}
.m3 .soc i{flex:none;width:34px;height:34px;display:grid;place-items:center;background:var(--y);border:1px solid #1B1B1B;color:#1B1B1B}
.m3 .soc i svg{width:17px;height:17px}
.m3 .soc span{min-width:0}
.m3 .soc small{display:block;font:600 10px/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:5px}
.m3 .soc strong{display:block;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m3 .soc .mail strong{user-select:all;-webkit-user-select:all}
.m3 .bye{display:flex;align-items:center;gap:18px;justify-content:center;padding:clamp(34px,5vw,48px) 0 clamp(36px,5vw,50px);text-align:left}
.m3 .bye .face{--s:88px;animation:m3hop 2.8s ease-in-out infinite}
.m3 .bye h2{font-size:clamp(20px,3vw,26px)}
.m3 .bye p{color:var(--dim);font-size:14px;margin-top:6px}

@media (max-width:720px){
 .m3 .hgrid,.m3 .row,.m3 .offer{grid-template-columns:1fr}
 .m3 .row.flip .vig{order:0}
 .m3 .stage{margin:36px auto 0;max-width:280px}
 .m3 .eng,.m3 .soc{grid-template-columns:1fr 1fr}
 .m3 .grid,.m3 .grid.four{grid-template-columns:1fr 1fr}
 .m3 .set,.m3 .railwrap{grid-template-columns:1fr}
 .m3 .menu{display:none}
 .m3 .list{grid-template-columns:1fr}
 .m3 .card.wide{grid-column:auto}
 .m3 .fdesk em{display:none}
}
@media (prefers-reduced-motion:reduce){
 .m3 *,.m3 *:before,.m3 *:after{animation:none!important}
 .m3 .st{opacity:0}.m3 .st.s3{opacity:1}
 .m3 .typed{width:auto}
}
</style>

<div class="m3">

<section class="hero"><div class="wrap hgrid">
 <div>
  <div class="rise" style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip y">New in 0.5.4</span><span class="chip">macOS · Windows · Linux</span></div>
  <h1 class="rise d1">Cancel your <em>Granola</em> and <em>Wispr Flow</em> subscriptions</h1>
  <p class="lede rise d2">The Stapler does both, all running locally. Hold a key and talk into any app. Record a call and get notes that know who said what. Everything is transcribed on your machine, nothing is sent anywhere, and your agents pick it up from there.</p>
  <div class="keys rise d3">
   <span><span class="kbd">⌥ hold</span> dictate on the Mac</span>
   <span><span class="kbd">Ctrl Alt Space</span> Windows and Linux</span>
  </div>
 </div>
 <div class="stage rise d2">
  <div class="rays"></div>
  <i class="spark" style="left:14%;top:62%"></i><i class="spark" style="right:10%;top:70%;animation-delay:-1.1s"></i><i class="spark" style="left:66%;top:4%;animation-delay:-1.9s"></i>
  <div class="face"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div>
  <div class="meter"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <div class="bub you"><b>You</b>Can we ship on Friday?</div>
  <div class="bub them"><b>Them</b>Friday works. Send me the notes.</div>
 </div>
</div></section>

<section class="sec"><div class="wrap">
 <div class="sh"><div><span class="eye">Stapler</span><h2>Three ways to talk to it</h2></div><div class="face" style="--s:62px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div></div>

 <div class="row">
  <div class="vig sky">
   <div class="win"><div class="bar"><i></i><i></i><i></i><span>ANY APP</span></div>
    <div class="field"><span class="typed">Move standup to 11 and tell Dwight.</span><span class="caret"></span></div>
    <div class="ms">pasted in under 100 ms after you let go</div>
   </div>
   <div class="held"><div class="cap">⌥</div><div class="face"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div></div>
  </div>
  <div>
   <span class="chip">1 · Dictate</span>
   <h3>Talk into any app</h3>
   <p>Hold Option on the Mac and talk, then let go. The words land in whatever field is in front of you: your browser, your editor, a chat, or any box inside Munder Difflin. Option with a letter still types accents. The Stapler's eyes go wide and a small meter shows it hears you.</p>
   <div class="keys"><span><span class="kbd">⌥</span> Mac</span><span><span class="kbd">Ctrl Alt Space</span> Windows, Linux on X11</span></div>
   <p class="small">On Wayland the app says why it cannot listen for the key.</p>
  </div>
 </div>

 <div class="row flip">
  <div class="vig lil">
   <div class="win"><div class="bar"><i></i><i></i><i></i><span>MEETING</span><span class="rec">recording</span></div>
    <div class="tr">
     <div class="ln u"><b>You</b><span>Where are we on the launch video?</span></div>
     <div class="ln t"><b>Them</b><span>Final cut tonight. Needs the end card.</span></div>
     <div class="ln u"><b>You</b><span>I will ask Pam for it after this call.</span></div>
     <div class="ln t"><b>Them</b><span>Great. Send the notes to Kevin too.</span></div>
    </div>
    <div class="note">Headphones give the cleanest transcript.</div>
   </div>
  </div>
  <div>
   <span class="chip">2 · Meetings</span>
   <h3>Calls that know who said what</h3>
   <p>One key starts and stops a meeting from anywhere. Your microphone is written as You and the call's audio as Them, on Mac, Windows and Linux, and loud speakers no longer leak the other side into You. Afterwards, correct the transcript, add a description, and send it to any of your agents. The audio is never changed.</p>
   <div class="keys"><span><span class="kbd">⇧ ⌘ Space</span> Mac</span><span><span class="kbd">Ctrl ⇧ Space</span> Windows, Linux</span></div>
  </div>
 </div>

 <div class="row">
  <div class="vig mint">
   <div class="puckcard">
    <div class="face"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div>
    <div class="pc">
     <div class="st s1"><small>Record message</small><div style="display:flex;align-items:center;gap:10px"><b style="font-family:var(--font-mono)">Recording 00:04</b><span class="mini"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div></div>
     <div class="st s2"><small>Stapler</small><span class="dots">Turning your words into text</span></div>
     <div class="st s3"><small>Done</small><span class="sent"><span class="tick">✓</span>Sent to Michael.</span></div>
    </div>
   </div>
  </div>
  <div>
   <span class="chip">3 · Messages</span>
   <h3>Tell an agent without opening the app</h3>
   <p>Click the Stapler, Record message, and say it, then Done or Cancel. Done opens a compose card with your words. Add several screenshots, PDFs, videos or folders, pick who gets it, and the pick stays. No words are lost at a pause, and the mic stops the moment you click.</p>
   <div class="keys"><span><span class="kbd">Ctrl ⇧ 5</span> screenshot, Mac</span><span><span class="kbd">Ctrl ⇧ PrtSc</span> Windows, Linux</span></div>
  </div>
 </div>

 <div class="grid four" style="margin-top:6px">
  <div class="card"><h3>Eyes and sounds</h3><p>A thinking pose with drifting eyes while it listens, a 14 bar voice meter, and soft start and stop sounds you can switch off.</p></div>
  <div class="card"><h3>Its own settings</h3><p>Tabs for Settings, Meeting transcripts and Screenshots, one Save, and Make invisible when you want it gone.</p></div>
  <div class="card"><h3>Any screen setup</h3><p>Drag it across monitors and edges. It survives screens arriving, leaving or waking, and its cards open whole near an edge.</p></div>
  <div class="card"><h3>Light and dark</h3><p>It goes dark with the app and flips live when you change the theme.</p></div>
 </div>
</div></section>

<section class="band"><div class="wrap" style="position:relative">
 <div class="face"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div>
 <span class="eye">On your machine</span>
 <h2>Nothing is sent anywhere to transcribe.</h2>
 <p class="lead">A Whisper model ships inside the app and is the default engine for dictation and meetings. Groq stays off unless you add your own key.</p>
 <div class="eng">
  <div><b>60 MB</b><strong>Whisper base.en</strong><span>Inside the app. Works the moment you install.</span></div>
  <div><b>190 MB</b><strong>Whisper small.en</strong><span>One click download for sharper transcripts.</span></div>
  <div><b>Apple</b><strong>On device</strong><span>Apple's own recogniser on macOS 26.</span></div>
  <div><b>126</b><strong>Words it knows</strong><span>Built in technical names, plus your own words.</span></div>
 </div>
 <p class="fine">English for now. All of it lives in Settings, Dictation &amp; Meetings.</p>
</div></section>

<section class="sec"><div class="wrap">
 <div class="sh"><div><span class="eye">Floors</span><h2>Run more than one office at a time</h2></div><div class="face" style="--s:60px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div></div>
 <div class="row">
  <div class="vig pch">
   <div class="floors">
    <div class="win"><div class="bar"><i></i><i></i><i></i><span>FLOOR 1</span></div>
     <div class="fdesk"><div><i class="b"></i>Michael<em>routing</em></div><div><i></i>Jim<em>tests</em></div><div><i></i>Pam<em>landing</em></div><div><i></i>Kevin<em>release</em></div></div>
    </div>
    <div class="win"><div class="bar"><i></i><i></i><i></i><span>FLOOR 2</span></div>
     <div class="fdesk"><div><i class="b"></i>Michael<em>planning</em></div><div><i></i>Dwight<em>api</em></div><div><i></i>Angela<em>billing</em></div><div><i></i>Oscar<em>docs</em></div></div>
    </div>
    <div class="fnew"><span class="kbd">⇧ ⌘ N</span>New Floor</div>
   </div>
  </div>
  <div>
   <span class="chip">New in 0.5.4</span>
   <h3>One floor per project, all open together</h3>
   <p>File, New Floor asks where to start: pick a folder you already use or make a new one. The new floor opens in its own window and runs next to the one you have, so a client project and a side project can both be busy at once.</p>
   <ul class="flist">
    <li>Each floor has its own hive, its own agents, its own board and its own memory.</li>
    <li>Changing a floor's folder restarts only that floor. The others keep working.</li>
    <li>A hive only ever opens in one floor, so two offices never write over each other.</li>
    <li>One licence covers every floor on your machine.</li>
   </ul>
   <div class="keys"><span><span class="kbd">⇧ ⌘ N</span> Mac</span><span><span class="kbd">Ctrl ⇧ N</span> Windows, Linux</span></div>
  </div>
 </div>
</div></section>

<section class="sec"><div class="wrap">
 <div class="offer">
  <div class="face"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div>
  <div>
   <span class="stamp">Launch offer</span>
   <h2>Get the annual plan for $150</h2>
   <div class="price"><b>$150</b><span>USD a year</span></div>
   <p class="ppp">The price is adjusted for purchasing power in different countries, so it can go as low as $100 a year.</p>
   <div class="ctas">
    <a class="btn" href="https://app.harnessmd.com/console/license" target="_blank" rel="noreferrer"><span class="go">Get Pro for $150 a year →</span><span class="wait"><span class="spin"></span>Opening your browser</span></a>
    <a class="lnk" href="https://harnessmd.com/pro" target="_blank" rel="noreferrer">See everything in Pro</a>
   </div>
   <p class="teams">Running a company on one floor? <b>Teams</b> is $39 a seat a month, with a two week trial. <a href="https://harnessmd.com/checkout" target="_blank" rel="noreferrer">Set up Teams</a></p>
  </div>
 </div>
</div></section>

<section class="sec"><div class="wrap">
 <div class="sh"><div><span class="eye">Your floor</span><h2>Agents that are easier to start and steer</h2></div><div class="face" style="--s:60px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div></div>
 <div class="grid">
  <div class="card lil"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v10H9l-5 4z"/></svg></div><h3>Ask me</h3><p>Every agent's Inbox lists its own questions in a small box above the composer. One click answers where you stand, the bell opens them all, and Dismiss all clears them.</p></div>
  <div class="card mint"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l3 7 4-14 3 7h4"/></svg></div><h3>A missing CLI is a card</h3><p>Install runs the exact command in the agent's terminal, Node.js first if it is missing, and the agent starts by itself. Sign in inside the app with the code in large type, Copy and Open link. Set up manually when either fails.</p></div>
  <div class="card pch"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></div><h3>Temps are back on</h3><p>Temps are on by default again. Ask Michael for help with one job and he starts a temp for it, then lets it go when the job is done.</p></div>
  <div class="card sky"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4v16l7-5 7 5V4z"/></svg></div><h3>Send now goes straight in</h3><p>A queued message types into Claude Code at once, even mid turn. Queued messages never sit unsent under load or behind a silent compaction.</p></div>
  <div class="card"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg></div><h3>The new agent row</h3><p>Status, engine, model, context, task and the live action, with notes and search. In both skins.</p></div>
  <div class="card tan"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-width="3.2" d="M8 6h.01M16 6h.01M8 12h.01M16 12h.01M8 18h.01M16 18h.01"/></svg></div><h3>Keep my agent order</h3><p>Turn it on, then drag agents within a project by the handle under their picture, and projects among projects.</p></div>
  <div class="card"><div class="ic">5.5</div><h3>Opus 5.5 by default</h3><p>The default Claude model. Model labels are real names from the live catalog.</p></div>
  <div class="card"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/></svg></div><h3>Restart keeps the conversation</h3><p>For Claude, Codex, Kimi, Grok, Qwen, Gemini, Cursor and more. Edit the exact command an agent runs from its right panel and restart on it.</p></div>
  <div class="card"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12l-9 9-9-9 9-9zM12 8v8"/></svg></div><h3>Attach anything</h3><p>PDFs, videos and whole folders go in from the composer, and a pasted image becomes an attachment.</p></div>
  <div class="card mint"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M6 9l6 6 6-6M4 21h16"/></svg></div><h3>Crashes keep your work</h3><p>A crashed agent keeps its uncommitted work, restarts in that folder, and says it crashed without opening its terminal.</p></div>
  <div class="card sky"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/></svg></div><h3>An IDE you can trust</h3><p>Command I from anywhere, tabs that survive a quit, find and replace on Command F, and unsaved text that is never lost.</p></div>
  <div class="card lil"><div class="ic" style="font-size:13px">ع</div><h3>Right to left</h3><p>Arabic reads right to left across the app and the terminal, and Chinese no longer clips.</p></div>
 </div>
</div></section>

<section class="sec"><div class="wrap">
 <div class="sh"><div><span class="eye">Pro</span><h2>The new sidebar</h2></div><div class="face" style="--s:58px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div></div>
 <div class="railwrap">
  <div class="rail">
   <div class="rh"><i class="av" style="background:#FFC94F">M</i><div><b>Munder Difflin</b><small>PRO plan</small></div></div>
   <div class="nav"><span>Tasks</span><span>Inbox</span><span>Automations</span><span>Memory</span><span>Capabilities</span><span>Stapler</span></div>
   <div class="ag"><b>Agents</b><span class="live"><i></i>4 live</span></div>
   <div class="srch">Search agents and notes</div>
    <div class="rr"><span class="hd"></span><i class="av" style="background:#E4DEFB">M</i><div class="rb">
     <div class="r1"><b>Michael</b><span class="orch">orchestrator</span><span class="stw wk"><i></i>Working</span></div>
     <div class="r2"><span class="rq">Opus 5.5</span><span class="cx"><i style="--c:29%"></i></span><span class="rpct">29%</span></div>
     <div class="r3"><span>Routing 3 messages, reviewing the queue</span><em>37s</em></div><div class="nt">Runs the floor</div>
    </div></div>

   <div class="pf"><span>▾ md-server</span><em>3</em></div>
    <div class="rr sel"><span class="hd"></span><i class="av" style="background:#D6F3E1">D</i><div class="rb">
     <div class="r1"><b>Dwight</b><span class="bdg">2</span><span class="stw nd"><i></i>Needs you</span></div>
     <div class="r2"><span class="rq">GPT 5.5</span><span class="cx"><i style="--c:22%"></i></span><span class="rpct">22%</span></div>
     <div class="tk"><code>T-117</code> Webhook test suite</div><div class="r3"><span>using run_terminal_command</span><em>38s</em></div><div class="ask">Asked you: ship the retry change tonight?</div>
    </div></div>

    <div class="rr lift"><span class="hd"></span><i class="av" style="background:#FBDDBE">A</i><div class="rb">
     <div class="r1"><b>Angela</b><span class="stw id"><i></i>Idle</span></div>
     <div class="r2"><span class="rq">Fable 5.1</span><span class="cx"><i style="--c:7%"></i></span><span class="rpct">7%</span></div>
     <div class="tk"><code>T-118</code> Billing webhook retries</div><div class="r3"><span>starting up</span><em>2m</em></div><div class="nt">Prefers the flat schema. Do not let it touch the Mongo indexes.</div>
    </div></div>

   <div class="pf"><span>▸ harnessmd.com</span><em>3</em></div>
  </div>
  <ul class="list one">
   <li><b>Your office at a glance.</b> Tasks, Inbox, Automations, Memory, Capabilities and the Stapler at the top, agents grouped under their project folders with counts, and folds remembered.</li>
   <li><b>Every row tells you where things stand.</b> Engine and model, a status word with its dot (idle and working are different shapes), a context bar with the percent used, and the live line of what it is doing now, with the time since.</li>
   <li><b>Asked you</b> shows on the row when an agent has a question for you, newest first, and an unread badge clears when you open it.</li>
   <li><b>Notes</b> sit on the row behind a notepad button, long ones clamp to three lines, and search finds agents and the words in their notes.</li>
   <li><b>Keep my agent order.</b> Drag the handle under an avatar to move agents within a project, and projects among projects.</li>
   <li><b>Quiet at rest.</b> A faint tint on hover, a stronger tint and an even border when selected, tips that open away from the rail, and restart lives in the right panel.</li>
  </ul>
 </div>
</div></section>

<section class="sec"><div class="wrap">
 <div class="sh"><div><span class="eye">Settings, redesigned</span><h2>One place, one Save</h2></div><div class="face" style="--s:58px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div></div>
 <div class="set">
  <div class="menu"><b>Settings</b><span>General</span><span>Prerequisites</span><span>Agents &amp; Models</span><span>Autonomy &amp; Budgets</span><span class="on">Connections</span><span>Keys &amp; Secrets</span><span>Orchestrator's voice</span><span>Dictation &amp; Meetings</span><span>Memory &amp; Knowledge</span></div>
  <div class="pane">
   <div class="ph">Inbound integrations</div>
   <div class="ir"><span class="it">GitHub</span><span class="ag">answered by Michael</span></div>
   <div class="ir"><span class="it">Linear</span><span class="ag">answered by Oscar</span></div>
   <div class="ir"><span class="it">Telegram</span><span class="ag">answered by Angela</span></div>
   <div class="ir add"><span class="it">+ Add new inbound webhook</span><span class="ag">header secret, Bearer or signed body</span></div>
   <div class="ph" style="margin-top:14px">Keys &amp; Secrets</div>
   <div class="ir"><span class="it">STRIPE_TEST_KEY</span><span class="ag">encrypted on this machine</span></div>
   <div class="sv"><span>Unsaved changes</span><i>Save</i></div>
  </div>
 </div>
 <ul class="list" style="margin-top:20px">
  <li><b>One Save</b> for everything, greyed until something changes. A failed save shows in red, and closing without saving drops your changes.</li>
  <li><b>Inbound integrations.</b> A public, authenticated webhook address with samples for GitHub, Linear, Telegram and a blank one. Each says which agent answers, and agents can add and edit webhooks themselves.</li>
  <li><b>Custom secrets</b> sit beside your provider keys, stored encrypted and given to agents by name.</li>
  <li><b>Sections fold</b>, with small (i) tooltips in place of long paragraphs. Slack asks only for the fields its type needs.</li>
 </ul>
</div></section>

<section class="sec"><div class="wrap">
 <div class="sh"><div><span class="eye">And the rest</span><h2>More that changed</h2></div></div>
 <ul class="list">
  <li><b>New agent cards in Classic.</b> The strip card and the roster row show status, engine, model, context, ticket and live action.</li>
  <li><b>Status words say what they mean.</b> Needs you when an agent waits on you, Waiting when it waits on another agent.</li>
  <li><b>Every engine is listed</b> wherever an agent's engine is chosen, the orchestrator included.</li>
  <li><b>Copilot</b> runs interactive after sign in, <b>Grok</b> shows its cost, and <b>Codex</b> with remote control starts.</li>
  <li><b>Concise by default.</b> Claude Code agents start on the Concise output style.</li>
  <li><b>Temps are on by default again.</b> Michael starts one when you ask.</li>
  <li><b>Auto compaction</b> every 40 minutes at 30% of the context window, one bar for every model.</li>
  <li><b>Worktrees</b> are listed in Settings with a guarded delete.</li>
  <li><b>Shortcuts from a list.</b> Pick a key from the presets shown.</li>
 </ul>
 <details>
  <summary>Every fix in 0.5.4</summary>
  <ul class="list">
   <li>A message typed into an agent is submitted even on a slow machine. Return waits until the agent has read the text.</li>
   <li>The terminal takes the width of its pane, and a restarted agent's terminal draws and takes the mouse again.</li>
   <li>Restart &amp; Continue frees a Claude session something else was holding.</li>
   <li>A dead agent says so in the sidebar, with Restart.</li>
   <li>The model an agent is running shows in the sidebar, and a restart keeps it.</li>
   <li>An open question is never answered by the app. A queued message waits while a multiple choice question is on screen.</li>
   <li>Paste an image into a Pro composer.</li>
   <li>Grok agents show their cost, and Grok stays light in a light app.</li>
   <li>Codex remote control starts, and Copilot runs interactive after sign in.</li>
   <li>The webhook and Slack servers move to a free port when theirs is taken.</li>
   <li>The hive folder no longer swallows agents' git folders.</li>
   <li>A skill install that fails leaves nothing half done.</li>
   <li>Rewriting the saved command keeps its quotes and flags.</li>
   <li>A file share that expires also closes its public link.</li>
   <li>A config whose folder was deleted is no longer offered at launch.</li>
   <li>Memory cards no longer clip in Chinese.</li>
   <li>Stapler: Record message never gets stuck, Done and Cancel always take the click, and it survives monitors arriving, leaving or waking.</li>
   <li>One update redraws one sidebar row, so a busy floor no longer repaints the whole list.</li>
   <li>Tooltips open beside the sidebar, never over the rows below.</li>
   <li>Michael's picture is the logo in the app, the Dock and the installer.</li>
   <li>A Grok agent no longer opens on a black screen.</li>
   <li>A delivered message left in an agent's input box gets its Return again.</li>
   <li>A signed out CLI is spotted for every provider and gets the sign in panel.</li>
   <li>The update toast and the release page show their pictures and fonts.</li>
   <li>A stale model list can no longer drop a model the app ships with.</li>
   <li>On Windows an agent no longer stops at Claude Code's folder trust dialog.</li>
   <li>On Windows your settings, the roster and the board are written whole, so a crash mid write can no longer empty them.</li>
   <li>On Windows Antigravity is found at its own install location.</li>
  </ul>
 </details>
</div></section>

<section class="sec"><div class="wrap">
 <div class="sh share"><div><span class="eye">Launch video</span><h2>Help us get the word out</h2><p>Share our launch video on social media. One-shotted with Munder Difflin and Opus 5.5.</p></div></div>
 <a class="vid" href="https://x.com/hicallmechai/status/2103600312296878304" target="_blank" rel="noreferrer"><div class="pv"></div><div class="face"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div><span class="play"></span><span class="vt"><i class="xm"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg></i>Watch the launch video on X</span></a>
 <div class="soc">
  <a href="https://x.com/hiCallMeChai" target="_blank" rel="noreferrer"><i><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg></i><span><small>X</small><strong>@hiCallMeChai</strong></span></a>
  <a href="https://www.instagram.com/fitxai/" target="_blank" rel="noreferrer"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></i><span><small>Instagram</small><strong>@fitxai</strong></span></a>
  <a href="https://www.linkedin.com/in/chaitanyagiri10/" target="_blank" rel="noreferrer"><i><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM10 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z"/></svg></i><span><small>LinkedIn</small><strong>Chaitanya Giri</strong></span></a>
  <div class="mail"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/></svg></i><span><small>Email us</small><strong>support@harnessmd.com</strong></span></div>
 </div>
 <div class="bye">
  <div class="face"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-hidden="true" style="--mo-phase:-1432ms;--mo-bob-phase:-1695ms;--mo-blink:4069ms;--mo-blink-phase:-1998ms;--mo-look-x:1.15;--mo-look-mx:1.15;--mo-look-y:-1.43;--mo-look-my:1.43;--mo-saccade:5092ms;--mo-saccade-phase:-2107ms;--mo-head:#FFC94F;--mo-eye:#140f06;--mo-esx:1.34;--mo-esy:1.2;--mo-tilt:-6;--mo-edy:-1.05;--mo-edx:0.5;--mo-esx2:0.05;--mo-esy2:0.07;--mo-tilt2:3;--mo-lock:1;--mo-bdy:-1.4;display:block"><g class="mo-root mo-always mo-expr"><g class="mo-breathe"><g class="mo-bob"><g fill="#FFC94F"><path d="M84.26 50.49C84.26 72.23 69.74 87.58 49.17 87.58C28.61 87.58 14.08 72.23 14.08 50.49C14.08 28.74 28.61 13.39 49.17 13.39C69.74 13.39 84.26 28.74 84.26 50.49Z"/></g><g fill="#140f06" class="mo-eyes"><g class="mo-eye" style="--mo-wrap:-1;--mo-lean:-5.17;transform-origin:38.27px 46.1px"><path d="M41.55 45.81C42.31 54.17 42.31 54.17 39.03 54.46C35.75 54.76 35.75 54.76 35 46.4C34.24 38.04 34.24 38.04 37.52 37.74C40.8 37.44 40.8 37.44 41.55 45.81Z"/></g><g class="mo-eye" style="--mo-wrap:1;--mo-lean:-3.32;transform-origin:56.08px 47.02px"><path d="M59.45 46.82C59.99 56.09 59.99 56.09 56.62 56.28C53.25 56.48 53.25 56.48 52.71 47.22C52.17 37.95 52.17 37.95 55.54 37.76C58.91 37.56 58.91 37.56 59.45 46.82Z"/></g></g></g></g></g></svg></div>
  <div><h2>Hold ⌥ and say hi.</h2><p>Thank you for running Munder Difflin. Tell us what to build next.</p></div>
 </div>
</div></section>

</div>
<!-- /drop -->

---

## ⤓ Downloads

### 🍎 macOS
| Build | File |
|---|---|
| Universal (Apple Silicon + Intel) | [`Munder-Difflin-0.5.4-mac-universal.dmg`](https://github.com/chaitanyagiri/munder-difflin/releases/download/v0.5.4/Munder-Difflin-0.5.4-mac-universal.dmg) |

### 🪟 Windows
| Build | File |
|---|---|
| Installer (x64), *recommended* | [`Munder-Difflin-0.5.4-win-x64-setup.exe`](https://github.com/chaitanyagiri/munder-difflin/releases/download/v0.5.4/Munder-Difflin-0.5.4-win-x64-setup.exe) |
| Portable (x64, no install) | [`Munder-Difflin-0.5.4-win-x64-portable.exe`](https://github.com/chaitanyagiri/munder-difflin/releases/download/v0.5.4/Munder-Difflin-0.5.4-win-x64-portable.exe) |

### 🐧 Linux
| Build | File |
|---|---|
| AppImage (x86_64) | [`Munder-Difflin-0.5.4-linux-x86_64.AppImage`](https://github.com/chaitanyagiri/munder-difflin/releases/download/v0.5.4/Munder-Difflin-0.5.4-linux-x86_64.AppImage) |

> **Verify your download:** [`SHA256SUMS.txt`](https://github.com/chaitanyagiri/munder-difflin/releases/download/v0.5.4/SHA256SUMS.txt) lists the SHA-256 of
> every file above. `shasum -a 256 <file>` on macOS and Linux, `certutil -hashfile <file> SHA256` on Windows.

> On macOS this build is not signed or notarized. The first time, right click the app, choose Open,
> then Open again.
