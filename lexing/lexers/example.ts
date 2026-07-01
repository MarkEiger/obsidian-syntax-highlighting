import { default_colours } from "settings/pallet";
import { Lexer, Token } from "../api";

export const exampleLexer: Lexer = {
    name: "example",
    defaultColoursMapping:
    {
        word: default_colours[0], 
        // TODO:
        // determine how to handle colours added by plugins, maybe add:
        // addCustomColour()
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