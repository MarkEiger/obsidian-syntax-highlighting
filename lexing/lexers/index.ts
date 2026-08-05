import { lexers } from "../api";

/*
Built-in lexers register here:
  1. define one in this directory as an export
  2. import it above
  3. lexers.push({ lexer, palette }) it below — palette is the colour set it
     ships with (what a file lexer would put in its .palette.json sidecar)
That's the only file you need to touch — main.ts stays untouched.

(none currently — lexers ship via imported_lexers/*.js and the lexer shop,
see docs/adding-a-lexer.md)
*/
void lexers;
