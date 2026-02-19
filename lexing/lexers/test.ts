import {Lexer, Token, lexers} from "../api";

export class TestLexer implements Lexer{
    getExtention(): string {
        return "test";
    }
    getAvailableToeknTypes(): string[] {
        return ["test", "test2"];
    }
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