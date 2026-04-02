import {ColourMapping, Lexer, LexerStaticDefaults, Token, lexers} from "../api";

export class ExampleLexer extends Lexer implements LexerStaticDefaults{
    static defaultExtension: string = "example";
    static defaultColourMappings: ColourMapping[] = [
        {tokenType: "example", color: "#ff0000"}
    ];


    tokenize(text: string): Token[] {
        const target = /\w+/gi;
        let match;
        const tokens: Token[] = [];
        while ((match = target.exec(text)) !== null) {
            tokens.push({
                text: match[0],
                type: "example"
            });
        }
        return tokens;
    }
}

lexers.push(new ExampleLexer());