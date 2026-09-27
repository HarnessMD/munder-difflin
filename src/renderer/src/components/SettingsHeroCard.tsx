/**
 * The hero card at the top of Settings → General.
 *
 * One kit card with one job: say what is running. The product name, the
 * running version, the plan chip, and the three app-level actions that belong
 * to no individual setting below (re-read the release notes, join Discord,
 * report a problem). Update state, checks and downloads live in the Updates
 * block right under this card, not here.
 *
 * 0.4.11, pilot feedback item 17: the v0.5.0 Pro announcement block, the
 * Founders' Wall offer band, the sponsor slot, the GitHub star button and the
 * changelog link are gone. This build IS the Pro version; a settings page that
 * sells Pro to a Pro user is noise. With them went the old release-drop idiom
 * (2px ink borders, uppercase mono blocks): the card now draws the kit, 1px
 * borders all round, radius and colour from the --cth-* tokens.
 *
 * 5 Sep 2026, the free tier: item 17 holds for anyone who paid, but a FREE
 * install is exactly the person an ad is for, so the card carries one plans
 * band again, redesigned in the kit. It names what PRO and TEAMS add and its
 * one CTA is the website's pricing section. The gate is App's `freeAdmitted`
 * minus a payer: a licence holder on either skin, and anyone in an org, still
 * never sees Settings sell to them.
 *
 * The plan chip still reads docs/hero.json IN THIS REPO, fetched at runtime
 * and cached, so the plan label can change without shipping a build. That
 * payload is DATA, never markup: it renders as a React text node, and
 * shared/heroPayload.ts validates types and caps lengths before it gets here.
 * The card renders instantly from the compiled-in default ("Local") and
 * upgrades in place when the fetch lands, so it never waits on the network.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProIcon } from './pro/icons';
import { DEFAULT_HERO, type HeroPayload } from '@shared/heroPayload';
import { freeAdmits } from '@shared/freeTier';
import { useFunnelPingWhen } from '@/analytics/funnel';
import { proGateAdmits } from '@shared/soloPro';
import { Btn, Card, Chip } from './pro/ui';
import { useAppSkin } from '../design/skin';
import { useFreeAccount } from '../store/freeAccount';
import { useSoloLicense } from './pro/onboarding/soloLicense';
import { useTeamsMode } from './team/teamsMode';

const GITHUB_REPO_URL = 'https://github.com/chaitanyagiri/munder-difflin';
const DISCORD_URL = 'https://discord.gg/SEDzP5ZPk5';
const PLANS_URL = 'https://harnessmd.com/#pricing';

export function SettingsHeroCard() {
  const { t } = useTranslation();
  const skin = useAppSkin();
  const teamsMode = useTeamsMode();
  const { free } = useFreeAccount();
  const { license } = useSoloLicense();
  // App's freeAdmitted, minus a payer: the plans band shows only to a machine
  // the free record admits, never to a licence holder or an org member.
  const freeUser = skin !== 'professional' && teamsMode === 'solo'
    && freeAdmits(free) && !proGateAdmits(teamsMode, license);
  /* `paywall_shown` (0.5.0 funnel). This band IS a purchase surface: it names
     both plans and carries a primary CTA to the pricing page, and for a free
     install in Classic it is the main upgrade door in the app. `manual`
     because nothing walled this person — they opened Settings and found it.
     `useFunnelPingWhen`, not a mount ping, because `freeUser` depends on two
     records that arrive over IPC after this component mounts. */
  useFunnelPingWhen(freeUser, { event: 'paywall_shown', plan: 'pro', trigger: 'manual' });
  const [version, setVersion] = useState<string | null>(null);
  // Starts on the compiled-in defaults, so there is no empty frame or spinner
  // while the fetch is in flight. It just fills in if anything changed.
  const [hero, setHero] = useState<HeroPayload>(DEFAULT_HERO);

  useEffect(() => {
    let alive = true;
    window.cth.appInfo()
      .then((i) => { if (alive) setVersion(i.version); })
      .catch(() => { /* the card is still useful without it */ });
    window.cth.heroPayload()
      .then((r) => { if (alive) setHero(r.hero); })
      .catch(() => { /* defaults already rendered */ });
    return () => { alive = false; };
  }, []);

  /** Re-show the release notes. UpdateToast owns that surface, it holds the
   *  last status and the drop renderer, so this asks rather than duplicating
   *  it, via the same CustomEvent convention App uses for opening Settings. */
  const showReleaseNotes = () => {
    window.dispatchEvent(new CustomEvent('cth:show-release-notes'));
  };

  return (
    <Card style={{ padding: 16, gap: 12 }}>
      {/* Identity: name, the running version in plain sight, the plan chip. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 600, lineHeight: '20px' }}>Munder Difflin</span>
        {version && (
          <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12.5, color: 'var(--cth-ink-700)' }}>
            v{version}
          </span>
        )}
        <Chip tone="muted">{hero.plan.label}</Chip>
      </div>

      {/* The plans band: the one ad in the product, for free installs only.
          Kit-drawn, 1px border all round, one CTA to the website's pricing. */}
      {freeUser && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, border: '1px solid var(--cth-ink-300)', borderRadius: 8, background: 'var(--cth-cream-100)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px' }}>{t('settingsHero.plans.title')}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Chip tone="outline">PRO</Chip>
            <span style={{ fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: '18px' }}>{t('settingsHero.plans.pro')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Chip tone="outline">TEAMS</Chip>
            <span style={{ fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: '18px' }}>{t('settingsHero.plans.teams')}</span>
          </div>
          <div>
            <Btn kind="primary" size="sm" onClick={() => void window.cth.openExternal(PLANS_URL)}>
              {t('settingsHero.plans.cta')} <ProIcon name="external" size={11} />
            </Btn>
          </div>
        </div>
      )}

      {/* The app-level actions that belong to no setting below. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn size="sm" onClick={showReleaseNotes} title={t('settingsHero.whatsNewTitle')}>
          <ProIcon name="sparkle" /> {t('settingsHero.whatsNew')}
        </Btn>
        <Btn size="sm" onClick={() => void window.cth.openExternal(DISCORD_URL)}>
          {t('settingsHero.joinDiscord')}<ProIcon name="external" size={11} />
        </Btn>
        <Btn kind="ghost" size="sm" onClick={() => void window.cth.openExternal(`${GITHUB_REPO_URL}/issues/new`)}>
          {t('settingsHero.reportProblem')}
        </Btn>
      </div>
    </Card>
  );
}
