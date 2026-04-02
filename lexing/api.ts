export class Token{
	text: string
	type: string
}

export class ColourMapping{
	tokenType: string;
	color: string;
}

// Interface for the static properties that subclasses must provide
export interface LexerStaticDefaults {
    readonly defaultExtension: string;
    readonly defaultColourMappings: ColourMapping[];
	tokenize(text: string): Token[];
}

export abstract class Lexer{
	extension: string; // the name of the code block extension this lexer is for, e.g. "a" for ```a
	defaultExtension: string // Renamed for consistency and clarity
	enabled: boolean;
	colourMappings: ColourMapping[];
	defaultColourMappings: ColourMapping[];

	constructor(
		defaultExtension?: string,
		enabled? : boolean,
		extension?: string,
		colourMappings?: ColourMapping[],
	) {
		console.log("Initializing lexer with:", defaultExtension, enabled, extension, colourMappings);
		let targeet_lexer: LexerStaticDefaults;
		if (!defaultExtension) {
			const subclass = this.constructor as any as LexerStaticDefaults; // Type assertion to access static properties
			targeet_lexer = subclass;
		}
		else {
			for (const lexer of lexers) {
				if (lexer.defaultExtension === defaultExtension) {
					targeet_lexer = lexer as any as LexerStaticDefaults;
					break;
				}
			}
		}

		if (!targeet_lexer) {
			throw new Error(`Lexer with default extension "${defaultExtension}" not found.`);
		}
		console.log("Target lexer found:", targeet_lexer.defaultExtension);


		// todo: remove all this bollox, lexeer shouldn't have tokenize funttion
		// just add filename and load the implementation from there
		
		this.tokenize = targeet_lexer.tokenize;
		this.defaultExtension = targeet_lexer.defaultExtension;
		this.defaultColourMappings = targeet_lexer.defaultColourMappings;

		this.extension = extension ?? this.defaultExtension;
		this.colourMappings = colourMappings ?? this.defaultColourMappings;
		this.enabled = enabled ?? true
	}
	
	abstract tokenize(text: string): Token[]; // the main function, takes the text inside the code block and returns a list of tokens with their types, which will be used to create the decorations
}

export let lexers: Lexer[] = [];