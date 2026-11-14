/**
 * A synchronous append-only file that keeps its descriptor open between rows.
 *
 * The caller owns paths, serialization, and lifecycle. This class only owns the
 * descriptor and the uncertainty boundary around one complete append. Keeping
 * that boundary small matters on Windows, where repeatedly opening a large file
 * by pathname can be orders of magnitude slower than writing through an open fd.
 */

import { closeSync, constants, fstatSync, openSync, statSync, writeSync } from 'node:fs';

interface AppendFileIdentity {
  dev: bigint;
  ino: bigint;
}

interface AppendFileStats {
  dev: bigint;
  ino: bigint;
}

export interface AppendFileFsOps {
  openSync(path: string, flags: number): number;
  writeSync(fd: number, buffer: Buffer, offset: number, length: number, position: null): number;
  closeSync(fd: number): void;
  fstatSync(fd: number, options: { bigint: true }): AppendFileStats;
  statSync(path: string, options: { bigint: true }): AppendFileStats;
}

export interface JsonlAppendFileOptions {
  fsOps?: AppendFileFsOps;
  validateEveryWrites?: number;
  onDiagnostic?: (message: string, error: unknown) => void;
}

const OPEN_WRITE_ONLY_APPEND_CREATE_FLAGS = constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT;
// Some filesystems report a zero inode when a stable file identity is unavailable.
const UNAVAILABLE_FILE_INODE = 0n;

const DEFAULT_APPEND_FILE_FS_OPS: AppendFileFsOps = {
  openSync: (path, flags) => openSync(path, flags),
  writeSync: (fd, buffer, offset, length, position) => writeSync(fd, buffer, offset, length, position),
  closeSync: (fd) => closeSync(fd),
  fstatSync: (fd, options) => fstatSync(fd, options),
  statSync: (path, options) => statSync(path, options)
};

/**
 * Bound stale-path exposure without putting a pathname stat on every hot append.
 * A 70 MiB Windows probe (tools/bench-jsonl-append.cjs) measured a 0.016 ms
 * mean at 16 writes versus 0.006 ms at 64, while reducing the maximum number
 * of writes to a replaced path from 63 to 15. The constructor remains
 * configurable for other filesystems and deterministic tests.
 */
export const APPEND_FILE_VALIDATE_EVERY_WRITES = 16;

export class JsonlAppendFile {
  private readonly fsOps: AppendFileFsOps;
  private readonly validateEveryWrites: number;
  private readonly onDiagnostic?: (message: string, error: unknown) => void;
  private fd: number | undefined;
  private path: string | undefined;
  private identity: AppendFileIdentity | undefined;
  private writesSinceValidation = 0;

  constructor(options: JsonlAppendFileOptions = {}) {
    this.fsOps = options.fsOps ?? DEFAULT_APPEND_FILE_FS_OPS;
    const cadence = options.validateEveryWrites;
    this.validateEveryWrites = typeof cadence === 'number' && Number.isFinite(cadence) && cadence >= 1
      ? Math.floor(cadence)
      : APPEND_FILE_VALIDATE_EVERY_WRITES;
    this.onDiagnostic = options.onDiagnostic;
  }

  /** Append exactly one already-encoded line. Never replays an uncertain row. */
  append(path: string, line: string): boolean {
    try {
      if (!this.ensureHandle(path)) return false;

      const buffer = Buffer.from(line, 'utf8');
      let offset = 0;
      while (offset < buffer.length) {
        const written = this.fsOps.writeSync(
          this.fd!, buffer, offset, buffer.length - offset, null
        );
        if (!Number.isInteger(written) || written <= 0 || written > buffer.length - offset) {
          throw new Error(`writeSync returned invalid byte count: ${written}`);
        }
        offset += written;
      }
      this.writesSinceValidation++;
      return true;
    } catch (error) {
      this.diagnose('append failed', error);
      this.invalidate();
      return false;
    }
  }

  /** Release the descriptor. Safe to call repeatedly and safe after failures. */
  close(): void {
    this.invalidate();
  }

  private ensureHandle(path: string): boolean {
    if (this.fd !== undefined && this.path !== path) this.invalidate();

    if (this.fd !== undefined && this.writesSinceValidation >= this.validateEveryWrites) {
      if (!this.validateHandle()) this.invalidate();
    }

    if (this.fd !== undefined) return true;

    try {
      const fd = this.fsOps.openSync(path, OPEN_WRITE_ONLY_APPEND_CREATE_FLAGS);
      this.fd = fd;
      this.path = path;
      this.writesSinceValidation = 0;
      this.identity = this.identityOf(this.fsOps.fstatSync(fd, { bigint: true }));
      return true;
    } catch (error) {
      this.diagnose('open failed', error);
      this.invalidate();
      return false;
    }
  }

  private validateHandle(): boolean {
    if (this.fd === undefined || this.path === undefined) return false;

    // An unavailable inode is not a trustworthy identity;
    // periodically reopen the path instead of pretending the old fd is current.
    if (!this.identity) return false;

    try {
      const descriptorIdentity = this.identityOf(this.fsOps.fstatSync(this.fd, { bigint: true }));
      const pathIdentity = this.identityOf(this.fsOps.statSync(this.path, { bigint: true }));
      if (!descriptorIdentity || !pathIdentity) return false;
      if (!this.sameIdentity(descriptorIdentity, this.identity)) return false;
      if (!this.sameIdentity(descriptorIdentity, pathIdentity)) return false;
      this.writesSinceValidation = 0;
      return true;
    } catch (error) {
      this.diagnose('validation failed', error);
      return false;
    }
  }

  private identityOf(stats: AppendFileStats): AppendFileIdentity | undefined {
    if (stats.ino === UNAVAILABLE_FILE_INODE) return undefined;
    return { dev: stats.dev, ino: stats.ino };
  }

  private sameIdentity(descriptorIdentity: AppendFileIdentity, expectedIdentity: AppendFileIdentity): boolean {
    return descriptorIdentity.dev === expectedIdentity.dev
      && descriptorIdentity.ino === expectedIdentity.ino;
  }

  private invalidate(): void {
    const fd = this.fd;
    // Forget first: closeSync failure must never leave the object logically open.
    this.fd = undefined;
    this.path = undefined;
    this.identity = undefined;
    this.writesSinceValidation = 0;
    if (fd === undefined) return;
    try { this.fsOps.closeSync(fd); }
    catch (error) { this.diagnose('close failed', error); }
  }

  private diagnose(message: string, error: unknown): void {
    try { this.onDiagnostic?.(message, error); } catch { /* diagnostics are best-effort */ }
  }
}
