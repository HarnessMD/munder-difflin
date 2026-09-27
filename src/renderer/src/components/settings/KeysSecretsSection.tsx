/**
 * SETTINGS > KEYS & SECRETS, the redesign's section file (0.5.3). Owner:
 * Darryl. Every key an agent can be given, in one place:
 *
 *   AI provider keys   moved here from Agents & Models. A typed key is a task
 *                      in the page's draft (providerKeys.ts); the footer Save
 *                      stores it in the write only broker. Remove is a task
 *                      too, with Undo until Save.
 *   Add custom secret  founder batch 3 #6: a name and a value, stored
 *                      encrypted on this machine; every agent reads it as the
 *                      env var of that name (shared/customSecrets.ts). The
 *                      name is checked as it is typed; an add or a remove is a
 *                      draft task, applied on Save.
 *
 * MCP servers left this page for Capabilities, and the REST tokens group gave
 * way to custom secrets (batch 3).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { secretNameProblem, secretTask, secretTaskId, type SecretStore } from '@shared/customSecrets';
import { Btn, inputStyle } from '../pro/ui';
import { CollapsibleSection, useSettingsDraft } from './SettingsFrame';
import { FieldRow, monoInput } from './primitives';
import { PROVIDER_KEY_BACKENDS, editFor, keyTask, keyTaskId, type KeyBroker } from './providerKeys';

export const KEYS_READY = true;

const broker: KeyBroker = {
  set: (backend, key) => window.cth.providerKeySet({ backend, key }),
  clear: (backend) => window.cth.providerKeyClear(backend)
};

const secretStore: SecretStore = {
  set: (name, value) => window.cth.customSecretSet({ name, value }),
  remove: (name) => window.cth.customSecretRemove(name)
};

export function KeysSecretsSection({ config }: { config: HarnessConfig }) {
  const { t } = useTranslation();
  const draft = useSettingsDraft();
  // The OpenAI key gates Talk: mirror "set or not" so its warning clears at once.
  const setHasOpenAiKey = useStore((s) => s.setHasOpenAiKey);
  // Which providers have a key stored: a boolean only, never the value.
  const [hasKey, setHasKey] = useState<Record<string, boolean>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    void (async () => {
      const out: Record<string, boolean> = {};
      for (const b of PROVIDER_KEY_BACKENDS) {
        try { out[b.id] = await window.cth.providerKeyHas(b.id); } catch { out[b.id] = false; }
      }
      if (alive) setHasKey(out);
    })();
    return () => { alive = false; };
  }, []);

  /** Save ran this provider's task and the broker agreed. */
  const settled = (backend: string) => (has: boolean) => {
    setHasKey((s) => ({ ...s, [backend]: has }));
    setTyped((s) => ({ ...s, [backend]: '' }));
    setRemoving((s) => ({ ...s, [backend]: false }));
    if (backend === 'openai') setHasOpenAiKey(has);
  };
  const type = (backend: string, text: string) => {
    setTyped((s) => ({ ...s, [backend]: text }));
    setRemoving((s) => ({ ...s, [backend]: false }));
    const edit = editFor(text);
    draft?.setTask(keyTaskId(backend), edit ? keyTask(backend, edit, broker, settled(backend)) : null);
  };
  const remove = (backend: string) => {
    setTyped((s) => ({ ...s, [backend]: '' }));
    setRemoving((s) => ({ ...s, [backend]: true }));
    draft?.setTask(keyTaskId(backend), keyTask(backend, { kind: 'clear' }, broker, settled(backend)));
  };
  const undo = (backend: string) => {
    setRemoving((s) => ({ ...s, [backend]: false }));
    draft?.setTask(keyTaskId(backend), null);
  };

  const setCount = PROVIDER_KEY_BACKENDS.filter((b) => hasKey[b.id]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-keys-secrets>
      <CollapsibleSection
        id="keys-providers"
        title={t('settings.keys.providers.title')}
        info={t('settings.keys.providers.info')}
        summary={t('settings.keys.providers.summary', { n: setCount, total: PROVIDER_KEY_BACKENDS.length })}
        defaultOpen
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROVIDER_KEY_BACKENDS.map((b) => {
            const pending = draft?.hasTask(keyTaskId(b.id)) ?? false;
            const label = hasKey[b.id] ? `${b.label} ${t('aiEngines.setCheck')}` : b.label;
            const note = removing[b.id]
              ? t('settings.keys.willRemove')
              : pending ? t('settings.keys.willSave') : null;
            return (
              <FieldRow
                key={b.id}
                label={label}
                info={t('settings.keys.envVar', { name: b.envVar })}
                note={note && <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }} data-key-note={b.id}>{note}</span>}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="password"
                    autoComplete="off"
                    aria-label={b.label}
                    data-provider-key={b.id}
                    placeholder={hasKey[b.id] ? t('aiEngines.keyStoredPlaceholder') : t('aiEngines.keyPlaceholder', { label: b.label })}
                    value={typed[b.id] ?? ''}
                    disabled={removing[b.id]}
                    onChange={(e) => type(b.id, e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  />
                  {removing[b.id]
                    ? <Btn size="sm" onClick={() => undo(b.id)}>{t('settings.keys.undo')}</Btn>
                    : hasKey[b.id] && <Btn size="sm" onClick={() => remove(b.id)}>{t('settings.keys.remove')}</Btn>}
                </div>
              </FieldRow>
            );
          })}
        </div>
      </CollapsibleSection>

      <CustomSecrets />
    </div>
  );
}

/** Add custom secret: the saved names, the ones waiting for Save, and a
 *  name + value pair to add. Values are write only: none is ever shown. */
function CustomSecrets() {
  const { t } = useTranslation();
  const draft = useSettingsDraft();
  const [saved, setSaved] = useState<string[]>([]);
  /** Adds waiting for Save, by name (a value is kept only until Save). */
  const [adding, setAdding] = useState<Record<string, true>>({});
  const [removing, setRemoving] = useState<Record<string, true>>({});
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const load = () => { void window.cth.customSecretList().then(setSaved).catch(() => undefined); };
  useEffect(load, []);

  const drop = (map: Record<string, true>, key: string): Record<string, true> => {
    const next = { ...map };
    delete next[key];
    return next;
  };
  const problem = name ? secretNameProblem(name) : null;
  const canAdd = !!name && !problem && !!value;
  const add = () => {
    if (!canAdd) return;
    const n = name;
    setAdding((a) => ({ ...a, [n]: true }));
    setRemoving((r) => drop(r, n));
    draft?.setTask(secretTaskId(n), secretTask(n, { kind: 'set', value }, secretStore, () => { setAdding((a) => drop(a, n)); load(); }));
    setName('');
    setValue('');
  };
  const remove = (n: string) => {
    setRemoving((r) => ({ ...r, [n]: true }));
    draft?.setTask(secretTaskId(n), secretTask(n, { kind: 'remove' }, secretStore, () => { setRemoving((r) => drop(r, n)); load(); }));
  };
  const undo = (n: string) => {
    setAdding((a) => drop(a, n));
    setRemoving((r) => drop(r, n));
    draft?.setTask(secretTaskId(n), null);
  };

  const rows = [...new Set([...saved, ...Object.keys(adding)])].sort();
  const problemText = problem && t(`settings.keys.custom.problem.${problem}`);
  return (
    <CollapsibleSection
      id="keys-custom"
      title={t('settings.keys.custom.title')}
      info={t('settings.keys.custom.info')}
      summary={saved.length ? t('settings.keys.custom.summary', { count: saved.length }) : undefined}
      defaultOpen
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-custom-secrets>
        {rows.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map((n) => {
              const pendingAdd = !!adding[n];
              const note = removing[n]
                ? t('settings.keys.willRemove')
                : pendingAdd ? (saved.includes(n) ? t('settings.keys.custom.willReplace') : t('settings.keys.willSave')) : null;
              return (
                <li key={n} data-secret-row={n} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: removing[n] ? 'var(--cth-ink-500)' : 'var(--cth-ink-900)', textDecoration: removing[n] ? 'line-through' : 'none' }}>{n}</code>
                  {note && <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }} data-secret-note={n}>{note}</span>}
                  <span style={{ flex: 1 }} />
                  {removing[n] || pendingAdd
                    ? <Btn size="sm" onClick={() => undo(n)}>{t('settings.keys.undo')}</Btn>
                    : <Btn size="sm" onClick={() => remove(n)}>{t('settings.keys.remove')}</Btn>}
                </li>
              );
            })}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <FieldRow
            label={t('settings.keys.custom.name')}
            note={problemText && <span role="alert" style={{ fontSize: 11, color: 'var(--cth-coral)' }} data-secret-problem={problem}>{problemText}</span>}
          >
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              aria-label={t('settings.keys.custom.name')}
              aria-invalid={!!problem}
              data-secret-name
              placeholder="MY_API_TOKEN"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...monoInput, ...(problem ? { borderColor: 'var(--cth-coral)' } : {}) }}
            />
          </FieldRow>
          <FieldRow label={t('settings.keys.custom.value')}>
            <input
              type="password"
              autoComplete="off"
              aria-label={t('settings.keys.custom.value')}
              data-secret-value
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add(); }}
              style={{ ...inputStyle, minWidth: 0 }}
            />
          </FieldRow>
          <Btn size="sm" onClick={add} disabled={!canAdd} style={{ alignSelf: 'flex-end' }}>{t('settings.keys.custom.add')}</Btn>
        </div>
      </div>
    </CollapsibleSection>
  );
}
