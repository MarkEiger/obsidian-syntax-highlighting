// shop/* — catalogue, install, updates                                  [8a..8c]
// Spec items: [6b], [7b], [8a], [8b], [8c], [9], [11]
// Uses: LexerId, LexerState (from core/settings), ShopSourceConfig (from core/settings),
//       LexerPackage (from core/lexer), ThemeFile (from exchange)

interface ShopEntry {
  readonly kind: 'lexer' | 'theme';
  /** LexerId for lexers; for themes, the lexers it is marked for. [7b, 8a] */
  readonly id: string;
  readonly name: string;
  readonly author: string;
  readonly description: string;
  readonly language: string;
  readonly version: number;
  /** repo-relative path of the package/theme file. */
  readonly path: string;
}

/** The index file at a known path in every shop repo. [8a] */
interface ShopManifest {
  readonly format: 1;
  readonly entries: readonly ShopEntry[];
}

interface UpdateInfo {
  readonly entry: ShopEntry;
  readonly installedVersion: number;
}

/** Plain fetch against a git repo's raw files — works against any host,
 *  including a LAN git server. No git binary, mobile-safe. [9, 11] */
declare class ShopClient {
  constructor(source: ShopSourceConfig);
  fetchManifest(): Promise<ShopManifest>;
  /** downloads a package/theme and hands it to the Importer — install and
   *  import are the same flow, including all confirmations. [6b, 8c] */
  fetchEntry(entry: ShopEntry): Promise<LexerPackage | ThemeFile>;
}

/** Compares installed versions against every configured source's manifest;
 *  user confirms each update individually. [8b] */
declare function checkForUpdates(
  sources: ShopSourceConfig[],
  installed: Record<LexerId, LexerState>,
): Promise<UpdateInfo[]>;
