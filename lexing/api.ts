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

export let lexers: Map<string, Lexer> = new Map<string, Lexer>();

export function registerLexer(lexer: Lexer){
	if (lexers.has(lexer.name))  {
		throw new Error(`A lexer named ${lexer.name} already exists`);
	}
	lexers.set(lexer.name, lexer);
}
// TODO: make getLexer for cleaner code

var settingsMap: Map<string, LexerSettings> = new Map<string, LexerSettings>()
var lexersMap: Map<string, Lexer> = new Map<string, Lexer>()

export async function registerLexerNew(lexer: Lexer){
	const hash: string = await hashLexer(lexer);
	let extention: string
	if (!settingsMap.has(hash)) {
		settingsMap.set(hash, new LexerSettings(lexer.name, lexer.defaultColoursMapping))
	}
	extention = settingsMap.get(hash)!.extention;
	lexersMap.set(extention, lexer);
}