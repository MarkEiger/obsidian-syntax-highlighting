import { Colour, ColourMapping, LexerSettings, newColourId } from "settings/settings";
import { Lexer } from "./api";

// Sanity-checks a lexer's declaration. Returns human-readable warnings;
// the lexer still loads best-effort (unmapped token types fall back to the
// default colour at render time).
export function validateLexer(lexer: Lexer): string[] {
	const warnings: string[] = [];
	const seen = new Set<string>();
	for (const colour of lexer.requiredColours) {
		const key = colour.name.toLowerCase();
		if (seen.has(key)) {
			// supplied names are the reconciliation key, duplicates are ambiguous
			warnings.push(`duplicate required colour name "${colour.name}"`);
		}
		seen.add(key);
	}
	for (const [tokenType, colourName] of Object.entries(lexer.colourMapping)) {
		if (!lexer.requiredColours.some(c => c.name === colourName)) {
			warnings.push(`token type "${tokenType}" maps to undeclared colour "${colourName}"`);
		}
	}
	return warnings;
}

// the lexer's declared default mappings, resolved to ids within the pool
function defaultMappings(lexer: Lexer, pool: Colour[]): ColourMapping {
	const mappings: ColourMapping = {};
	for (const [tokenType, colourName] of Object.entries(lexer.colourMapping)) {
		const colour = pool.find(c => !c.isCustom && c.name === colourName);
		if (colour) {
			mappings[tokenType] = colour.id;
		}
	}
	return mappings;
}

// first install: mint ids for the declared colours and map every token type
// to its declared default
export function seedLexerSettings(lexer: Lexer): LexerSettings {
	const pool: Colour[] = lexer.requiredColours.map(c =>
		({ id: newColourId(), name: c.name, value: c.value, isCustom: false }));
	return new LexerSettings(lexer.id, lexer.name, pool, defaultMappings(lexer, pool));
}

// Re-attach stored settings to a (possibly updated) lexer. Supplied colours
// match by their frozen name, keeping their ids — so existing token mappings
// keep resolving. New declarations are added, dropped ones are removed unless
// a token still points at them. Custom colours and every user choice survive.
export function reconcileLexerSettings(settings: LexerSettings, lexer: Lexer): void {
	for (const declared of lexer.requiredColours) {
		if (!settings.privatePool.some(c => !c.isCustom && c.name === declared.name)) {
			settings.privatePool.push({ id: newColourId(), name: declared.name, value: declared.value, isCustom: false });
		}
	}
	const referenced = new Set(Object.values(settings.colourMappings));
	settings.privatePool = settings.privatePool.filter(c =>
		c.isCustom
		|| lexer.requiredColours.some(d => d.name === c.name)
		|| referenced.has(c.id));
	// token types that gained a default (or are new) get seeded; existing
	// user choices are never overwritten
	const defaults = defaultMappings(lexer, settings.privatePool);
	for (const [tokenType, colourId] of Object.entries(defaults)) {
		if (!(tokenType in settings.colourMappings)) {
			settings.colourMappings[tokenType] = colourId;
		}
	}
}

// Restore the lexer's declared defaults: supplied colour values and all token
// mappings reset to the declaration. The global palette, the extension rename
// and the enabled flag are untouched. Custom private colours are kept or
// dropped per the user's choice.
export function restoreLexerDefaults(settings: LexerSettings, lexer: Lexer, keepCustomColours: boolean): void {
	for (const colour of settings.privatePool) {
		if (colour.isCustom) continue;
		const declared = lexer.requiredColours.find(d => d.name === colour.name);
		if (declared) {
			colour.value = declared.value;
		}
	}
	for (const declared of lexer.requiredColours) {
		if (!settings.privatePool.some(c => !c.isCustom && c.name === declared.name)) {
			settings.privatePool.push({ id: newColourId(), name: declared.name, value: declared.value, isCustom: false });
		}
	}
	// mappings now reference declared colours only, so orphaned supplied
	// colours (and, if chosen, the customs) can be purged safely
	settings.privatePool = settings.privatePool.filter(c =>
		c.isCustom ? keepCustomColours : lexer.requiredColours.some(d => d.name === c.name));
	settings.colourMappings = defaultMappings(lexer, settings.privatePool);
}
