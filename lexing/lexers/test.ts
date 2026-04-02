import {Lexer, Token, lexers, ColourMapping, LexerStaticDefaults} from "../api";

export class TestLexer extends Lexer implements LexerStaticDefaults{
    static defaultExtension: string = "test";
    static defaultColourMappings: ColourMapping[] = [
        {tokenType: "test", color: "#ff0000"},
        {tokenType: "test2", color: "#00ff00"}
    ];


    tokenize(text: string): Token[] {
        const target = /\w+/gi;
        let match;
        const tokens: Token[] = [];
        while ((match = target.exec(text)) !== null) {
            tokens.push({
                text: match[0],
                type: "test"
            });
        }
        return tokens;
    }
}

lexers.push(new TestLexer());