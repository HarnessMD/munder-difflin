/**
 * The engines offered where the ORCHESTRATOR's engine is chosen (0.5.3
 * feature 17: "every supported CLI listed wherever someone changes an agent").
 *
 * The worker pickers already list every preset. The two orchestrator pickers
 * (the Pro config tab and the classic command center) listed only the engines
 * that can run him, so Kimi and Copilot were simply absent, which reads as "not
 * supported at all". The truth is narrower, and the onboarding step already says
 * it (issue #355): an engine with no way to drain hive mail can be hired as a
 * temp but cannot run the orchestrator. So list them all, and DISABLE the ones
 * that cannot, with the reason in the label.
 *
 * `custom` is left out here as it is in onboarding: it is a bring your own
 * command, not an engine, and the orchestrator's command is now editable on its
 * own (bug 20), which is the honest way to run him on something unlisted.
 */
import { AGENT_PROVIDER_PRESETS, type AgentProvider } from './agentProvider';

export interface EngineOption {
  value: AgentProvider;
  label: string;
  disabled?: boolean;
}

/** Selectable engines first, so the list opens on something a person can pick;
 *  then the ones that cannot run him, disabled, each saying why. */
export function orchestratorEngineOptions(cannotRunLabel: string): EngineOption[] {
  const engines = AGENT_PROVIDER_PRESETS.filter((p) => p.id !== 'custom');
  const can = engines.filter((p) => p.supportsModel && p.canReceiveInbox);
  const cannot = engines.filter((p) => !can.includes(p));
  return [
    ...can.map((p) => ({ value: p.id, label: p.label })),
    ...cannot.map((p) => ({ value: p.id, label: `${p.label} · ${cannotRunLabel}`, disabled: true }))
  ];
}
