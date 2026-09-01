import { LexerSettings } from "settings/settings";
import { Lexer, PaletteColour } from "./api";
import { AttachedLexer } from "./reconcile";

export type RegisteredLexer = { lexer: Lexer, uuid: string };

// Pure lookup structure over the attached lexers — no I/O. Owns the
// extension-uniqueness invariant: byExtension holds at most one lexer per
// code-block extension, both at rebuild time and when the user re-targets.
export class LexerRegistry {
	byExtension: Record<string, RegisteredLexer> = {};  // render path
	byUuid: Record<string, Lexer> = {};                 // settings path
	// the palette each lexer shipped with, keyed by settings uuid — needed
	// again when the user restores the lexer's default colours
	palettes: Record<string, PaletteColour[]> = {};
	// source folder of each imported lexer, keyed by settings uuid
	// (built-ins absent; presence = updatable in place)
	origins: Record<string, string> = {};

	rebuild(attached: AttachedLexer[], lexersSettings: Record<string, LexerSettings>, notify: (msg: string) => void): void {
		this.byExtension = {};
		this.byUuid = {};
		this.palettes = {};
		this.origins = {};
		for (const { lexer, palette, origin, uuid } of attached) {
			const extension = lexersSettings[uuid].extention;
			// two lexers targeting the same extension: the first keeps the
			// render slot, the loser stays loaded (visible in settings) but
			// inactive until the user re-targets one of them
			const occupant = this.byExtension[extension];
			if (occupant) {
				console.warn(`[lexer ${lexer.id}] extension "${extension}" is already targeted by "${occupant.lexer.name}" — "${lexer.name}" is inactive`);
				notify(`Extension "${extension}" is already targeted by "${occupant.lexer.name}" — "${lexer.name}" is inactive until re-targeted in settings.`);
			} else {
				this.byExtension[extension] = { lexer, uuid };
			}
			this.byUuid[uuid] = lexer;
			this.palettes[uuid] = palette;
			if (origin) {
				this.origins[uuid] = origin;
			}
		}
	}

	// Re-target a lexer's code-block extension. Validates and claims the new
	// slot; returns a user-facing reason on rejection (nothing changed), or
	// null on success (caller persists). Checks stored settings, not just
	// loaded lexers — a clash with an unloaded lexer would resurface on load.
	retargetLexer(lexersSettings: Record<string, LexerSettings>, uuid: string, to: string): string | null {
		if (!to) return 'Extension cannot be empty.';
		if (/\s/.test(to)) return 'Extension must be a single word.';
		const clash = Object.entries(lexersSettings)
			.find(([otherUuid, ls]) => otherUuid !== uuid && ls.extention === to);
		if (clash) {
			const clashLexer = this.byUuid[clash[0]];
			const clashName = clashLexer ? `"${clashLexer.name}"` : `id "${clash[1].lexerId}" (not loaded)`;
			return `Extension "${to}" is already targeted by ${clashName}.`;
		}
		const prev = lexersSettings[uuid].extention;
		// the slot may belong to another lexer if this one lost a collision
		// at load time — only free it if it's ours
		if (this.byExtension[prev]?.uuid === uuid) {
			delete this.byExtension[prev];
		}
		lexersSettings[uuid].extention = to;
		const lexer = this.byUuid[uuid];
		if (lexer) {
			this.byExtension[to] = { lexer, uuid };
		}
		return null;
	}
}
