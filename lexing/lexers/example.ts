import {Lexer, Token, lexers} from "../api";

export class ExampleLexer implements Lexer{
    getExtention(): string {
        return "example";
    }
    getAvailableToeknTypes(): string[] {
        return ["example"];
    }
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