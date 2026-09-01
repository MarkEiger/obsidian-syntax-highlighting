// core/settings — the persisted state (data.json), and nothing else     [15a]
// Spec items: [0a], [0b], [4], [4a], [5d], [5e], [5f], [6b], [9], [10], [15a]
// Uses: LexerId, Uuid, FenceTag, Palette, Theme (from core/model)

/**
 * Everything the plugin remembers about one lexer, keyed by LexerId.
 * Exists independently of whether the lexer is currently loaded — a missing
 * or uninstalled lexer leaves its state dormant, reattached on return.
 * [10, 15a]
 */
interface LexerState {
  enabled: boolean;
  /** which theme renders; defaults to the first shipped theme. [5d] */
  activeTheme: Uuid;
  /** shipped themes (three-way merged on update) + user themes (never touched). [5b, 5e, 5f] */
  themes: Theme[];
  /** the lexer's private palette: `supplied` mirrors the package's seeds
   *  (persisted, so a dormant lexer's themes keep resolving), `custom` is
   *  the user's. [4] */
  palette: Palette;
  /** last reconciled version — drives update detection and 5b auto-fill. [5b, 6b] */
  installedVersion: number;
}

interface ShopSourceConfig {
  name: string;
  /** any git-hosted repo URL — official, third-party, or LAN. [9] */
  url: string;
  /** the curated repo; non-official sources are trust-your-source. [8c] */
  official: boolean;
}

interface PluginSettings {
  /** contains the reserved default colour. [4, 4a] */
  globalPalette: Palette;
  /** user-owned tag -> lexer binding; seeded by defaultTag, never overwritten
   *  by updates; many tags may point at one lexer. [0a, 0b] */
  tagBindings: Record<FenceTag, LexerId>;
  lexers: Record<LexerId, LexerState>;
  shopSources: ShopSourceConfig[];
}
