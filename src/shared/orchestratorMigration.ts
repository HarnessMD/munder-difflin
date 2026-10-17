/**
 * One-time migration of persisted state from the orchestrator's old id to its
 * current one. Pure (no fs) so it can be unit-tested; callers own the I/O.
 *
 * The old name survives only here and in `LEGACY_ORCHESTRATOR_IDS`, because
 * existing hives, configs and schedules on users' disks still spell it that way.
 */
import { LEGACY_ORCHESTRATOR_IDS } from './orchestratorIdentity';

export const ORCHESTRATOR_ID = 'orchestrator';
const OLD_ROLE = 'orchestrator (god)';

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

/** The legacy id that `registry` still uses, or null when it needs no migration. */
export function legacyOrchestratorIdIn(registry: unknown): string | null {
  if (!isObj(registry)) return null;
  if ('godId' in registry) return LEGACY_ORCHESTRATOR_IDS[0];
  const agents = registry.agents;
  if (isObj(agents)) for (const id of LEGACY_ORCHESTRATOR_IDS) if (id in agents) return id;
  return null;
}

/** registry.json: godId/isGod/role + the `agents.<old id>` key. Returns a new object. */
export function migrateRegistry(registry: unknown): unknown {
  if (!isObj(registry)) return registry;
  const out: Json = { ...registry };
  const oldIdKey = 'godId';
  if (oldIdKey in out) {
    const v = out[oldIdKey];
    delete out[oldIdKey];
    out.orchestratorId = typeof v === 'string' && LEGACY_ORCHESTRATOR_IDS.includes(v) ? ORCHESTRATOR_ID : v;
  }
  if (isObj(out.agents)) {
    const agents: Json = {};
    for (const [id, meta] of Object.entries(out.agents)) {
      const newId = LEGACY_ORCHESTRATOR_IDS.includes(id) ? ORCHESTRATOR_ID : id;
      agents[newId] = isObj(meta) ? migrateAgentMeta(meta) : meta;
    }
    out.agents = agents;
  }
  return out;
}

/** One agent record (registry entry or persisted agent): isGod and the old role string. */
export function migrateAgentMeta(meta: Json): Json {
  const out: Json = { ...meta };
  const oldFlag = 'isGod';
  if (oldFlag in out) {
    out.isOrchestrator = out[oldFlag];
    delete out[oldFlag];
  }
  if (out.id && typeof out.id === 'string' && LEGACY_ORCHESTRATOR_IDS.includes(out.id)) out.id = ORCHESTRATOR_ID;
  if (out.role === OLD_ROLE) out.role = 'orchestrator';
  return out;
}

/** config.json: godProvider/godModel -> orchestratorProvider/Model (never clobbers a new value). */
export function migrateConfig(config: unknown): unknown {
  if (!isObj(config)) return config;
  const out: Json = { ...config };
  for (const [oldKey, newKey] of [['godProvider', 'orchestratorProvider'], ['godModel', 'orchestratorModel']] as const) {
    if (oldKey in out) {
      if (!(newKey in out)) out[newKey] = out[oldKey];
      delete out[oldKey];
    }
  }
  if (Array.isArray(out.missions)) out.missions = out.missions.map(migrateMission);
  return out;
}

/** A scheduled mission or trigger target: `to: 'god'` -> the orchestrator. */
export function migrateMission(m: unknown): unknown {
  if (!isObj(m)) return m;
  return typeof m.to === 'string' && LEGACY_ORCHESTRATOR_IDS.includes(m.to) ? { ...m, to: ORCHESTRATOR_ID } : m;
}
