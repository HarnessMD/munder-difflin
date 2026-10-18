/**
 * REFRESH-MODELS: the models file every picker reads (userData/models.json), as main hands it over.
 * Main validates it (src/main/providerModels.ts); the renderer only merges it with the floors.
 */
export interface ModelEntry { id: string; label: string }
export type ProviderStatus = 'ok' | 'not-installed' | 'unsupported' | 'failed';
export interface ProviderModels {
  status: ProviderStatus;
  /** How the list was obtained, e.g. "agy models". */
  source?: string;
  fetchedAt?: number;
  /** Present when status is ok, or when a failed refresh kept the last good list. */
  models?: ModelEntry[];
  /** Why there is no fresh list (not installed, timeout, exit 2, ...). */
  reason?: string;
}
export interface ModelsCatalog { version: 1; refreshedAt: number; providers: Record<string, ProviderModels> }

/** One provider's line in the Settings result table. */
export interface ModelsRefreshRow {
  provider: string;
  status: ProviderStatus;
  count: number;
  added: string[];
  removed: string[];
  reason?: string;
  /** A failed refresh kept this provider's last good list. */
  keptLast?: boolean;
  ms: number;
}

/** The list a picker should use for a provider: the file's, when it holds one (a fresh "ok", or a
 *  failed refresh that kept the last good list); otherwise null (use the floor). */
export function catalogModels(catalog: ModelsCatalog | null, provider: string): ModelEntry[] | null {
  const p = catalog?.providers?.[provider];
  return p && (p.status === 'ok' || p.status === 'failed') && p.models && p.models.length ? p.models : null;
}
