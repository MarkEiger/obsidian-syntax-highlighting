// sources/* — where lexer packages come from                            [7, 8, 9]
// Spec items: [7a], [10], [11], [15a]
// Uses: LexerPackage (from core/lexer), Lexer (from core/lexer),
//       DataAdapter (obsidian), Notify (from ui/prompts)

/** One package as produced by a source; origin = vault folder it can be
 *  re-read from (absent for built-ins). */
interface LoadedPackage {
  readonly pkg: LexerPackage;
  readonly origin?: string;
}

/**
 * THE sourcing seam. The composition root holds an ordered list; a new kind
 * of source is appended there and nothing downstream changes. On id collision
 * between sources, the earlier source wins. [7, 8, 9]
 */
interface LexerSource {
  load(): Promise<LoadedPackage[]>;
}

/** Lexers compiled into the plugin itself. */
declare class BuiltinLexerSource implements LexerSource {
  load(): Promise<LoadedPackage[]>;
}

/**
 * Scans the imported-lexers vault folder: each lexer is a folder with an
 * index.js entry (+ require-able sibling modules), palette.json, and theme
 * files. Shop installs also land here — installed == on disk. A folder that
 * fails to evaluate is skipped with a notice; its LexerState stays dormant.
 * [7a, 10, 15a]
 */
declare class FileLexerSource implements LexerSource {
  constructor(adapter: DataAdapter, dir: string, notify: Notify);
  load(): Promise<LoadedPackage[]>;
}

/** Evaluates a folder's module map into a Lexer — mobile-safe, no Node APIs. [11] */
declare function evaluateLexerModules(
  modules: Record<string, string>,
  entry: string,
  folder: string,
): Lexer;
