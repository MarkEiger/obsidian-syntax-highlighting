import { Lexer, Token } from "../api";

export const exampleLexer: Lexer = {
    id: "core.example",
    version: 1,
    name: "example",
    requiredColours: [
        { name: "Word Red", value: "#ff0000" },
    ],
    colourMapping: {
        word: "Word Red",
    },
    tokenize(input: string): Token[]{
        const target = /color: \w+/gi;
        let match;
        const tokens: Token[] = [];
        while ((match = target.exec(input)) !== null) {
            tokens.push({
                text: match[0],
                type: "word"
            });
        }
        return tokens;
    }
}
