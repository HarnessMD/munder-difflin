/// <reference types="vite/client" />
/**
 * The bundled theme packs (themes/<dir>/theme.json) as project themes, so main
 * accepts a pack id wherever it accepts a built-in one (config:setProjectTheme,
 * voice) exactly when the window would. Imported first by index.ts, so
 * registration runs before any config is read.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */
import { registerPackThemes } from '../shared/projectTheme';
import { validatedPackThemeEntries } from './packThemeEntries';

const MANIFESTS = import.meta.glob('../../themes/*/theme.json', { eager: true, import: 'default' }) as Record<string, unknown>;

registerPackThemes(validatedPackThemeEntries(MANIFESTS));
