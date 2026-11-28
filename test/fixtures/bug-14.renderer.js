'use strict';
/**
 * In-page payload for test/restart-terminal-preserve.test.cjs. Runs INSIDE the
 * real Electron renderer (nodeIntegration:true, contextIsolation:false) via
 * webContents.executeJavaScript.
 *
 * It mounts the REAL CommandCenterPanel (src/renderer/src/components/
 * CommandCenterPanel.tsx — the component that owns restartWithModel) against a
 * scripted fake `window.cth` bridge, opens the floor tab, then clicks
 * "restart & continue" on three agents:
 *
 *   A  spawnPty answers {ok:false,...}              → the `!res.ok` throw
 *   B  spawnPty answers {ok:true} with no `resumed` → the "resume was refused"
 *        throw (this is exactly what the main-process installer early-return
 *        answers when --resume is declined, src/main/index.ts:2909-2915)
 *   C  spawnPty answers {ok:true, resumed:true}     → success CONTROL: proves
 *        the flow still recreates the terminal once the replacement is
 *        known-good — the destroy may only ever run AFTER the spawn answer
 *
 * For every scenario it records the IPC call ORDER, the terminalPool entry
 * identity before/after, the xterm buffer contents before/after, the store's
 * agent action/status/terminalGeneration, and whether the label self-corrects —
 * then ships the snapshot to the fixture main over ipcRenderer.
 *
 * Every line of restartWithModel, FloorTab, terminalPool's dispose/acquire and
 * the zustand store is the REAL shipped code, loaded through a TS/TSX transpile
 * loader (test/load-ts.cjs extended with JSX, '@/…'/'@shared/…' aliases and
 * .json/.css imports). The only fakes live at module boundaries:
 *   - window.cth bridge: scripted IPC answers (no real PTY, no network)
 *   - pixi.js / react-markdown / remark-gfm: ESM-only under this Electron node,
 *     required only by tabs never mounted here → stub objects
 */
(async () => {
  const REPO = globalThis.__BUG14_REPO__;
  const fs = require('fs');
  const path = require('path');
  const NM = path.join(REPO, 'node_modules');

  // ─── 0. window.cth bridge FIRST (the store reads it at module load) ─────────
  const CWD = 'D:\\bug14\\proj';
  const calls = [];
  const record = (fn, extra) => { const c = Object.assign({ fn }, extra); calls.push(c); return c; };

  const SESSION_IDS = {
    'bug14-a': 'sess-aaa',
    'bug14-b': 'sess-bbb',
    'bug14-c': 'sess-ccc'
  };
  const AGENT_IDS = Object.keys(SESSION_IDS);

  // Scripted spawn answers — the ONLY failure injection in the whole repro.
  const spawnBehavior = {
    // mirrors the real failure contract of src/main/pty.ts spawn()
    'pty-bug14-a': () => ({ ok: false, error: 'cwd does not exist: ' + CWD }),
    // mirrors the requireResume early-return (src/main/index.ts:2909-2915):
    // ok:true with `resumed` unset — a refused resume
    'pty-bug14-b': () => ({ ok: true }),
    // healthy resume (control)
    'pty-bug14-c': () => ({ ok: true, resumed: true })
  };

  const fakeCth = {
    getConfig: async () => ({
      onboardingComplete: true,
      harnessHome: 'D:\\bug14\\hive',
      registeredRepos: [],
      autoMode: false,
      defaultCommand: 'claude',
      defaultModel: 'claude-fable-5-1'
    }),
    updateConfig: async () => ({ ok: true }),
    killPty: async (id) => { record('killPty', { ptyId: id }); return { ok: true }; },
    spawnPty: async (opts) => {
      record('spawnPty', {
        ptyId: opts.id, resume: true, requireResume: !!opts.requireResume,
        resumeSessionId: opts.resumeSessionId, command: opts.command, args: opts.args
      });
      const behave = spawnBehavior[opts.id];
      return behave ? behave() : { ok: true, resumed: true };
    },
    onPtyData: () => () => {},
    onPtyExit: () => () => {},
    onPtyRelaunch: () => () => {},
    writePty: () => {},
    resizePty: (id) => { record('resizePty', { ptyId: id }); },
    redrawPty: (id) => { record('redrawPty', { ptyId: id }); },
    listPtys: async () => [],
    controlSnapshot: async () => ({ autoDeliveryPaused: false }),
    controlAutoDelivery: async () => ({}),
    telemetrySnapshot: async () => ({ usage: [], spans: {} }),
    onTelemetryEvent: () => () => {},
    onBreakerState: () => () => {},
    telemetrySpans: async () => [],
    hiveRegistry: async () => ({
      godId: null,
      agents: Object.fromEntries(AGENT_IDS.map((id) => [id, {
        id, name: id, cwd: CWD, status: 'idle', lastSeen: 1, sessionId: SESSION_IDS[id]
      }]))
    }),
    resolveSessionCwd: async () => CWD,
    hiveSend: async () => ({ ok: true }),
    hiveTasks: async () => [],
    hivePatchTask: async () => ({ ok: true }),
    hiveDeleteTask: async () => ({ ok: true }),
    hiveLog: async () => [],
    hiveBoard: async () => '',
    hiveMemory: async () => '',
    searchMemory: async () => ({ ok: true, results: [], engine: 'none' }),
    textSearch: async () => ({ ok: true, results: [] }),
    listWorkers: async () => ({ workers: [] }),
    stopWorker: async () => ({ ok: true }),
    listMissions: async () => [],
    onMissionsUpdated: () => () => {},
    saveMissions: async () => ({}),
    getContextTrigger: async () => null,
    setContextTrigger: async () => ({}),
    listWebhooks: async () => [],
    saveWebhooks: async () => ({}),
    deleteWebhook: async () => ({}),
    webhooksStatus: async () => ({ enabled: false }),
    getOrgTrigger: async () => null,
    setOrgTrigger: async () => ({}),
    getContextRules: async () => [],
    githubIssues: async () => ({ ok: false, error: 'not configured' }),
    setAgentTokenCap: async () => ({ ok: true }),
    historyAdd: async () => ({}),
    trackMessageSent: async () => ({}),
    attachFiles: async () => ({ ok: false, files: [] }),
    attachFilesPicker: async () => ({ ok: false, files: [] }),
    pathForFile: () => '',
    saveClipboardImage: async () => ({ ok: false }),
    copyToClipboard: async () => ({}),
    readClipboard: async () => '',
    readClipboardSync: () => '',
    statAbs: async () => ({ exists: false }),
    statAbsSync: () => null,
    revealPath: async () => {},
    openTerminalAt: () => {},
    openExternal: async () => {},
    skillsLocal: async () => [],
    skillsCatalog: async () => ({ ok: true, catalog: [] }),
    skillsInstall: async () => ({ ok: false }),
    skillsUninstall: async () => ({ ok: true }),
    skillsReveal: async () => {},
    readBinary: async () => ({ ok: false }),
    freeflowTranscribe: async () => ({ ok: false }),
    rosterReadSync: () => null,
    harnessHomeSync: () => 'D:\\bug14\\hive',
    harnessHomeSyncRead: () => 'D:\\bug14\\hive',
    rosterWrite: () => {}
  };
  window.cth = fakeCth;

  // ─── 1. TS/TSX transpile loader (test/load-ts.cjs + JSX + aliases) ──────────
  const ts = require(path.join(NM, 'typescript'));
  const cache = new Map();

  function resolveFrom(fromDir, request) {
    let req = request;
    let suffix = null;
    const m = /^(.+)\?(url|raw)$/.exec(req);
    if (m) { req = m[1]; suffix = m[2]; }

    let base;
    if (req.startsWith('@/')) base = path.join(REPO, 'src', 'renderer', 'src', req.slice(2));
    else if (req.startsWith('@shared/')) base = path.join(REPO, 'src', 'shared', req.slice('@shared/'.length));
    else if (req.startsWith('.')) base = path.resolve(fromDir, req);
    else return null;

    for (const cand of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'), `${base}.json`]) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return { file: cand, suffix };
    }
    return null;
  }

  function loadFile(filename) {
    const cached = cache.get(filename);
    if (cached) return cached.exports;
    if (filename.endsWith('.json')) {
      const mod = { exports: JSON.parse(fs.readFileSync(filename, 'utf8')) };
      cache.set(filename, mod);
      return mod.exports;
    }
    const source = fs.readFileSync(filename, 'utf8');
    const out = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        strict: true,
        esModuleInterop: true
      },
      fileName: filename,
      reportDiagnostics: true
    });
    if (out.diagnostics && out.diagnostics.length) {
      throw new Error(ts.formatDiagnosticsWithColorAndContext(out.diagnostics, {
        getCurrentDirectory: () => REPO,
        getCanonicalFileName: (n) => n,
        getNewLine: () => '\n'
      }));
    }
    const mod = { exports: {} };
    cache.set(filename, mod);
    const localRequire = (request) => {
      if (request.endsWith('.css')) return {};
      if (request.startsWith('.') || request.startsWith('@/') || request.startsWith('@shared/')) {
        const hit = resolveFrom(path.dirname(filename), request);
        if (hit) {
          if (hit.suffix === 'raw') return fs.readFileSync(hit.file, 'utf8');
          if (hit.suffix === 'url') return hit.file;
          return loadFile(hit.file);
        }
        throw new Error(`bug14 loader: cannot resolve '${request}' from ${filename}`);
      }
      return requireBare(request);
    };
    const run = new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText);
    run(mod, mod.exports, localRequire, filename, path.dirname(filename));
    return mod.exports;
  }

  // Bare specifiers must resolve from the REPO's node_modules regardless of
  // where the fixture page itself lives (it is a tmp file).
  const { createRequire } = require('module');
  const repoRequire = createRequire(path.join(REPO, 'package.json'));

  function requireBare(request) {
    if (request === 'pixi.js') return pixiStub;
    if (request === 'react-markdown') return reactMarkdownStub;
    if (request === 'remark-gfm') return { default: function remarkGfmStub() { return {}; } };
    return repoRequire(request); // xterm, codemirror, react, zustand… all resolve from the repo
  }

  // ESM-only under this Electron node — stubbed at the require boundary. They
  // are only module-loaded for tabs never mounted in this scenario, so the
  // stubs cannot change the behavior under test.
  const pixiStub = new Proxy({}, {
    get(_t, key) {
      if (key === '__esModule') return false;
      return function PixiStub() {};
    }
  });
  const reactMarkdownStub = function ReactMarkdownStub() { return null; };

  // addon-fit (and any module like it) needs `self` before first require.
  if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;

  function loadTs(rel) { return loadFile(path.join(REPO, rel)); }

  // ─── 2. load the REAL store + terminal pool, seed the roster ────────────────
  const storeExports = loadTs('src/renderer/src/store/store.ts');
  const useStore = storeExports.useStore;
  const poolModule = loadTs('src/renderer/src/components/terminalPool.ts');
  const realAcquire = poolModule.acquireTerminal;
  const realDispose = poolModule.disposeTerminal;

  // Recording-only pass-throughs for the pool pair: restartWithModel's destroy
  // ordering relative to the spawn answer is the fact under test, and the raw
  // IPC bridge cannot see it. These NEVER defer or skip — they log and delegate;
  // the order they reveal is the component's own call order, i.e. the behavior
  // under test, unchanged.
  poolModule.disposeTerminal = function bug14RecordDispose(ptyId) {
    record('disposeTerminal', { ptyId });
    return realDispose(ptyId);
  };
  poolModule.acquireTerminal = function bug14RecordAcquire(ptyId, theme, fontSize) {
    record('acquireTerminal', { ptyId });
    return realAcquire(ptyId, theme, fontSize);
  };

  const AGENTS = [
    {
      id: 'bug14-a', name: 'Ada', character: 'pam', accent: 'mint',
      description: 'watches the ledger', project: 'bug14', tmuxTarget: 't-a',
      cwd: CWD, status: 'working', action: 'reviewing the roadmap…', progress: 0,
      ptyId: 'pty-bug14-a', command: 'claude', provider: 'claude', model: 'claude-fable-5-1',
      isGod: false
    },
    {
      id: 'bug14-b', name: 'Ben', character: 'jim', accent: 'sky',
      description: 'watches the queue', project: 'bug14', tmuxTarget: 't-b',
      cwd: CWD, status: 'working', action: 'reviewing the shipped build…', progress: 0,
      ptyId: 'pty-bug14-b', command: 'claude', provider: 'claude', model: 'claude-fable-5-1',
      isGod: false
    },
    {
      id: 'bug14-c', name: 'Cy', character: 'kevin', accent: 'lemon',
      description: 'watches the tests', project: 'bug14', tmuxTarget: 't-c',
      cwd: CWD, status: 'working', action: 'reviewing the backlog…', progress: 0,
      ptyId: 'pty-bug14-c', command: 'claude', provider: 'claude', model: 'claude-fable-5-1',
      isGod: false
    }
  ];
  useStore.setState({ agents: AGENTS, selectedId: 'bug14-a' });

  // ─── 3. seed scrollback into the pooled terminals (as a live session would) ─
  // Direct term.write() — deliberately NOT through window.cth.onPtyData, so
  // entry.onData stays unset and usePtyParser's 4s idle rewrite never fires.
  const MARK = {
    'pty-bug14-a': ['IMPORTANT SCROLLBACK A1', 'IMPORTANT SCROLLBACK A2'],
    'pty-bug14-b': ['IMPORTANT SCROLLBACK B1', 'IMPORTANT SCROLLBACK B2'],
    'pty-bug14-c': ['IMPORTANT SCROLLBACK C1', 'IMPORTANT SCROLLBACK C2']
  };
  const writeTerm = (term, text) => new Promise((resolve) => {
    term.write(text, () => setTimeout(resolve, 30));
  });
  const readBuf = (term) => {
    const buf = term.buffer.active;
    const out = [];
    const n = Math.min(buf.length, 6);
    for (let i = 0; i < n; i++) {
      try { out.push(buf.getLine(i).translateToString(true)); } catch { out.push('<unreadable>'); }
    }
    return out;
  };

  const entriesBefore = {};
  const buffersBefore = {};
  for (const agent of AGENTS) {
    const entry = poolModule.acquireTerminal(agent.ptyId);
    entriesBefore[agent.ptyId] = entry;
    for (const line of MARK[agent.ptyId]) {
      await writeTerm(entry.term, line + '\r\n');
    }
    buffersBefore[agent.ptyId] = readBuf(entry.term);
  }

  // ─── 5. render the REAL CommandCenterPanel ──────────────────────────────────
  const React = repoRequire('react');
  const { createRoot } = repoRequire('react-dom/client');
  const panelExports = loadTs('src/renderer/src/components/CommandCenterPanel.tsx');
  const CommandCenterPanel = panelExports.CommandCenterPanel;

  const result = {
    calls: [],
    scenarios: {},
    agentsFinal: null,
    bodyText: '',
    error: null
  };

  function shipResult(overrides) {
    const payload = Object.assign({}, result, overrides || {});
    // Rich call strings: fn:ptyId(+requireResume)(=resumeSessionId)
    payload.calls = calls.map((c) => c.fn + (c.ptyId ? ':' + c.ptyId : '')
      + (c.requireResume ? '+requireResume' : '')
      + (c.resumeSessionId ? '=' + c.resumeSessionId : ''));
    payload.scenarios = result.scenarios;
    payload.agentsFinal = useStore.getState().agents.map((a) => ({
      id: a.id, action: a.action, status: a.status, terminalGeneration: a.terminalGeneration ?? 0
    }));
    payload.bodyText = (document.body.innerText || '').slice(0, 5000);
    require('electron').ipcRenderer.send('bug14:result', JSON.stringify(payload));
  }

  const mount = document.getElementById('root');
  const root = createRoot(mount);
  root.render(React.createElement(CommandCenterPanel, { agent: AGENTS[0], fullscreen: true }));
  await new Promise((r) => setTimeout(r, 700));

  // Open the floor tab (label 'monitor', en.json commandCenter.tabs.floor).
  const monitorTab = [...document.querySelectorAll('.cth-tabbar button')]
    .find((b) => (b.textContent || '').trim() === 'monitor');
  if (!monitorTab) {
    shipResult({ error: 'monitor tab button not found; body=' + (document.body.innerText || '').slice(0, 800) });
    return;
  }
  monitorTab.click();
  await new Promise((r) => setTimeout(r, 600));

  const findRestartButtons = () => [...document.querySelectorAll('button')]
    .filter((b) => /restart\s*&\s*continue/i.test(b.textContent || ''));

  async function runScenario(key, agent) {
    const buttons = findRestartButtons();
    const idx = AGENTS.indexOf(agent);
    const btn = buttons[idx];
    if (!btn) {
      result.scenarios[key] = { error: 'restart&continue button #' + idx + ' not found; count=' + buttons.length };
      return;
    }
    const startSeq = calls.length;
    btn.click();
    await new Promise((r) => requestAnimationFrame(() => r()));
    await new Promise((r) => setTimeout(r, 800));

    const entryAfter = poolModule.acquireTerminal(agent.ptyId);
    const a = useStore.getState().agents.find((x) => x.id === agent.id);
    result.scenarios[key] = {
      ptyId: agent.ptyId,
      callOrder: calls.slice(startSeq).map((c) => c.fn + (c.ptyId ? ':' + c.ptyId : '')).join(' -> '),
      entrySwapped: entryAfter !== entriesBefore[agent.ptyId],
      termSwapped: entryAfter.term !== entriesBefore[agent.ptyId].term,
      bufferBefore: buffersBefore[agent.ptyId],
      bufferAfter: readBuf(entryAfter.term),
      action: a.action,
      status: a.status,
      terminalGeneration: a.terminalGeneration ?? 0
    };
    // Prove the label does not self-correct: wait past any pending re-render.
    await new Promise((r) => setTimeout(r, 450));
    const a2 = useStore.getState().agents.find((x) => x.id === agent.id);
    result.scenarios[key].actionAfterExtraSettle = a2.action;
  }

  await runScenario('A_spawnFailed', AGENTS[0]);
  await runScenario('B_resumeRefused', AGENTS[1]);
  await runScenario('C_restartOk', AGENTS[2]);

  shipResult();
})().catch((e) => {
  try {
    require('electron').ipcRenderer.send('bug14:result', JSON.stringify({
      error: 'renderer payload threw: ' + (e && e.stack || String(e))
    }));
  } catch { /* nothing else to do */ }
});
