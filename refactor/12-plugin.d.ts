// plugin — composition root
// Uses: PluginSettings (from core/settings), LexerSource (from sources),
//       LexerRegistry (from registry), Highlighter (from editor/highlight),
//       FenceTag, LexerId, Uuid, Colour (from core/model),
//       Plugin (obsidian)

import type { Plugin } from 'obsidian';

declare class SyntaxHighlightPlugin extends Plugin {
  settings: PluginSettings;
  sources: LexerSource[];          // ordered; earlier wins on id collision
  registry: LexerRegistry;

  /** load sources -> reconcile -> rebuild registry -> persist iff changed. */
  reloadLexers(): Promise<void>;
  /** the HighlightSource the editor extension is registered with: registry
   *  lookup + enabled check + active-theme/style resolution. [0, 5d] */
  highlighterFor(tag: FenceTag): Highlighter | null;
  /** resolve a colour uuid against the global palette then the owning
   *  lexer's palette. [4] */
  resolveColour(lexer: LexerId, colour: Uuid): Colour | undefined;

  /** debounced: rapid edits coalesce into one write + editor refresh. [12] */
  saveSettings(): Promise<void>;
  flushSettings(): Promise<void>;
}
