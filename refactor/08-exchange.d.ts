// exchange/* — import/export file formats and operations                [7a..7c]
// Spec items: [6b], [6c], [7a], [7b], [7c], [8c]
// Uses: LexerId, TokenType, Uuid, Colour (from core/model),
//       PluginSettings (from core/settings), LexerRegistry (from registry),
//       UserPrompts, Notify (from ui/prompts), LexerPackage (from core/lexer)

/**
 * A standalone, self-contained theme file. Colours travel embedded and are
 * merged into the target lexer's palette's CUSTOM section on import (uuids
 * minted, name conflicts resolved per [6c]); entries reference colours by
 * embedded name, re-pointed to uuids on import. [7b, 7c]
 */
interface ThemeFile {
  readonly format: 1;
  readonly name: string;
  /** every lexer this theme is marked for; import attaches an independent
   *  per-lexer copy to each one that is installed. [7b] */
  readonly lexers: readonly LexerId[];
  readonly colours: readonly Colour[];
  readonly entries: Readonly<Record<TokenType, {
    colour: string; // name within `colours`
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>>;
}

/** A standalone colour set, mergeable into the global or a lexer palette's
 *  custom section. [7a] */
interface PaletteFile {
  readonly format: 1;
  readonly name: string;
  readonly colours: readonly Colour[];
}

interface ImportReport {
  /** e.g. "attached to alfred.nasm", "2 token types auto-filled", "3 unused entries kept" */
  readonly notes: string[];
}

declare class Importer {
  constructor(settings: PluginSettings, registry: LexerRegistry, prompts: UserPrompts, notify: Notify);
  /** id exists -> update flow with confirmation [6b]; executable code always
   *  requires the runs-code-in-your-vault confirmation. [8c] */
  importLexerPackage(pkg: LexerPackage, origin: string): Promise<ImportReport>;
  /** fails cleanly if no marked lexer is installed. [7b] */
  importTheme(file: ThemeFile): Promise<ImportReport>;
  /** user chooses the target palette (global or a lexer's). [7a] */
  importPalette(file: PaletteFile, target: 'global' | LexerId): Promise<ImportReport>;
}

declare class Exporter {
  constructor(settings: PluginSettings, registry: LexerRegistry);
  /** embeds every referenced colour so the file is self-contained. [7c] */
  exportTheme(lexerId: LexerId, themeUuid: Uuid): ThemeFile;
  exportPalette(target: 'global' | LexerId): PaletteFile;
}
