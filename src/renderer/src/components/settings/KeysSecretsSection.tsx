/**
 * KEYS AND SECRETS, ONE AT A TIME. Each key is its own item in the
 * Integrations list, and these are the editors its pane draws:
 *
 *   ProviderKeySetup   one AI provider key. A typed key is a task in the
 *                      screen's draft (providerKeys.ts); Save stores it in the
 *                      write only broker. Remove is a task too, with Undo
 *                      until Save.
 *   CustomSecretSetup  one custom secret: a name every
 *                      agent reads as the env var of that name
 *                      (shared/customSecrets.ts). A new value or Remove is a
 *                      task, applied on Save.
 *   AddSecretSetup     a name and a value for a new one, checked as it is
 *                      typed, stored on Save.
 *
 * A key is write only: nothing here ever shows one back, and no value is kept
 * past Save. Service connections are ServiceConnections.tsx.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { connectionFor, secretNameProblem, secretTask, secretTaskId, type SecretStore } from '@shared/customSecrets';
import { PixelButton } from '../PixelButton';
import { useSettingsDraft } from './SettingsFrame';
import { classicInput as inputStyle } from './classicBits';
import { FieldRow, monoInput } from './primitives';
import { PROVIDER_KEY_BACKENDS, editFor, keyTask, keyTaskId, type KeyBroker } from './providerKeys';

const broker: KeyBroker = {
  set: (backend, key) => window.cth.providerKeySet({ backend, key }),
  clear: (backend) => window.cth.providerKeyClear(backend)
};

const secretStore: SecretStore = {
  set: (name, value) => window.cth.customSecretSet({ name, value }),
  remove: (name) => window.cth.customSecretRemove(name)
};

const NOTE = { fontSize: 12, color: 'var(--cth-ink-500)' } as const;
const LEAD = { margin: 0, fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-700)', maxWidth: 600 } as const;


/** A running agent reads a key through the broker (resources/md-secret.cjs),
 *  so Save is enough, no restart. */
function LiveLine() {
  const { t } = useTranslation();
  return <p data-keys-live style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{t('settings.keys.live')}</p>;
}


/* ---- the editors -------------------------------------------------------------- */

/** One AI provider key. `onSettled` hears "set or not" after Save, never a key. */
export function ProviderKeySetup({ backend, hasKey, onSettled }: { backend: string; hasKey: boolean; onSettled: (has: boolean) => void }) {
  const { t } = useTranslation();
  const draft = useSettingsDraft();
  // The OpenAI key gates Talk: mirror "set or not" so its warning clears at once.
  const setHasOpenAiKey = useStore((s) => s.setHasOpenAiKey);
  const [typed, setTyped] = useState('');
  const [removing, setRemoving] = useState(false);
  const b = PROVIDER_KEY_BACKENDS.find((x) => x.id === backend);

  /** Save ran this provider's task and the broker agreed. */
  const settled = (has: boolean) => {
    setTyped('');
    setRemoving(false);
    if (backend === 'openai') setHasOpenAiKey(has);
    onSettled(has);
  };
  const type = (text: string) => {
    setTyped(text);
    setRemoving(false);
    const edit = editFor(text);
    draft?.setTask(keyTaskId(backend), edit ? keyTask(backend, edit, broker, settled) : null);
  };
  const remove = () => {
    setTyped('');
    setRemoving(true);
    draft?.setTask(keyTaskId(backend), keyTask(backend, { kind: 'clear' }, broker, settled));
  };
  const undo = () => {
    setRemoving(false);
    draft?.setTask(keyTaskId(backend), null);
  };
  if (!b) return null;
  const pending = draft?.hasTask(keyTaskId(backend)) ?? false;
  const note = removing ? t('settings.keys.willRemove') : pending ? t('settings.keys.willSave') : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-keys-secrets data-provider-setup={backend}>
      <LiveLine />
      <p style={LEAD}>{t('settings.keys.providers.info')}</p>
      <FieldRow
        label={hasKey ? t('integrations.screen.key.replace') : t('integrations.screen.key.value')}
        note={note && <span style={NOTE} data-key-note={backend}>{note}</span>}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', maxWidth: 520 }}>
          <input
            type="password"
            autoComplete="off"
            aria-label={b.label}
            data-provider-key={backend}
            placeholder={hasKey ? t('integrations.screen.key.stored') : t('aiEngines.keyPlaceholder', { label: b.label })}
            value={typed}
            disabled={removing}
            onChange={(e) => type(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
          />
          {removing
            ? <PixelButton variant="secondary" size="sm" onClick={undo}>{t('settings.keys.undo')}</PixelButton>
            : hasKey && <PixelButton variant="secondary" size="sm" onClick={remove}>{t('settings.keys.remove')}</PixelButton>}
        </div>
      </FieldRow>
      <span style={NOTE}>{t('settings.keys.envVar', { name: b.envVar })}</span>
    </div>
  );
}

/** One saved custom secret: a new value replaces it, Remove takes it away,
 *  both on Save. `connections` warns when a service connection's name is
 *  used here, where the broker never reads it. */
export function CustomSecretSetup({ name, connections, onSettled }: { name: string; connections: { id: string; label: string }[]; onSettled: () => void }) {
  const { t } = useTranslation();
  const draft = useSettingsDraft();
  const [value, setValue] = useState('');
  const [removing, setRemoving] = useState(false);
  const conn = connectionFor(name, connections.map((c) => c.id));
  const connLabel = connections.find((c) => c.id === conn)?.label ?? conn;

  const done = () => { setValue(''); setRemoving(false); onSettled(); };
  const type = (text: string) => {
    setValue(text);
    setRemoving(false);
    draft?.setTask(secretTaskId(name), text ? secretTask(name, { kind: 'set', value: text }, secretStore, done) : null);
  };
  const remove = () => {
    setValue('');
    setRemoving(true);
    draft?.setTask(secretTaskId(name), secretTask(name, { kind: 'remove' }, secretStore, done));
  };
  const undo = () => {
    setValue('');
    setRemoving(false);
    draft?.setTask(secretTaskId(name), null);
  };
  const isRemoving = removing;
  const pending = draft?.hasTask(secretTaskId(name)) ?? false;
  const note = isRemoving ? t('settings.keys.willRemove') : pending ? t('settings.keys.custom.willReplace') : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-custom-secrets data-secret-row={name}>
      <LiveLine />
      <p style={LEAD}>{t('settings.keys.custom.info')}</p>
      {conn && <span style={{ fontSize: 12, color: 'var(--cth-status-waiting)' }} data-secret-conn={name}>{t('settings.keys.custom.notConnection', { id: connLabel })}</span>}
      <FieldRow
        label={t('integrations.screen.key.replace')}
        note={note && <span style={NOTE} data-secret-note={name}>{note}</span>}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', maxWidth: 520 }}>
          <input
            type="password"
            autoComplete="off"
            aria-label={t('settings.keys.custom.value')}
            data-secret-value
            placeholder={t('integrations.screen.key.stored')}
            value={value}
            disabled={isRemoving}
            onChange={(e) => type(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
          />
          {isRemoving || pending
            ? <PixelButton variant="secondary" size="sm" onClick={undo}>{t('settings.keys.undo')}</PixelButton>
            : <PixelButton variant="secondary" size="sm" onClick={remove}>{t('settings.keys.remove')}</PixelButton>}
        </div>
      </FieldRow>
      <span style={NOTE}>{t('settings.keys.envVar', { name })}</span>
    </div>
  );
}

/** Add a custom secret: a name and a value, stored on Save. `taken` is the
 *  names already saved, so a name that is there says it replaces it. */
export function AddSecretSetup({ taken, onAdded }: { taken: readonly string[]; onAdded: (name: string) => void }) {
  const { t } = useTranslation();
  const draft = useSettingsDraft();
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const nameProblem = (n: string) => secretNameProblem(n);
  const problem = name ? nameProblem(name) : null;
  const problemText = problem && t(`settings.keys.custom.problem.${problem}`);

  /** The task always matches what is typed: one name, one value, or none. */
  const stageFor = (n: string, v: string, prev: string) => {
    const ok = !!n && !nameProblem(n) && !!v;
    if (prev && prev !== n) draft?.setTask(secretTaskId(prev), null);
    if (n) draft?.setTask(secretTaskId(n), ok ? secretTask(n, { kind: 'set', value: v }, secretStore, () => { setValue(''); onAdded(n); }) : null);
  };
  const typeName = (n: string) => { stageFor(n, value, name); setName(n); };
  const typeValue = (v: string) => { stageFor(name, v, name); setValue(v); };
  const pending = !!name && (draft?.hasTask(secretTaskId(name)) ?? false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-custom-secrets data-secret-add>
      <LiveLine />
      <p style={LEAD}>{t('settings.keys.custom.info')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, maxWidth: 620 }}>
        <FieldRow
          label={t('settings.keys.custom.name')}
          note={problemText && <span role="alert" style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }} data-secret-problem={problem}>{problemText}</span>}
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
            onChange={(e) => typeName(e.target.value)}
            style={monoInput}
          />
        </FieldRow>
        <FieldRow label={t('settings.keys.custom.value')}>
          <input
            type="password"
            autoComplete="off"
            aria-label={t('settings.keys.custom.value')}
            data-secret-value
            value={value}
            onChange={(e) => typeValue(e.target.value)}
            style={{ ...inputStyle, minWidth: 0 }}
          />
        </FieldRow>
      </div>
      {pending && <span style={NOTE} data-secret-note={name}>{taken.includes(name) ? t('settings.keys.custom.willReplace') : t('settings.keys.willSave')}</span>}
    </div>
  );
}
