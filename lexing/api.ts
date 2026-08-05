export class Token{
	text: string
	type: string
	constructor(text: string, type: string){
		this.text = text;
		this.type = type;
	}
}

// one entry of the palette shipped alongside a lexer (<lexer>.palette.json);
// becomes an entry in the lexer's private pool (with a plugin-minted id) on
// first load. Names are frozen once shipped — they are the reconciliation
// key across updates.
export type PaletteColour = {
	name: string;
	value: string;
}

export interface Lexer {
	// stable, namespaced identity (e.g. 'core.example', 'alfred.nasm').
	// Must stay constant across versions — it's how a user's stored settings
	// re-attach to this lexer after an update.
	readonly id: string;
	// display name shown in the settings UI — immutable and independent of
	// the extension the lexer targets
	readonly name: string;
	// default code-block tag (the ```tag fence), seeded on first install;
	// the user can re-target it in settings. Falls back to name when omitted.
	readonly defaultExtension?: string;
	// bump when the declared contract changes (token types / palette)
	readonly version?: number;
	// tokenType -> name of a colour in the palette shipped alongside the
	// lexer (unmapped or unresolvable token types fall back to the default
	// colour at render time)
	readonly colourMapping: Readonly<Record<string, string>>;
	tokenize(input: string): Token[];
}

// a built-in lexer and the palette it ships with (file lexers get theirs
// from the <lexer>.palette.json sidecar instead)
export type BuiltinLexer = { lexer: Lexer, palette: PaletteColour[] };

export var lexers: BuiltinLexer[] = []

export async function registerLexer(lexer: Lexer, palette: PaletteColour[] = []){
	lexers.push({ lexer, palette })
}
