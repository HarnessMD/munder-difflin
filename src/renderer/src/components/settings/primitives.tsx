/**
 * Small building blocks for the settings sections: little text, with folds
 * and (i) tips in place of paragraphs.
 *
 *   Disclosure    a light fold inside a section; the section itself is the
 *                 frame's CollapsibleSection, and the (i) is the frame's InfoTip.
 *   FieldRow      a label with an optional (i), the control, an optional note.
 *   AgentPicker   "Answered by": the orchestrator first, then every active
 *                 agent that can take mail (not archived, not the assistant).
 *
 * Classic tokens only, so both themes come out right.
 */
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { receiverOptions, receiverShown, receiverWords } from '../triggers/receiverOptions';
import { InfoTip } from './SettingsFrame';
import { classicInput, classicLabel, classicMonoInput } from './classicBits';

/** A light fold inside a section ("How to get these", "Advanced"): a text
 *  button and its body, closed by default. The section itself is the frame's
 *  CollapsibleSection. */
export function Disclosure({ title, children, dataAttr }: { title: string; children: ReactNode; dataAttr?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} {...(dataAttr ? { [`data-${dataAttr}`]: open ? 'open' : 'closed' } : {})}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--cth-font-ui)', fontSize: 'var(--cth-text-body-sm)', color: 'var(--cth-ink-700)' }}
      >
        <span aria-hidden style={{ display: 'inline-block', width: 10 }}>{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div id={id} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingInlineStart: 16 }}>{children}</div>}
    </div>
  );
}

/** One labelled field row: the label above, the control, an optional note. */
export function FieldRow({ label, info, children, note }: { label: string; info?: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, flex: 1 }}>
      <span style={{ ...classicLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {info && <InfoTip text={info} label={label} />}
      </span>
      {children}
      {note}
    </div>
  );
}

/** The agents an inbound message may be pointed at (the same set as the
 *  responder select): active, not the orchestrator, not the send-only
 *  assistant. An id that is not among them shows as the orchestrator, which
 *  is where main would send the message. The list also ends with a temp and
 *  a temp cloned from each agent (triggers/receiverOptions, the one list
 *  every receiver picker draws); a clone of an agent that is gone shows as a
 *  temp. */
export function AgentPicker({ value, onChange, label, godName, style }: { value: string; onChange: (id: string) => void; label: string; godName: string; style?: CSSProperties }) {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const options = receiverOptions(agents, { value: '', label: t('settings.connections.responder.orchestrator', { godName }) }, receiverWords(t));
  const shown = receiverShown(value, options, '');
  return (
    <select aria-label={label} value={shown} onChange={(e) => onChange(e.target.value)} style={style ?? { ...classicInput, maxWidth: 320 }} data-agent-picker>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export const monoInput = classicMonoInput;
