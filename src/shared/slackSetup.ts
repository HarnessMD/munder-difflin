/**
 * SLACK IN THREE FIELDS (0.5.3, settings redesign; founder 24 Sep 2026:
 * "simplify the slack configuration ... they just add the keys and channel ID
 * and it should start working").
 *
 * The person gives a bot token, an app token and a channel id. The way in
 * follows from what they gave, so nobody has to know the three ways exist:
 *
 *   app token given     socket mode. Slack pushes every message the moment it
 *                       is sent, nothing public, the channel id is optional
 *                       (it only scopes the catch up sweep).
 *   no app token        polling. The bot token reads the one channel's
 *                       history every minute, so the channel id is required.
 *
 * Someone who chose a way in Advanced keeps it (`way` other than 'auto'), and
 * an install already running the Slack webhook way keeps that too.
 *
 * There is no Turn on, Turn off or separate Save any more: the card's switch
 * is a field, and the page's one Save applies it. `slackSaveAction` says what
 * Save must then do to the running bridge.
 *
 * Pure and dependency free: the renderer uses it and a test pins it.
 */
import type { SlackMode } from './slackMode';

export type SlackWay = 'auto' | SlackMode;

export interface SlackFields {
  on: boolean;
  way: SlackWay;
  botToken: string;
  appToken: string;
  channelId: string;
  signingSecret: string;
}

/** The way Save will use. */
export function slackModeFor(f: Pick<SlackFields, 'way' | 'appToken'>): SlackMode {
  if (f.way !== 'auto') return f.way;
  return f.appToken.trim() ? 'socket' : 'polling';
}

/** What the chosen way still needs, as field keys ('botToken', 'appToken',
 *  'channelId', 'signingSecret'), mirroring main's slackReadiness. */
export function slackMissingFields(f: SlackFields): Array<'botToken' | 'appToken' | 'channelId' | 'signingSecret'> {
  const mode = slackModeFor(f);
  const out: Array<'botToken' | 'appToken' | 'channelId' | 'signingSecret'> = [];
  if (mode === 'webhook') {
    if (!f.signingSecret.trim()) out.push('signingSecret');
    return out;
  }
  if (!f.botToken.trim()) out.push('botToken');
  if (mode === 'socket' && !f.appToken.trim()) out.push('appToken');
  if (mode === 'polling' && !f.channelId.trim()) out.push('channelId');
  return out;
}

export type SlackField = 'botToken' | 'appToken' | 'channelId' | 'signingSecret';

/**
 * The fields the card draws for a connection type (batch 3 #9, founder 25
 * Sep 2026: "show only the fields the chosen connection type needs").
 *   auto     bot token, app token, channel: the app token is what picks live
 *            or polling, so it has to be there to be given
 *   socket   bot token, app token, channel (optional, scopes the catch up)
 *   polling  bot token, channel
 *   webhook  signing secret (checks Slack's calls), bot token (the replies)
 */
export function slackFieldsShown(way: SlackWay, mode: SlackMode): SlackField[] {
  if (way === 'auto' || mode === 'socket') return ['botToken', 'appToken', 'channelId'];
  if (mode === 'polling') return ['botToken', 'channelId'];
  return ['signingSecret', 'botToken'];
}

/** The connection type picker's starting value for a saved config: 'auto' unless the
 *  saved way is not what auto would pick from the saved tokens, in which case
 *  that way was chosen on purpose and stays chosen. */
export function initialSlackWay(saved: { mode: SlackMode; appToken: string }): SlackWay {
  return slackModeFor({ way: 'auto', appToken: saved.appToken }) === saved.mode ? 'auto' : saved.mode;
}

/**
 * What Save does to the bridge after writing the config:
 *   start    switch on and every field there: (re)start it, so new tokens
 *            and a new way take effect at once.
 *   stop     switch off: stop it, and the saved flag keeps it off at boot.
 *   none     switch on but something is missing: nothing can start, and the
 *            card says what is missing.
 */
export function slackSaveAction(f: SlackFields): 'start' | 'stop' | 'none' {
  if (!f.on) return 'stop';
  return slackMissingFields(f).length === 0 ? 'start' : 'none';
}
