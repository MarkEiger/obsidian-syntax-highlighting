import { lexers } from "../api";
import { exampleLexer } from "./example";

/*
To add a new lexer:
  1. define it in this directory as an export (see example.ts)
  2. import it above
  3. push it below
That's the only file you need to touch — main.ts stays untouched.
*/
lexers.push(exampleLexer);
