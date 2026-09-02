interface StorageHandler {
    path: string
    getLanguagePack(name: string) : LanguagePack;
    getLexer(path: string) : Lexer
    getTheme(path: string) : Theme
}



