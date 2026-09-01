// core/lexer — the lexer-author contract (published as lexer-api.d.ts)   [1, 6a]
// Spec items: [1a], [1b], [5], [6a], [6b], [7a], [8b], [10]
// Uses: TokenType, FenceTag, LexerId (from core/model), Colour (from core/model)

/**
 * One token. `type: null` marks text the lexer doesn't classify — rendered
 * unstyled. Tokens must, in order, concatenate to exactly the input;
 * positions are implied by running offset. [1b]
 */
interface Token {
  readonly text: string;
  readonly type: TokenType | null;
}

interface Lexer {
  /** identity parts — the plugin builds the id via makeLexerId(author, slug);
   *  both must match /^[a-z0-9-]+$/ and never change across versions. [6a] */
  readonly author: string;
  readonly slug: string;
  /** display name — free-form, independent of identity and of tags, so it can
   *  say 'NASM Assembly' while the id stays 'alfred.nasm'. */
  readonly name: string;
  /** compared against the shop manifest / incoming imports. [6b, 8b] */
  readonly version: number;
  /** seeds the tag binding on first install; user-owned afterwards. [0a] */
  readonly defaultTag: FenceTag;
  /** the complete declared vocabulary — emitting outside it is a bug. [1a] */
  readonly tokenTypes: readonly TokenType[];
  /** may throw / misbehave; callers isolate it, never the document. [10, 1b] */
  tokenize(input: string): Token[];
}

/**
 * Everything one distributable lexer is: code, palette seeds, and at least
 * one shipped theme. The unit sources produce and installs consume. [5, 7a]
 */
interface LexerPackage {
  readonly lexer: Lexer;
  /** identity-less by design — uuids are minted on install. [7a, 7c] */
  readonly palette: readonly Colour[];
  readonly themes: readonly ThemeFile[];
}
