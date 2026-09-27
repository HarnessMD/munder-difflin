/**
 * Small building blocks for the redesigned settings sections (0.5.3; founder
 * 24 Sep 2026: "not too much text should be there, instead there should be
 * expandable sections and tooltips for explaination").
 *
 *   Disclosure    a light fold inside a section; the section itself is the
 *                 frame's CollapsibleSection, and the (i) is the frame's InfoTip.
 *   FieldRow      a label with an optional (i), the control, an optional note.
 *   AgentPicker   "Answered by": the orchestrator first, then every active
 *                 agent that can take mail (not archived, not the assistant).
 *                 `style` lets the Classic skin pass its own input look.
 *
 * Tokens only, so both skins and both themes come out right.
 */
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { inputStyle } from '../pro/ui';
import { InfoTip } from './SettingsFrame';

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
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--cth-ink-700)' }}
      >
        <span aria-hidden style={{ display: 'inline-block', width: 10, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}>▸</span>
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
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--cth-ink-700)' }}>
        {label}
        {info && <InfoTip text={info} label={label} />}
      </span>
      {children}
      {note}
    </div>
  );
}

/** The agents an inbound message may be pointed at (the same set as the 0.5.2
 *  responder select): active, not the orchestrator, not the send-only
 *  assistant. An id that is not among them shows as the orchestrator, which
 *  is where main would send the message. */
export function AgentPicker({ value, onChange, label, godName, style }: { value: string; onChange: (id: string) => void; label: string; godName: string; style?: CSSProperties }) {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const choices = agents.filter((a) => !a.isGod && !a.archived && !a.isAssistant);
  const shown = choices.some((a) => a.id === value) ? value : '';
  return (
    <select aria-label={label} value={shown} onChange={(e) => onChange(e.target.value)} style={style ?? { ...inputStyle, maxWidth: 320 }} data-agent-picker>
      <option value="">{t('settings.connections.responder.orchestrator', { godName })}</option>
      {choices.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}

export const monoInput = { ...inputStyle, fontFamily: 'var(--cth-font-mono)', fontSize: 12 } as const;
