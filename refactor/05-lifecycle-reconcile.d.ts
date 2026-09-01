// lifecycle/reconcile — bind loaded packages to persisted state         [5b, 6b, 0c]
// Spec items: [0a], [0c], [5a], [5b], [5d], [5e], [10], [15a]
// Uses: LexerPackage (from core/lexer), LexerState (from core/settings),
//       PluginSettings (from core/settings), LoadedPackage (from sources),
//       Theme (from core/model), TokenType (from core/model),
//       UserPrompts, Notify (from ui/prompts)

/** A package successfully bound to its (possibly freshly minted) LexerState. */
interface AttachedLexer {
  readonly pkg: LexerPackage;
  readonly state: LexerState;
}

interface ReconcileResult {
  attached: AttachedLexer[];
  /** true if settings were mutated (first install, update, auto-fill) —
   *  the caller persists only then. */
  changed: boolean;
}

/**
 * The one place settings and packages meet. For each loaded package:
 *  - unknown id        -> mint LexerState: supplied palette from seeds [4],
 *                         shipped themes stored with shipped halves
 *                         (auto-filled total, [5a]), first shipped theme
 *                         active [5d], defaultTag bound if free [0a]
 *                         (conflict -> prompts.chooseTagOwner [0c])
 *  - known id, same    -> reattach, nothing written
 *  - known id, newer   -> replace the supplied palette wholesale (uuids kept
 *                         by matching names; a reference to a dropped colour
 *                         falls back to the default colour) [4], three-way
 *                         merge every shipped theme entry [5b, 5e], auto-fill
 *                         every stored theme for new token types + notify [5b]
 * Dormant states (no package this pass) are left untouched. [10, 15a]
 */
declare function reconcile(
  loaded: LoadedPackage[],
  settings: PluginSettings,
  prompts: UserPrompts,
  notify: Notify,
): Promise<ReconcileResult>;

/**
 * Make `theme` total over `tokenTypes`: missing entries point at the default
 * colour (in a shipped theme the added entry's shipped half is that same
 * default-colour entry); extras are left in place. Returns the token types
 * that were added. [5a, 5b]
 */
declare function autofillTheme(theme: Theme, tokenTypes: readonly TokenType[]): TokenType[];
