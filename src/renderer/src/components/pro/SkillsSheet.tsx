/**
 * Skills in the kit (v0.4.9 phase 5a): what the Capabilities screen used to
 * show through the Classic SkillsTab, rebuilt on ui.tsx over the same IPC.
 *
 *   installed   window.cth.skillsLocal(cwd)      engine, scope, path
 *   browse      window.cth.skillsCatalog(force)   the curated list, cached
 *   install     window.cth.skillsInstall(url, n)  into this machine's Claude skills folder
 *   remove      window.cth.skillsUninstall(path)  after a confirm; bundled skills cannot go
 *   reveal      window.cth.skillsReveal(path)
 *
 * Skills are facts for every agent on the engine (a folder the CLI reads),
 * so install and remove are machine wide by construction; the sheet says
 * so rather than drawing a per agent switch that would do nothing.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { skillInstallError } from '../skillInstallError';
import type { CatalogSkill, LocalSkill } from '../../../../preload';
import { Btn, Chip, CloseX, ConfirmDialog, SearchBox, Seg, SelectBox, Sheet, proToast } from './ui';
import { useTechnical } from './depth';
import { matches } from './capData';

type Mode = 'installed' | 'browse';
const PROVIDER_LABEL: Record<LocalSkill['provider'], string> = { claude: 'Claude Code', opencode: 'OpenCode', codex: 'Codex' };

export function SkillsSheet({ agentCwd, onClose, onChanged }: { agentCwd?: string; onClose: () => void; onChanged?: () => void }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const [mode, setMode] = useState<Mode>('installed');
  const [q, setQ] = useState('');
  const [local, setLocal] = useState<LocalSkill[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogSkill[] | null>(null);
  const [meta, setMeta] = useState<{ stale: boolean; error?: string } | null>(null);
  const [owner, setOwner] = useState('all');
  const [category, setCategory] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [removeAsk, setRemoveAsk] = useState<LocalSkill | null>(null);

  const loadLocal = useCallback(async () => {
    try { setLocal(await window.cth.skillsLocal(agentCwd)); } catch { setLocal([]); }
  }, [agentCwd]);
  const loadCatalog = useCallback(async (force = false) => {
    setBusy('catalog');
    try {
      const res = await window.cth.skillsCatalog(force);
      setCatalog(res.skills);
      setMeta({ stale: res.stale, error: res.error });
    } catch (e) {
      setCatalog([]);
      setMeta({ stale: true, error: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(null); }
  }, []);

  useEffect(() => { void loadLocal(); }, [loadLocal]);
  // The catalog is a network read: fetched when Browse is opened, not before.
  useEffect(() => { if (mode === 'browse' && catalog === null) void loadCatalog(); }, [mode, catalog, loadCatalog]);

  const shownLocal = useMemo(() => (local ?? []).filter((s) => matches(q, s.name, s.description)), [local, q]);
  const owners = useMemo(() => count(catalog ?? [], (s) => s.owner), [catalog]);
  const categories = useMemo(() => count(catalog ?? [], (s) => s.category), [catalog]);
  const matching = useMemo(() => (catalog ?? [])
    .filter((s) => owner === 'all' || s.owner === owner)
    .filter((s) => category === 'all' || s.category === category)
    .filter((s) => matches(q, s.name, s.description)), [catalog, owner, category, q]);
  const shownCatalog = matching.slice(0, 300);
  const installedNames = useMemo(() => new Set((local ?? []).map((s) => s.name.toLowerCase())), [local]);

  const install = async (c: CatalogSkill) => {
    setBusy(c.url);
    try {
      const res = await window.cth.skillsInstall(c.url, c.name);
      if (res.ok) { proToast(t('pro.skills.installedToast', { name: c.name }), { tone: 'ok' }); await loadLocal(); onChanged?.(); }
      else proToast(skillInstallError(t, res, t('pro.skills.installFailed')), { tone: 'bad', ms: 7000 });
    } catch (e) {
      proToast(e instanceof Error ? e.message : t('pro.skills.installFailed'), { tone: 'bad' });
    } finally { setBusy(null); }
  };
  const remove = async (s: LocalSkill) => {
    setRemoveAsk(null);
    setBusy(s.path);
    try {
      const res = await window.cth.skillsUninstall(s.path);
      if (res.ok) { proToast(t('pro.skills.removedToast', { name: s.name })); await loadLocal(); onChanged?.(); }
      else proToast(res.error || t('pro.skills.removeFailed'), { tone: 'bad', ms: 7000 });
    } catch (e) {
      proToast(e instanceof Error ? e.message : t('pro.skills.removeFailed'), { tone: 'bad' });
    } finally { setBusy(null); }
  };

  return (
    <Sheet onClose={onClose} width={860}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 12px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)', whiteSpace: 'nowrap' }}>{t('pro.caps.skills')}</h2>
        <Seg value={mode} ariaLabel={t('pro.skills.modeLabel')} onChange={setMode} options={[
          { value: 'installed', label: local ? `${t('pro.skills.installed')} ${local.length}` : t('pro.skills.installed') },
          { value: 'browse', label: catalog ? `${t('pro.skills.browse')} ${catalog.length}` : t('pro.skills.browse') }
        ]} />
        <SearchBox value={q} onChange={setQ} placeholder={t('pro.skills.search')} style={{ flex: 1 }} />
        {mode === 'browse' && catalog && (
          <>
            <SelectBox ariaLabel={t('pro.skills.category')} value={category} onChange={setCategory} style={{ width: 170 }}
              options={[{ value: 'all', label: t('pro.skills.allCategories') }, ...categories.map(([c, n]) => ({ value: c, label: `${c} (${n})` }))]} />
            <SelectBox ariaLabel={t('pro.skills.publisher')} value={owner} onChange={setOwner} style={{ width: 150 }}
              options={[{ value: 'all', label: t('pro.skills.allPublishers') }, ...owners.map(([o, n]) => ({ value: o, label: `${o} (${n})` }))]} />
          </>
        )}
        <Btn size="sm" disabled={busy === 'catalog'} onClick={() => { void (mode === 'installed' ? loadLocal() : loadCatalog(true)); }}>{t('pro.skills.refresh')}</Btn>
        <CloseX onClick={onClose} title={t('common.close')} />
      </div>

      <div style={{ overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {mode === 'installed' ? (
          local === null ? <Muted>{t('pro.skills.scanning')}</Muted>
          : shownLocal.length === 0 ? <Muted>{local.length === 0 ? t('pro.skills.none') : t('pro.skills.noMatch')}</Muted>
          : shownLocal.map((s) => (
            <SkillRow key={s.path} name={s.name} desc={s.description} path={technical ? s.path : undefined}
              chips={<><Chip tone="muted">{PROVIDER_LABEL[s.provider] ?? s.provider}</Chip><Chip tone="outline">{t(`pro.caps.scope.${s.scope}`)}</Chip></>}
              actions={<>
                <Btn size="sm" kind="ghost" onClick={() => { void window.cth.skillsReveal(s.path); }}>{t('pro.skills.openFolder')}</Btn>
                {s.scope === 'bundled'
                  ? <Muted>{t('pro.skills.shipsWithApp')}</Muted>
                  : <Btn size="sm" kind="ghost" disabled={busy === s.path} onClick={() => setRemoveAsk(s)}>{t('pro.skills.remove')}</Btn>}
              </>} />
          ))
        ) : catalog === null ? <Muted>{t('pro.skills.loadingCatalog')}</Muted> : (
          <>
            {meta?.error && <Muted>{t('pro.skills.cachedCopy', { error: meta.error })}</Muted>}
            <Muted>
              {matching.length > shownCatalog.length ? t('pro.skills.countShown', { count: matching.length, shown: shownCatalog.length }) : t('pro.skills.count', { count: matching.length })}
              {' '}{t('pro.skills.installNote')}
            </Muted>
            {shownCatalog.map((c) => {
              const have = installedNames.has(c.name.toLowerCase());
              return (
                <SkillRow key={c.url + c.name} name={c.name} desc={c.description}
                  chips={<><Chip tone="outline">{c.category}</Chip><Chip tone="muted">{c.owner}</Chip>{have && <Chip tone="ok">{t('pro.skills.installed')}</Chip>}</>}
                  actions={<>
                    <Btn size="sm" kind={have ? 'default' : 'primary'} disabled={have || busy === c.url} onClick={() => { void install(c); }}>{busy === c.url ? t('pro.skills.installing') : t('pro.skills.install')}</Btn>
                    <Btn size="sm" kind="ghost" onClick={() => { void window.cth.openExternal(c.url); }}>{t('pro.skills.learnMore')}</Btn>
                  </>} />
              );
            })}
          </>
        )}
      </div>

      {removeAsk && (
        <ConfirmDialog danger title={t('pro.skills.removeTitle', { name: removeAsk.name })} body={t('pro.skills.removeBody')} confirmLabel={t('pro.skills.remove')}
          onConfirm={() => { void remove(removeAsk); }} onClose={() => setRemoveAsk(null)} />
      )}
    </Sheet>
  );
}

function count<T>(list: T[], key: (x: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const x of list) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function SkillRow({ name, desc, path, chips, actions }: { name: string; desc: string; path?: string; chips: React.ReactNode; actions: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <b style={{ fontWeight: 600, fontSize: 13, color: 'var(--cth-ink-900)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</b>
        {chips}
      </div>
      {desc && <small style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: 1.45, overflowWrap: 'anywhere' }}>{desc.length > 260 ? `${desc.slice(0, 260)}…` : desc}</small>}
      {path && <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>{path}</code>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{actions}</div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{children}</span>;
}
