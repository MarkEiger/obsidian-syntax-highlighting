import {Lexer} from "./api"

function canonicalizeLexer(lexer: Lexer): string {
  const settings = Object.entries(lexer.defaultColoursMapping)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}=${JSON.stringify(val)}`)
    .join(",");
 
  const tokenize = lexer.tokenize.toString().replace(/\s+/g, " ").trim();
 
  return `name:${lexer.name}|settings:{${settings}}|tokenize:${tokenize}`;
}
 

export async function hashLexer(lexer: Lexer): Promise<string> {
  const data = new TextEncoder().encode(canonicalizeLexer(lexer));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}