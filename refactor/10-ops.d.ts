// ops/* — the settings-operations facade (the verbs)                    [13..17]
// The complete verb list from [13..17]; the settings UI calls ONLY these.
// Each mutator persists (debounced) and refreshes editors on success.
// Uses: LexerId, FenceTag, Uuid, Hex, Colour, ThemeEntry, Theme (from core/model)

/** Thrown by ColourOps.delete when the colour is still referenced; carries
 *  what references it, for the UI to display. [3a] */
declare class ColourInUseError extends Error {
  readonly references: ReadonlyArray<{ lexerId: LexerId; themeUuid: Uuid; tokenType: TokenType }>;
}

type PaletteRef = 'global' | LexerId;

declare class ColourOps { // [13] — mutators touch the CUSTOM section only;
  // supplied colours are immutable [4]. The one exception: setHex accepts
  // DEFAULT_COLOUR_UUID. [4a]
  /** returns the minted uuid — the value's identity is the palette key. */
  add(target: PaletteRef, colour: Colour): Uuid;                    // name unique [6c]
  rename(target: PaletteRef, colour: Uuid, name: string): void;     // [6c]
  setHex(target: PaletteRef, colour: Uuid, hex: Hex): void;         // instant everywhere [3]
  /** throws ColourInUseError. [3a] */
  delete(target: PaletteRef, colour: Uuid): void;
  /** from either section — the editable-variant escape hatch for a supplied
   *  colour; lands in `to`'s custom section under a fresh uuid. */
  copy(from: PaletteRef, colour: Uuid, to: PaletteRef): Uuid;
  /** custom colours only. Returns the uuid the colour has in `to`. */
  move(from: PaletteRef, colour: Uuid, to: PaletteRef): Uuid;
  /** the default colour back to its built-in value. [4a] */
  revertDefaultColour(): void;
}

declare class ThemeOps { // [14]
  setActive(lexer: LexerId, theme: Uuid): void;                     // [5d]
  /** in place, shipped and user themes alike — no forking. [5e] */
  edit(lexer: LexerId, theme: Uuid, tokenType: TokenType, entry: ThemeEntry): void;
  /** born total: copy of an existing theme, or all-default-colour; entries
   *  carry no shipped halves. [5f, 5a] */
  create(lexer: LexerId, name: string, from?: Uuid): Theme;
  duplicate(lexer: LexerId, theme: Uuid, name: string): Theme;
  /** user themes only — shipped themes leave with their lexer. [5f] */
  delete(lexer: LexerId, theme: Uuid): void;
  /** restore shipped halves: one entry, or every entry at once. [5e] */
  revertEntry(lexer: LexerId, theme: Uuid, tokenType: TokenType): void;
  revertTheme(lexer: LexerId, theme: Uuid): void;
}

declare class LexerOps { // [15]
  setEnabled(lexer: LexerId, enabled: boolean): void;
  /** removes code + shipped themes; user data stays dormant. [15a] */
  uninstall(lexer: LexerId): Promise<void>;
  /** explicit cleanup of dormant state. [15a] */
  purgeDormant(lexer: LexerId): void;
  bindTag(tag: FenceTag, lexer: LexerId): void;                     // [0a, 0b]
  unbindTag(tag: FenceTag): void;                                   // [0c]
}
