/** The owner of a file: the agent whose workspace holds it, the same rule
 *  `openFileInIde` uses. */
export function ownerOfPath<A extends { cwd?: string }>(agents: ReadonlyArray<A>, abs: string): A | null {
  const key = (p: string): string => {
    const normalized = p.replace(/\\/g, '/').replace(/\/+$/, '') || '/';
    return /^(?:[A-Za-z]:\/|\/\/)/.test(normalized) ? normalized.toLowerCase() : normalized;
  };
  const path = key(abs);
  return agents.find((a) => {
    if (!a.cwd) return false;
    const root = key(a.cwd);
    return path === root || path.startsWith(root.endsWith('/') ? root : `${root}/`);
  }) ?? null;
}
