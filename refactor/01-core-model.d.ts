// core/model — value types: colours, themes, tokens                    [1..5]
// Spec items: [0], [1c], [2], [3], [3a], [4], [4a], [5a], [5b], [5c],
//             [5d], [5e], [5f], [6a], [6c]

/** Identity of anything user-created; minted by the plugin, never reused. [2, 3] */
type Uuid = string;

/** '#rrggbb'. */
type Hex = string;

/**
 * Stable namespaced lexer identity: 'author.name', constant across versions. [6a]
 * The template-literal type enforces the dotted shape at compile time;
 * parseLexerId is the runtime gate at every trust boundary.
 */
type LexerId = `${string}.${string}`;

/** The ONLY way an id is constructed: from its parts, each validated against
 *  /^[a-z0-9-]+$/ — lexer authors supply author + slug and never write the
 *  dotted form by hand. Throws on invalid parts. [6a] */
declare function makeLexerId(author: string, slug: string): LexerId;

/** The runtime gate for ids arriving as ready-made strings (settings keys,
 *  theme-file markings, shop manifests): validates
 *  /^[a-z0-9-]+\.[a-z0-9-]+$/ and throws otherwise. [6a] */
declare function parseLexerId(raw: string): LexerId;

/** A fence tag as written after ``` — the binding key of the registry. [0] */
type FenceTag = string;

/** Free-form per lexer; docs publish a recommended core list, never enforced. [5c] */
type TokenType = string;

/**
 * The persisted editable-with-memory primitive: `current` is what renders,
 * `shipped` is the value the package shipped — absent means user-created,
 * nothing to revert to. Plain data: revert verbs live in ops [14], and lexer
 * updates merge three-way — current == old shipped ? advance both : advance
 * shipped only. [5b, 5e]
 */
interface Defaultable<T> {
  shipped?: Readonly<T>;
  current: T;
}

/**
 * [2] A colour's value: display name + hex. Identity lives OUTSIDE the value:
 * in a palette it is the record key; in exchange files (packages, theme and
 * palette files) there is none at all — uuids are minted at import [7c], so a
 * file structurally cannot smuggle identity in. One type serves both roles.
 */
interface Colour {
  name: string;
  hex: Hex;
}

/**
 * A pool of colours keyed by uuid — the key IS the colour's identity, and
 * reference resolution is O(1) across both sections. [3] `supplied` mirrors
 * the lexer package exactly: immutable in the UI, replaced wholesale on
 * update with uuids preserved by matching names, so references survive. [4]
 * `custom` is user-owned. Two scopes exist: the one global palette (whose
 * supplied section is the plugin's own, [4a]) and one private palette per
 * lexer. [4] Name uniqueness is enforced across both sections at add/rename
 * time (an O(N) scan there is fine — those are rare, render-path lookups
 * are not). [6c]
 */
interface Palette {
  supplied: Record<Uuid, Readonly<Colour>>;
  custom: Record<Uuid, Colour>;
}

/** The reserved, never-deletable fallback colour's uuid — the sole supplied
 *  colour that accepts edits, revertible to its built-in value. [4a] */
declare const DEFAULT_COLOUR_UUID: Uuid;

/** One theme entry: colour by reference + font flags, all defaulting to off. [1c, 3] */
interface ThemeEntry {
  colour: Uuid;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/**
 * A stored theme. Always total over its lexer's declared token types —
 * holes are auto-filled with DEFAULT_COLOUR_UUID at import/update time;
 * extra entries are kept but ignored. [5a, 5b] Every theme is edited in
 * place; a shipped theme's entries carry their shipped halves, so revert —
 * per entry or whole theme — is always available, and updates three-way
 * merge instead of replacing. [5b, 5e]
 */
interface Theme {
  readonly uuid: Uuid;
  name: string;
  /** shipped: revertible, never deletable, merged on lexer update.
   *  user: yours — deletable, entries have no shipped halves. [5e, 5f] */
  readonly origin: 'shipped' | 'user';
  entries: Record<TokenType, Defaultable<ThemeEntry>>;
}
