export class Token{
	text: string
	type: string
	constructor(text: string, type: string){
		this.text = text;
		this.type = type;
	}
}

// a colour as declared by a lexer author; becomes an entry in the lexer's
// private pool (with a plugin-minted id) on first load
export type DeclaredColour = {
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
	// bump when the declared contract changes (token types / colours)
	readonly version?: number;
	// every colour this lexer uses — names are frozen once shipped, they are
	// the reconciliation key across updates
	readonly requiredColours: readonly DeclaredColour[];
	// tokenType -> name of a colour declared in requiredColours
	readonly colourMapping: Readonly<Record<string, string>>;
	tokenize(input: string): Token[];
}

export var lexers: Lexer[] = []

export async function registerLexer(lexer: Lexer){
	lexers.push(lexer)
}
