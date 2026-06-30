import { hashLexer  } from "./hashLexer";
import { Colour } from "settings/settings";
import { LexerSettings } from "settings/settings";

export class Token{
	text: string
	type: string
	constructor(text: string, type: string){
		this.text = text;
		this.type = type;
	}
}

export interface Lexer {
  readonly name: string;
  readonly defaultColoursMapping: Map<string, Colour>;
  tokenize(input: string): Token[];
}
// export var lexersMap: Map<string, Lexer> = new Map<string, Lexer>()
export var lexers: Lexer[] = []

export async function registerLexerNew(lexer: Lexer){
	lexers.push(lexer)
}