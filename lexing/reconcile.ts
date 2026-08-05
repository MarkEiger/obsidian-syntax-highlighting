import { Colour, ColourMapping, LexerSettings, newColourId } from "settings/settings";
import { Lexer, PaletteColour } from "./api";

// Sanity-checks a lexer's declaration against the palette it ships with.
// Returns human-readable warnings; the lexer still loads best-effort
// (unmapped token types fall back to the default colour at render time).
export function validateLexer(lexer: Lexer, palette: PaletteColour[]): string[] {
	const warnings: string[] = [];
	const seen = new Set<string>();
	for (const colour of palette) {
		const key = colour.name.toLowerCase();
		if (seen.has(key)) {
			// palette names are the reconciliation key, duplicates are ambiguous
			warnings.push(`duplicate palette colour name "${colour.name}"`);
		}
		seen.add(key);
	}
	for (const [tokenType, colourName] of Object.entries(lexer.colourMapping)) {
		if (!palette.some(c => c.name === colourName)) {
			warnings.push(`token type "${tokenType}" maps to colour "${colourName}" not in the palette`);
		}
	}
	// a block's extension is the info string's first word, so an extension
	// containing whitespace can never match a code block
	if (lexer.defaultExtension !== undefined && /\s/.test(lexer.defaultExtension)) {
		warnings.push(`defaultExtension "${lexer.defaultExtension}" contains whitespace — code-block tags are a single word`);
	}
	return warnings;
}

// The lexer's declared default mappings, resolved to ids within the pool.
// Every declared token type gets an entry — '' when its colour isn't in the
// pool (e.g. no palette shipped) — so it still shows up in settings and the
// user can map it by hand. '' renders undecorated.
function defaultMappings(lexer: Lexer, pool: Colour[]): ColourMapping {
	const mappings: ColourMapping = {};
	for (const [tokenType, colourName] of Object.entries(lexer.colourMapping)) {
		const colour = pool.find(c => !c.isCustom && c.name === colourName);
		mappings[tokenType] = colour ? colour.id : '';
	}
	return mappings;
}

// first install: mint ids for the palette's colours and map every token type
// to its declared default
export function seedLexerSettings(lexer: Lexer, palette: PaletteColour[]): LexerSettings {
	const pool: Colour[] = palette.map(c =>
		({ id: newColourId(), name: c.name, value: c.value, isCustom: false }));
	return new LexerSettings(lexer.id, lexer.defaultExtension ?? lexer.name, pool, defaultMappings(lexer, pool));
}

// Re-attach stored settings to a (possibly updated) lexer + palette. Shipped
// colours match by their frozen name, keeping their ids — so existing token
// mappings keep resolving. New palette entries are added, dropped ones are
// removed unless a token still points at them. Custom colours and every user
// choice survive.
export function reconcileLexerSettings(settings: LexerSettings, lexer: Lexer, palette: PaletteColour[]): void {
	for (const declared of palette) {
		if (!settings.privatePool.some(c => !c.isCustom && c.name === declared.name)) {
			settings.privatePool.push({ id: newColourId(), name: declared.name, value: declared.value, isCustom: false });
		}
	}
	const referenced = new Set(Object.values(settings.colourMappings));
	settings.privatePool = settings.privatePool.filter(c =>
		c.isCustom
		|| palette.some(d => d.name === c.name)
		|| referenced.has(c.id));
	// token types that gained a default (or are new) get seeded; existing
	// user choices are never overwritten. An unmapped entry ('') is not a
	// choice — it re-seeds when a palette (finally) supplies its colour
	const defaults = defaultMappings(lexer, settings.privatePool);
	for (const [tokenType, colourId] of Object.entries(defaults)) {
		if (!settings.colourMappings[tokenType]) {
			settings.colourMappings[tokenType] = colourId;
		}
	}
}

// Restore the lexer's declared defaults: shipped colour values and all token
// mappings reset to the palette. The global palette, the extension rename
// and the enabled flag are untouched. Custom private colours are kept or
// dropped per the user's choice.
export function restoreLexerDefaults(settings: LexerSettings, lexer: Lexer, palette: PaletteColour[], keepCustomColours: boolean): void {
	for (const colour of settings.privatePool) {
		if (colour.isCustom) continue;
		const declared = palette.find(d => d.name === colour.name);
		if (declared) {
			colour.value = declared.value;
		}
	}
	for (const declared of palette) {
		if (!settings.privatePool.some(c => !c.isCustom && c.name === declared.name)) {
			settings.privatePool.push({ id: newColourId(), name: declared.name, value: declared.value, isCustom: false });
		}
	}
	// mappings now reference palette colours only, so orphaned shipped
	// colours (and, if chosen, the customs) can be purged safely
	settings.privatePool = settings.privatePool.filter(c =>
		c.isCustom ? keepCustomColours : palette.some(d => d.name === c.name));
	settings.colourMappings = defaultMappings(lexer, settings.privatePool);
}
