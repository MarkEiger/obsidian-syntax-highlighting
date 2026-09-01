// editor/highlight — the CodeMirror extension + incremental cache       [0, 12]
// Spec items: [0], [1a], [1b], [1c], [3], [5d], [10], [12]
// Uses: LexerId, FenceTag, TokenType, Hex (from core/model),
//       Token (from core/lexer), Extension (@codemirror/state), App (obsidian)

import type { Extension } from '@codemirror/state';
import type { App } from 'obsidian';

/** A theme entry resolved to concrete render values. [1c, 3] */
interface ResolvedStyle {
  readonly colour: Hex;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
}

/**
 * The render path's whole view of the world for one fence tag. Everything
 * upstream (registry, settings, theme resolution) is flattened into this —
 * the editor layer depends on CodeMirror only.
 */
interface Highlighter {
  /** for console tags on lexer bugs. [1a, 1b] */
  readonly id: LexerId;
  /** may throw — the extension guards every call. [10] */
  tokenize(input: string): Token[];
  /** null -> leave the token unstyled (null type, or lexer-bug fallback
   *  handled upstream via the default colour). [1a, 1b] */
  styleFor(type: TokenType | null): ResolvedStyle | null;
}

/** tag -> active highlighter, or null when nothing should colour it
 *  (unbound tag, disabled lexer, ...) — decided by the composition root. [0] */
type HighlightSource = (tag: FenceTag) => Highlighter | null;

/**
 * Live-preview/source-mode only. [0] Maintains a per-block token cache so an
 * edit re-tokenizes only the block it touches; all other blocks reuse cached
 * results, keeping typing latency imperceptible. [12]
 */
declare function highlightExtension(source: HighlightSource): Extension;

/** Dispatched to every open editor when settings change, invalidating the
 *  block cache so decorations rebuild without a document change. [3, 5d] */
declare function refreshAllEditors(app: App): void;
