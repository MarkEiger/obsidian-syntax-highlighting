// ui/prompts — every decision the engine can ask the user               [0c, 6b, 8c]
// One interface so engine code never constructs modals; the UI layer
// implements it with Obsidian modals, tests implement it with stubs.
// Uses: FenceTag, LexerId (from core/model), PaletteRef (from ops)

type Notify = (message: string) => void;

interface UserPrompts {
  /** two lexers want one tag — the chosen one binds, the loser stays unbound. [0c] */
  chooseTagOwner(tag: FenceTag, contenders: readonly LexerId[]): Promise<LexerId>;
  /** import of an already-installed id: old vs new version shown. [6b] */
  confirmUpdate(id: LexerId, installed: number, incoming: number): Promise<boolean>;
  /** "this runs code in your vault" — every executable install, any source. [8c] */
  confirmCodeInstall(name: string, sourceName: string): Promise<boolean>;
  /** palette import target. [7a] */
  choosePaletteTarget(candidates: readonly PaletteRef[]): Promise<PaletteRef>;
}
