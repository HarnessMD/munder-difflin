import glyphSprite from '@/assets/glyphs.svg?raw';
import type { OfficeCharacterName } from '@/scene/office/castRoster';
import type { StatusKind } from './PixelBadge';

/**
 * Professional's answer to the sprite portrait — DESIGN-PROFESSIONAL.md section 9,
 * "identity without sprites". A thin monochrome line glyph on a quiet tile,
 * inheriting currentColor, never carrying colour of its own.
 *
 * THE SPRITE IS INLINED, NOT LINKED. Pam's file is authored as a `<use href=
 * "glyphs.svg#g-x">` sprite, and cross-file `<use>` does NOT resolve from
 * `file://` — which is exactly how Electron serves the packaged renderer. So
 * `GlyphSprite` injects the symbol defs once into the document and every glyph
 * references them with a same-document `#id`.
 */

/** Nine role glyphs. `g-` ids come from assets/glyphs.svg. */
export type RoleGlyphName =
  | 'orchestrator' | 'engineering' | 'design' | 'metrics'
  | 'finance' | 'growth' | 'community' | 'unassigned' | 'generic'
  /** The tenth. Section 9 permits nine to twelve; Pam drew this one after I
   *  reported that `andy` is the ONLY unmapped cast member with a real role
   *  ("email research and drafting") and that it mapped to none of the nine. */
  | 'correspondence';

/** Mount ONCE, high in the tree. Renders nothing visible. */
export function GlyphSprite() {
  return <span aria-hidden style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: glyphSprite }} />;
}

/**
 * Pam's character -> role table (her glyph handoff, she owns the identity layer).
 * It is a DEFAULT keyed on the avatar the user picked, which is why it is the
 * fallback here and not the first thing consulted — see roleGlyphFor below.
 *
 * Nine mapped of fifteen. The six left — dwight, stanley, phyllis, kelly, toby,
 * meredith — read "a fresh harness" in the hive roster, i.e. they genuinely have
 * NO defined role, so `generic` is the correct answer for them rather than a
 * missing glyph. That is a roster gap, not a design gap.
 */
const ROLE_BY_CHARACTER: Partial<Record<OfficeCharacterName, RoleGlyphName>> = {
  michael: 'orchestrator',
  kevin:   'engineering',
  pam:     'design',
  ryan:    'metrics',
  oscar:   'finance',
  jim:     'growth',
  angela:  'community',
  creed:   'unassigned',
  andy:    'correspondence'
};

/**
 * The agent model has no `role` field — only `description`, the free-text hire
 * one-liner ("same string as hive registry role"). Section 9 assumes a nine-value
 * taxonomy that does not exist in the data.
 *
 * ORDER MATTERS, AND IT IS DELIBERATELY NOT PAM'S ORDER. `character` is the
 * AVATAR THE USER PICKED, not what the agent does: two agents both drawn as jim
 * both read as growth even when one of them is reviewing code. `description` is
 * the only field that says what the agent is actually for, so it is consulted
 * first and the character table backs it up — which also preserves the visual
 * variety her table exists to give. Flagged to Pam; she owns the identity layer
 * and can reverse the precedence in one line.
 */
const ROLE_PATTERNS: [RegExp, RoleGlyphName][] = [
  [/\b(orchestrat|coordinat|manager|lead|boss|director)/i, 'orchestrator'],
  [/\b(eng|dev|build|code|coding|program|backend|frontend|infra|platform|qa|test)/i, 'engineering'],
  [/\b(design|ux|ui|brand|visual|art|creative)/i, 'design'],
  [/\b(metric|analyt|data|report|insight|measure|stat)/i, 'metrics'],
  [/\b(financ|account|budget|cost|payroll|invoic|billing)/i, 'finance'],
  [/\b(growth|market|sales|acquisit|campaign|seo|demand)/i, 'growth'],
  [/\b(communit|support|customer|success|advocacy|social|moderat)/i, 'community'],
  [/\b(email|mail|correspond|outreach|newsletter|drafting|inbox)/i, 'correspondence'],
];

/**
 * The text the hive writes into `description` for an agent that has been spawned
 * but never given a job. It is NOT a role, so it must not be matched against the
 * taxonomy or fall through to `generic` — six of the fifteen cast members read
 * exactly this today. Verified by reading their identity files, which is also
 * what settled that the sameness on a Professional floor is a roster gap rather
 * than a missing glyph.
 */
const NO_ROLE = /^(a\s+)?fresh\s+harness$/i;

/**
 * `unassigned` AND `generic` ARE DIFFERENT ANSWERS. god's ruling, and it is the
 * end of this chain rather than a detail:
 *
 *   unassigned  the role honestly says so. A VALUE, not a failed lookup.
 *   generic     the agent HAS a role and it matches none of the ten. Reaching
 *               this means the TAXONOMY IS SHORT, which is a signal worth
 *               keeping rather than the silent default.
 *
 * Collapsing them into one fallback throws away the only evidence that would say
 * a new glyph is needed. Pam drew them as a deliberate pair — a plain square and
 * a dot in a square — for exactly this reason.
 */
export function roleGlyphFor(
  description: string | undefined,
  isGod = false,
  character?: OfficeCharacterName
): RoleGlyphName {
  if (isGod) return 'orchestrator';
  const d = (description ?? '').trim();
  if (!d || NO_ROLE.test(d)) return 'unassigned';                        // a value, not a miss
  for (const [re, name] of ROLE_PATTERNS) if (re.test(d)) return name;   // what it DOES
  const byChar = character && ROLE_BY_CHARACTER[character];              // who it LOOKS like
  if (byChar) return byChar;
  return 'generic';                                                      // taxonomy is short
}

export interface RoleGlyphProps {
  role: RoleGlyphName;
  /** Tile edge in px. Section 9's specimen is 28 with a 16px glyph inside. */
  box?: number;
  /** Draw the quiet tile behind it. */
  tile?: boolean;
  /** Status hue for the corner dot. Omit for no dot. */
  status?: StatusKind;
  /** The dot's separating halo must match THE SURFACE THE TILE SITS ON, not
   *  always the page — on a panel or an alternate row, cream-50 is subtly wrong.
   *  Pam's note; the default is the page ground because that is where the kit's
   *  own specimens sit. */
  haloColor?: string;
}

/**
 * Section 9's avatar: a rounded square, not a circle and not initials — the
 * reference product uses circles with initials and section 9 rejects both, and
 * god's standing tiebreak is that the screenshots win where the spec is SILENT,
 * never where it has made an explicit reasoned decision.
 *
 * An avatar NEVER appears without its name beside it. Section 9 is absolute on
 * that, and it is what lets the glyph set stay this quiet.
 */
export function RoleGlyph({
  role,
  box = 28,
  tile = true,
  status,
  haloColor = 'var(--cth-cream-50)'
}: RoleGlyphProps) {
  const glyph = Math.round(box * 0.57);   // 16 at the specimen's 28
  const dot = 6;
  return (
    <span
      aria-hidden
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', width: box, height: box, flexShrink: 0,
        background: tile ? 'var(--cth-cream-200)' : 'transparent',
        boxShadow: tile ? 'inset 0 0 0 1px var(--cth-ink-300)' : undefined,
        borderRadius: 'var(--cth-radius-md, 2px)',
        color: 'var(--cth-ink-700)'
      }}
    >
      <svg width={glyph} height={glyph} style={{ display: 'block' }}>
        <use href={`#g-${role}`} />
      </svg>
      {status && (
        <span style={{
          position: 'absolute', right: -1, bottom: -1,
          width: dot, height: dot, borderRadius: 'var(--cth-radius-pill, 999px)',
          background: `var(--cth-status-${status})`,
          boxShadow: `0 0 0 1.5px ${haloColor}`
        }} />
      )}
    </span>
  );
}
