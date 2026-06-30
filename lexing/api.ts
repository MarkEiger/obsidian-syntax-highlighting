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
  readonly defaultColoursMapping: Record<string, Colour>;
  tokenize(input: string): Token[];
}

export var lexers: Lexer[] = []

export async function registerLexer(lexer: Lexer){
	lexers.push(lexer)
}