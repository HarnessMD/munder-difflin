/**
 * The app's answers to src/core/paths.ts and src/core/secrets.ts: Electron's
 * userData folder, the files it ships, and the OS keychain cipher
 * (safeStorage).
 *
 * Imported FIRST by src/main/index.ts, for its side effect, so both are
 * registered before any other module of the main process is evaluated; some
 * of them read the config while they load. Asked on every use, as before,
 * so a floor that sets its own data dir (--user-data-dir) is followed.
 */
import { app, safeStorage } from 'electron';
import { join } from 'node:path';
import { setOfficePaths } from '../core/paths';
import { setSecretCipher } from '../core/secrets';

setOfficePaths({
  userData: () => app.getPath('userData'),
  // Packaged: everything sits in the resources folder. A dev run reads the
  // repo: the KG core beside main's sources, the rest under resources/.
  bundled: (name) => app.isPackaged
    ? join(process.resourcesPath, name)
    : name === 'kg-core.cjs' ? join(app.getAppPath(), 'src', 'main', name) : join(app.getAppPath(), 'resources', name)
});

// The secret store's cipher (src/core/secrets.ts): the OS keychain through
// safeStorage, asked on every use as integrations.ts did.
setSecretCipher({
  available: () => safeStorage.isEncryptionAvailable(),
  encrypt: (plaintext) => safeStorage.encryptString(plaintext),
  decrypt: (ciphertext) => safeStorage.decryptString(ciphertext)
});
