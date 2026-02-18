export class Token{
	text: string
	type: string
}

export interface Lexer{
	getExtention(): string; // returns the  name under which it will apear in the settings menu
	getAvailableToeknTypes(): string[]; // used to create the sttings menu
	tokenize(text: string): Token[]; // the main function, takes the text inside the code block and returns a list of tokens with their types, which will be used to create the decorations
}

export let lexers: Lexer[] = [];