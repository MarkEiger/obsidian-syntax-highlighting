type MyFont = {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

type TokenStyle = {
    colour: string
    font: MyFont
}

type MyTheme = {
    mapping: Record<TokenType, TokenStyle>,
}


interface _myLexer {
    name: string
    extentions: Array<string>
    themes: Record<string, MyTheme>
    current_theme: string
    getSupportedTokenTypes() : Array<TokenType>
}


/*
themes shall be immutable, i will add a theme creation tool for shits and giggles
*/