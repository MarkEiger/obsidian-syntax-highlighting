import { lexers } from "../api";

/*
Built-in lexers register here:
  1. define one in this directory as an export
  2. import it above
  3. lexers.push(...) it below
That's the only file you need to touch — main.ts stays untouched.

(none currently — lexers ship via imported_lexers/*.js, see js_lexers.md)
*/
void lexers;
