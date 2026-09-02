/*
lets define the logic better
itterate over all localy existing language packs and their themes
if updating is enabled for it:
    check if their source has a newer version
    copy it to a staging folder
    validate signature
    offer to update/update automatically depending on settings

options should be:
update automatically/ask to update/manually update
*/

import * as fs from "fs/promises";
import * as path from "path";

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

interface Lexer {
    name: string
    tokenize(text: string) : Token[]
    getSupportedTokenTypes() : TokenType[]
}

class LanguagePack {
    name!: string;
	lexer!: Lexer;
	themes!: Theme[];
    origin!: StorageHandler;
}

interface Asset {
    name: string;
    version: string;
    packName: string;
    getPath() : string; 
    // for a lexer 'LanguagePacks/{this.packName}/lexer/lexer.js'
    // for a theme 'LanguagePacks/{this.packName}/themes/{this.name}.json'
}





/*
maybe store packs by origin so that same origin can be reused.


function scanForUpdates() {
    for pack in packs {
        strg = storageFactory(pack.origin)
        r_pack = strg.getPack(pack.name)
        lexer_update, theme_updates = extractUpdates(pack, r_pack)
        if lexer_update !== null {
            performUpdate(lexer_update, pack.lexerUpdates)
        }
        for theme_update in theme_updates {
            performUpdate(theme_update, pack.themesUpdate)
        }
    }
}
  
function extractUpdates(pack, r_pack) {
    var lexer_update = null;

    if shouldScan(pack.lexerUpdates) {
        lexer_update = extractUpdate(pack.lexer, r_pack.lexer)
    }

    if !shouldScan(pack.themesUpdate) {
        return lexer_update, []
    }

    return lexer_update, extractThemesUpdates(pack, r_pack);
    
}

function extractThemesUpdates(pack, r_pack) {
    themes_updates = []
    for name in r_pack.themes.keys(){
        base = name in pack.themes ? pack.themes[name] : null
        if base === null && !pack.allowNewThemes{
            continue
        }
        update = extractUpdate(base, r_pack.themes[name])
        if update !== null {
            themes_updates.append(update)
        }
    }
    return themes_updates
}

*/