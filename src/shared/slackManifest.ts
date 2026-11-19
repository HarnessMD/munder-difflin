/**
 * THE SLACK APP IN ONE PASTE (0.5.6, founder 16 Oct 2026: "The instructions in
 * slack configuration is old we should update them and maybe we can set up
 * some events if needed there"). His Slack app had no bot events, so the live
 * way connected and heard nothing.
 *
 * Slack builds an app from a manifest: api.slack.com/apps › Create New App ›
 * From a manifest. This one sets everything every way of reaching the office
 * needs, so nobody ticks scopes and events by hand:
 *
 *   scopes        the socket way's list (SLACK_BOT_SCOPES), which is also
 *                 everything polling reads with
 *   bot events    the four message events: channels, private channels,
 *                 direct messages, group direct messages
 *   socket mode   on. Harmless for polling, which never opens the socket
 *   messages tab  on and writable, so people can message the bot directly
 *
 * What a manifest cannot do: make the app level token (xapp) and install the
 * app. The steps say both. Field names follow Slack's manifest reference
 * (docs.slack.dev/reference/app-manifest).
 *
 * Pure and dependency free: the renderer copies it and a test pins it.
 */
import { SLACK_BOT_SCOPES } from './slackMode';

/** The bot events the live way needs, one per kind of conversation. */
export const SLACK_BOT_EVENTS: readonly string[] = ['message.channels', 'message.groups', 'message.im', 'message.mpim'];

/** The bot's handle in Slack: what `/invite @...` takes. Slack allows a to z,
 *  0 to 9, and - _ . in it. */
export const SLACK_BOT_HANDLE = 'munder-difflin';

export interface SlackManifest {
  display_information: { name: string; description: string };
  features: {
    app_home: { home_tab_enabled: boolean; messages_tab_enabled: boolean; messages_tab_read_only_enabled: boolean };
    bot_user: { display_name: string; always_online: boolean };
  };
  oauth_config: { scopes: { bot: string[] } };
  settings: {
    event_subscriptions: { bot_events: string[] };
    org_deploy_enabled: boolean;
    socket_mode_enabled: boolean;
    token_rotation_enabled: boolean;
  };
}

export function slackAppManifest(): SlackManifest {
  return {
    display_information: {
      name: 'Munder Difflin',
      description: 'Your Munder Difflin office in Slack. Mention it in a channel or message it directly.'
    },
    features: {
      app_home: { home_tab_enabled: false, messages_tab_enabled: true, messages_tab_read_only_enabled: false },
      bot_user: { display_name: SLACK_BOT_HANDLE, always_online: true }
    },
    oauth_config: { scopes: { bot: [...SLACK_BOT_SCOPES.socket] } },
    settings: {
      event_subscriptions: { bot_events: [...SLACK_BOT_EVENTS] },
      org_deploy_enabled: false,
      socket_mode_enabled: true,
      token_rotation_enabled: false
    }
  };
}

/** The manifest as Slack's paste box takes it (JSON, two space indent). */
export function slackAppManifestText(): string {
  return JSON.stringify(slackAppManifest(), null, 2);
}
