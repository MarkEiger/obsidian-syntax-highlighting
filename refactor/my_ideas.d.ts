type TokenType = string;

type Token = {
    type: TokenType;
    value: string;
}

type MyFont = {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

type TokenStyle = {
    colour: string
    font?: MyFont
}

type Theme = {
    name: string
    mapping: Record<TokenType, TokenStyle>
}

interface ExtentionManager {
    extentions: string[]
    getExtentions() : string[]
    addExtention(extention: string) : void
    removeExtention(extention: string) : void
    modifyExtention(previous: string, replacement: string) : void
}

interface ThemesManager {
    current_theme: string
    themes: Record<string, Theme>
    getCurrentTheme() : Theme
    getAvailableThemes() : string[]
    selectTheme() : void
    addTheme(theme: Theme) : void
}

interface Lexer {
    name: string
    tokenize(text: string) : Token[]
    getSupportedTokenTypes() : TokenType[]
}

export class Highlighter {
    lexer: Lexer;
    themesManager: ThemesManager;
    extentionsManager: ExtentionManager;
    // source: SourceEntry;
}

// lets define folder structure first

/*
fodler structure:
.obsidian/plugins/this-plugin/
    LanguagePacks/
        LanguagePack1/
            lexer/
                lexer.js
            themes
                **.json
*/

/*
i also need to solve how to allow updates, i.e give a stable identity
*/



export class JSInput {
    name: string
    version: string
    pubkey: string
    signature: string
    defaultExtantions: string[]
    defaultTheme? : string
    tokenize(text: string) : Token[]
}

export type Sources = {
    git: string;
    folder: string;
}


export function createHighlighterFromFolder(path: string) : Highlighter
// this needs to get the lexer from there, and create the managers from the supplied data


/*
themes shall be immutable, i will add a theme creation tool for shits and giggles
lets make a todolist to actually get a proper code and be able to play with it.

1) define exactly how the settings shall look
2) define the lexer class
3) define the settings class
4) write an implementation for the settings
5) write the wrapper for the general wrapper
6) implement a basic lexer for tests
7) create the theme creation tool.


*/