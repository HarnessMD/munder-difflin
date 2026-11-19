import { memo, useEffect, useRef, type AnimationEvent } from 'react';
import { useSeason } from '@/design/season';
import { useStore, type Agent } from '@/store/store';
import { onPersonSent } from './seasonEvents';
import {
  SPIDER_UP, WEB_PX, glowFor, glowWait, hitSize, moodFor, overWeb, spiderOnEnter, spiderOnLeave, spiderOnTimer, spiderWait, webLook,
  type SpiderState
} from './seasonCornerPlan';
import { Cobweb, Ghost, Spider } from './pieces';
import './seasonCorner.css';

/**
 * THE HALLOWEEN CORNER of a queue input area (0.5.5 rc2, founder 30 Sep 2026:
 * "the cob web should be on the top right section of queue input area, the
 * halloween pumpkin should be above it"). Drawn by the input area itself, as
 * one child of its root.
 *
 * Every piece reacts to something real (the rules are seasonCornerPlan.ts):
 *   the pumpkin's face   the agent's status;
 *   the candle           how full the agent's context is;
 *   the spider           comes down while the pointer is on the web, and
 *                        the web grows out of the corner with it;
 *   the ghost            leaves with each message the person sends.
 *
 * It never changes layout: the whole corner is absolutely placed over the
 * root. Only the pumpkin's drawn shape takes the pointer, so every control
 * under the web and every row of the pane above keeps its clicks; the web
 * knows the pointer is on it by watching the input area's own pointer
 * moves, never by a box of its own (the web lies over the text and, with
 * messages queued, over their Remove buttons). Only
 * transform and opacity move. `quiet` hides it while a setup panel owns the
 * top of the input area. `crowded` says the queue header is drawn under the
 * web: the spider stays up and the web steps back, so the header's words
 * ("Clear all", the queue note) are never under a spider.
 */
export function SeasonCorner({ agent, quiet = false, crowded = false }: { agent: Agent; quiet?: boolean; crowded?: boolean }) {
  const season = useSeason();
  if (season !== 'halloween' || quiet) return null;
  return (
    <Corner
      agentId={agent.id}
      status={agent.status}
      hasSession={!!agent.ptyId && !agent.exit}
      contextTokens={agent.contextTokens}
      contextLimit={agent.contextLimit}
      crowded={crowded}
    />
  );
}

interface CornerProps {
  agentId: string;
  status: string;
  hasSession: boolean;
  contextTokens: number | undefined;
  contextLimit: number | undefined;
  crowded: boolean;
}

// Plain values only, so the memo holds while the person types: the input
// area draws again on every key and the corner does not.
const Corner = memo(function Corner({ agentId, status, hasSession, contextTokens, contextLimit, crowded }: CornerProps) {
  const mood = moodFor({ status, hasSession });
  const glow = glowFor(contextTokens, contextLimit);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const pumpkinRef = useRef<HTMLDivElement | null>(null);
  const levelRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  // The spider and the web are driven from outside React: the web follows
  // the draft, the spider follows the pointer over the web. One timeout: a
  // pointer leaving only sets the time it goes up, and the timeout waits
  // the rest when it fires.
  const crowdedNow = useRef(crowded);
  const paint = useRef<() => void>(() => {});
  useEffect(() => {
    const root = rootRef.current;
    const area = root?.parentElement;
    if (!root || !area) return;
    let draft = useStore.getState().drafts[agentId] ?? '';
    let spider: SpiderState = SPIDER_UP;
    let over = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const show = (): void => {
      root.dataset.spider = spider.down && !crowdedNow.current ? 'down' : 'up';
      root.dataset.web = webLook(spider, crowdedNow.current, draft);
    };
    const arm = (): void => {
      const wait = spiderWait(spider, Date.now());
      if (wait === null || timer) return;
      timer = setTimeout(() => {
        timer = null;
        spider = spiderOnTimer(spider, Date.now());
        show();
        arm();
      }, wait);
    };
    paint.current = show;
    show();
    const off = useStore.subscribe((s) => {
      const next = s.drafts[agentId] ?? '';
      if (next === draft) return;
      draft = next;
      show();
    });
    // The pointer over the input area: a rect compare per move, and a write
    // only when the answer changes. The corner is mirrored in Arabic, so the
    // web's corner edge is the left one there.
    const onMove = (e: PointerEvent): void => {
      const r = root.getBoundingClientRect();
      const dx = document.documentElement.dir === 'rtl' ? e.clientX - r.left : r.right - e.clientX;
      const now = overWeb(dx, e.clientY - r.top, hitSize(over));
      if (now === over) return;
      over = now;
      spider = now ? spiderOnEnter() : spiderOnLeave(Date.now());
      show();
      arm();
    };
    const onLeave = (): void => {
      if (!over) return;
      over = false;
      spider = spiderOnLeave(Date.now());
      show();
      arm();
    };
    area.addEventListener('pointermove', onMove);
    area.addEventListener('pointerleave', onLeave);
    return () => {
      off();
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerleave', onLeave);
      if (timer) clearTimeout(timer);
    };
  }, [agentId]);
  useEffect(() => {
    crowdedNow.current = crowded;
    paint.current();
  }, [crowded]);

  // The candle: opacity only, written when the value changed and at most
  // once a second.
  const glowShownAt = useRef<number | null>(null);
  useEffect(() => {
    const show = (): void => {
      glowShownAt.current = Date.now();
      if (levelRef.current) levelRef.current.style.opacity = String(glow);
    };
    const wait = glowWait(glowShownAt.current, Date.now());
    if (wait === 0) { show(); return; }
    const t = setTimeout(show, wait);
    return () => clearTimeout(t);
  }, [glow]);

  // A compact that just ended relights the candle with one flare.
  const lastStatus = useRef(status);
  useEffect(() => {
    const was = lastStatus.current;
    lastStatus.current = status;
    if (was === 'compacting' && status !== 'compacting') play(pumpkinRef.current, 'cth-sc-flare');
  }, [status]);

  // Ghost mail: one ghost per message the person sends to this agent.
  useEffect(() => onPersonSent((id) => {
    if (id !== agentId) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    play(ghostRef.current, 'cth-sc-go');
  }), [agentId]);

  const setHover = (on: boolean): void => {
    const root = rootRef.current;
    if (!root) return;
    if (on) root.dataset.hover = 'on';
    else delete root.dataset.hover;
  };
  const ended = (e: AnimationEvent<HTMLDivElement>): void => {
    if (e.animationName === 'cth-sc-hop') e.currentTarget.classList.remove('cth-sc-hop');
    if (e.animationName === 'cth-sc-flare') e.currentTarget.classList.remove('cth-sc-flare');
    if (e.animationName === 'cth-sc-mail') e.currentTarget.classList.remove('cth-sc-go');
  };

  return (
    <div ref={rootRef} className="cth-sc" aria-hidden="true" data-mood={mood}>
      <div className="cth-sc-web"><Cobweb size={WEB_PX} /></div>
      {/* The spider's own box (R7-2b): the grown web's size and never scaled,
          so the spider keeps its size while the web grows under it. */}
      <div className="cth-sc-drop">
        <div className="cth-sc-spider">
          <div className="cth-sc-thread" />
          <div className="cth-sc-spiderbody"><Spider /></div>
        </div>
      </div>
      <div ref={pumpkinRef} className="cth-sc-pumpkin" onAnimationEnd={ended}>
        <div className="cth-sc-lean">
          <div ref={levelRef} className="cth-sc-level"><div className="cth-sc-glow" /></div>
          <svg className="cth-sc-layer" viewBox="0 0 48 42" width="25" height="22">
            <path d="M22 8 C22 4, 24 2, 27 1" stroke="#5E7E2E" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M27 6 C31 2, 37 3, 38 6 C34 8, 30 8, 27 6 Z" fill="#7FA640" />
            {/* The drawn shape is the only thing in the corner that takes the
                pointer: three painted ellipses, not the box around them. */}
            <g
              className="cth-sc-hit"
              onClick={() => play(pumpkinRef.current, 'cth-sc-hop')}
              onPointerEnter={() => setHover(true)}
              onPointerLeave={() => setHover(false)}
            >
              <ellipse cx="14" cy="25" rx="11" ry="14" fill="#E57F22" />
              <ellipse cx="34" cy="25" rx="11" ry="14" fill="#E57F22" />
              <ellipse cx="24" cy="25" rx="11" ry="15" fill="#F5973A" />
            </g>
            <path d="M13 13 C9 18, 9 32, 13 37 M35 13 C39 18, 39 32, 35 37" stroke="#C9661A" strokeWidth="1.2" fill="none" opacity="0.7" />
          </svg>
          <Face mood="awake" />
          <Face mood="dozing" />
          <Face mood="surprised" />
          <Face mood="out" />
          <svg className="cth-sc-layer cth-sc-wink" viewBox="0 0 48 42" width="25" height="22">
            <ellipse cx="30.5" cy="20" rx="5" ry="4.4" fill="#F5973A" />
            <path d="M27 20 Q30.5 23 34 20" stroke={CARVED} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      </div>
      <div ref={ghostRef} className="cth-sc-ghost" onAnimationEnd={ended}><Ghost face="mail" size={19} /></div>
    </div>
  );
});

/** Start a one shot animation again, even while it is still playing. */
function play(el: HTMLElement | null, cls: string): void {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

const LIT = '#FFE08A';
const CARVED = '#8A4410';
const UNLIT = '#5A2C0A';
const EYES = 'M15 21 L19.5 17 L21 22.5 Z M33 21 L28.5 17 L27 22.5 Z';
const SMILE = 'M14 28 C18 33, 30 33, 34 28 C31 29, 29 31.5, 27 29.5 L25.5 31 L24 29.5 L22.5 31 L21 29.5 C19 31.5, 17 29, 14 28 Z';

/** One face per mood, stacked. Only the one that matches data-mood on the
 *  corner is shown, and only opacity changes between them. */
function Face({ mood }: { mood: 'awake' | 'dozing' | 'surprised' | 'out' }) {
  return (
    <svg className={`cth-sc-layer cth-sc-face cth-sc-face-${mood}`} viewBox="0 0 48 42" width="25" height="22">
      {mood === 'awake' && <path d={`${EYES} ${SMILE}`} fill={LIT} />}
      {mood === 'out' && <path d={`${EYES} ${SMILE}`} fill={UNLIT} />}
      {mood === 'dozing' && (
        <path d="M14.5 20.5 Q17.5 23.5 20.5 20.5 M27.5 20.5 Q30.5 23.5 33.5 20.5 M20.5 30 Q24 32.5 27.5 30" stroke={CARVED} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      )}
      {mood === 'surprised' && (
        <g fill={LIT}>
          <circle cx="17.5" cy="20" r="3.2" />
          <circle cx="30.5" cy="20" r="3.2" />
          <ellipse cx="24" cy="30.5" rx="3" ry="3.6" />
        </g>
      )}
    </svg>
  );
}
