/**
 * The billing view the desktop shows an ADMIN (PRO phase 5), and the pure
 * operations on it, so test/pro-phase5.test.cjs can prove them without
 * electron. Main fills it from the relay's `GET /billing` (teams-backend
 * API-CONTRACT 3.10); a member never receives it: main refuses before the
 * network (`billing:summary` is the first admin-only IPC, plan 6.4), and the
 * relay refuses again with `forbidden`.
 *
 * MONEY IS MINOR UNITS WITH A CURRENCY, never a float, never a preformatted
 * string, all the way from Razorpay to the row; `fmtMoney` is the one place
 * a number becomes text.
 */
import type { BillingState } from './teams';

export interface BillingCard { brand: string; last4: string; expiryMonth: number; expiryYear: number }

export interface BillingInvoice {
  invoiceId: string;
  at: string;
  amountMinor: number;
  currency: 'USD' | 'INR';
  status: 'paid' | 'failed' | 'refunded';
  receiptUrl: string | null;
}

/** What the relay answers, validated field by field. */
export interface BillingWire {
  state: BillingState;
  trialEndsAt: string | null;
  renewalAt: string | null;
  graceEndsAt: string | null;
  seatsPaid: number;
  seatsUsed: number;
  pricePerSeatMinor: number;
  currency: 'USD' | 'INR';
  card: BillingCard | null;
  invoices: BillingInvoice[];
  serverTime: string;
}

/**
 * The answer `billing:summary` gives the renderer. `refused` is the second
 * wall: the caller's standing is not admin, and no request was made.
 * `unavailable` is a relay without the route (or no org); `offline` is a
 * relay that did not answer; `error` carries the relay's machine code.
 */
export type BillingSummary =
  | { ok: true; view: BillingWire }
  | { ok: false; reason: 'refused' | 'unavailable' | 'offline' | 'error'; error?: string };

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strOrNull = (v: unknown): v is string | null => v === null || isStr(v);
const STATES: readonly BillingState[] = ['awaiting-card', 'trialing', 'healthy', 'payment-failed', 'cancelled'];
const CURRENCIES = ['USD', 'INR'] as const;
const INVOICE_STATUS = ['paid', 'failed', 'refunded'] as const;

function isCard(v: unknown): v is BillingCard {
  if (!v || typeof v !== 'object') return false;
  const c = v as Partial<BillingCard>;
  return isStr(c.brand) && isStr(c.last4) && /^[0-9]{4}$/.test(c.last4) && isNum(c.expiryMonth) && isNum(c.expiryYear);
}

function isInvoice(v: unknown): v is BillingInvoice {
  if (!v || typeof v !== 'object') return false;
  const i = v as Partial<BillingInvoice>;
  return isStr(i.invoiceId) && isStr(i.at) && isNum(i.amountMinor) && i.amountMinor >= 0
    && (CURRENCIES as readonly string[]).includes(i.currency as string)
    && (INVOICE_STATUS as readonly string[]).includes(i.status as string)
    && strOrNull(i.receiptUrl);
}

/** A wire body, or null. Built FIELD BY FIELD: an unknown field never rides
 *  through, a missing one never becomes a default that looks like a fact. */
export function parseBillingWire(raw: unknown): BillingWire | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (!STATES.includes(b.state as BillingState)) return null;
  if (!strOrNull(b.trialEndsAt) || !strOrNull(b.renewalAt) || !strOrNull(b.graceEndsAt)) return null;
  if (!isNum(b.seatsPaid) || !isNum(b.seatsUsed) || !isNum(b.pricePerSeatMinor)) return null;
  if (!(CURRENCIES as readonly string[]).includes(b.currency as string)) return null;
  if (b.card !== null && !isCard(b.card)) return null;
  if (!Array.isArray(b.invoices)) return null;
  if (!isStr(b.serverTime)) return null;
  return {
    state: b.state as BillingState,
    trialEndsAt: b.trialEndsAt, renewalAt: b.renewalAt, graceEndsAt: b.graceEndsAt,
    seatsPaid: b.seatsPaid, seatsUsed: b.seatsUsed, pricePerSeatMinor: b.pricePerSeatMinor,
    currency: b.currency as 'USD' | 'INR',
    card: b.card === null ? null : { brand: b.card.brand, last4: b.card.last4, expiryMonth: b.card.expiryMonth, expiryYear: b.card.expiryYear },
    invoices: b.invoices.filter(isInvoice).map((i) => ({ invoiceId: i.invoiceId, at: i.at, amountMinor: i.amountMinor, currency: i.currency, status: i.status, receiptUrl: i.receiptUrl })),
    serverTime: b.serverTime
  };
}

/** `$39.00`, `₹3,200.00`: minor units to text, once. */
export function fmtMoney(amountMinor: number, currency: 'USD' | 'INR', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amountMinor / 100);
}

/** What the org pays per period at its current seat count. */
export function monthlyTotalMinor(view: Pick<BillingWire, 'seatsPaid' | 'pricePerSeatMinor'>): number {
  return view.seatsPaid * view.pricePerSeatMinor;
}

/** The one date the state is about: the trial's end, the grace end, or the
 *  renewal. Null for cancelled, which is about no date, and null for
 *  awaiting-card, which is about no date either: nothing is counting down
 *  until a card is on file. */
export function keyDateFor(view: Pick<BillingWire, 'state' | 'trialEndsAt' | 'graceEndsAt' | 'renewalAt'>): string | null {
  switch (view.state) {
    case 'trialing': return view.trialEndsAt;
    case 'payment-failed': return view.graceEndsAt;
    case 'healthy': return view.renewalAt;
    case 'awaiting-card': return null;
    case 'cancelled': return null;
  }
}

export function stateTone(state: BillingState): 'ok' | 'warn' | 'bad' | 'muted' {
  switch (state) {
    case 'healthy': return 'ok';
    case 'trialing': return 'warn';
    // Not 'bad': nothing has failed. A new org starts here and the only thing
    // it is waiting on is a person adding a card, which the copy asks for.
    case 'awaiting-card': return 'warn';
    case 'payment-failed': return 'bad';
    case 'cancelled': return 'muted';
  }
}

/** Whether the org may invite, add seats, and generally spend. Mirrors the
 *  server's own gate (`teams-backend/src/db.mjs:155-167` seatGuard), which
 *  admits exactly `trialing` and `healthy`. Kept here so a screen can say WHY
 *  an invite is refused instead of drawing a disabled button with no reason. */
export function isEntitled(state: BillingState): boolean {
  return state === 'trialing' || state === 'healthy';
}
