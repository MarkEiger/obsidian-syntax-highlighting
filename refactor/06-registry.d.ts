// registry — tag -> renderable lexer resolution                         [0a..0c]
// Spec items: [0b]
// Uses: AttachedLexer (from lifecycle/reconcile), FenceTag, LexerId (from core/model)

/**
 * Rebuilt after every reconcile; pure derived state, owns nothing.
 * Resolution: each tag maps to exactly one lexer. [0b]
 */
declare class LexerRegistry {
  rebuild(attached: AttachedLexer[], bindings: Record<FenceTag, LexerId>): void;
  byTag(tag: FenceTag): AttachedLexer | null;
  byId(id: LexerId): AttachedLexer | null;
  all(): AttachedLexer[];
}
