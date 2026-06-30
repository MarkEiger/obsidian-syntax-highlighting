import { default_colours } from "settings/pallet";
import {Lexer, Token, registerLexer} from "../api";;

export const exampleLexer: Lexer = {
    name: "example",
    defaultColoursMapping:
    new Map([
        ["word", default_colours[0]], 
        // determine how to handle default colours added by plugins, maybe add:
        // addCustomColour()
    ]),
    tokenize(input: string): Token[]{
        const target = /\w+/gi;
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

registerLexer(exampleLexer);