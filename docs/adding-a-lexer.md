# Writing and publishing a lexer

Every lexer is a **folder**:

```
imported_lexers/
  yourname.mylang/
    index.js         <- the entry module; its exports are the Lexer
    palette.json     <- the palette it ships with
    tables.js        <- any other modules, pulled in with require()
    lib/scan.js      <- subfolders work too
```

The folder name is the lexer's id (the Import dialog creates it for you).

## The modules

Plain CommonJS, evaluated in a sandbox: each module sees `module`,
`exports`, and `require` — and nothing else. No Obsidian API, no node
built-ins. `require` takes **relative paths only** and cannot reach outside
the lexer's folder; circular requires get standard CommonJS semantics
(you receive the partially-built exports). Split a big lexer however you
like — mnemonic tables in one file, the scanner in another.

The plugin writes type stubs to `imported_lexers/lexer-api.d.ts` so the
entry gets autocomplete:

```js
// index.js
/** @type {import('../lexer-api').Lexer} */
module.exports = {
  // stable namespaced identity — NEVER change between versions; it's how a
  // user's stored settings re-attach to your lexer after an update
  id: 'yourname.mylang',

  // display name shown in settings — independent of the extension
  name: 'MyLang',

  // default code-block tag: ```mylang fences (user can re-target in settings)
  defaultExtension: 'mylang',

  // bump when token types or the palette change
  version: 1,

  // token type -> the NAME of a colour in palette.json
  colourMapping: {
    keyword: 'My Keyword Blue',
    comment: 'My Comment Grey',
  },

  // the whole point: split input into typed tokens. Token types not in
  // colourMapping fall back to the default colour.
  tokenize(input) {
    const { scan } = require('./lib/scan');
    return scan(input);
  },
};
```

## The palette

`palette.json` — a JSON array of `{ name, value }`:

```json
[
  { "name": "My Keyword Blue",  "value": "#8be9fd" },
  { "name": "My Comment Grey",  "value": "#6272a4" }
]
```

Rules:

- **Names are frozen once shipped.** They are the reconciliation key across
  updates: the user's custom colour values and token re-mappings survive a
  lexer update because colours match by name. Renaming a colour is the same
  as deleting it and adding a new one.
- On first install the palette seeds the lexer's **private pool**; the user
  can tweak values, add custom colours, or copy colours to the global
  palette from there. A missing or broken palette doesn't block the lexer —
  its tokens just render in the default colour.

## Testing locally

1. Settings → Lexers Settings → **Import** — pick your lexer's **folder**.
   A folder with a single `.js` uses it as the entry whatever it's called
   (so old single-file lexers import as-is); multi-file folders need an
   `index.js` at the root. Extra files are ignored. Or create the folder
   under `imported_lexers/` by hand and hit **Reload** (or the "Reload
   lexers" command).
2. Open a note with a fenced block tagged with your extension.
3. Iterate with the lexer's **Update lexer** option (3-dots menu) — it
   replaces the folder's modules (dropped files are cleaned up) and keeps
   the palette unless you pick a new one; settings re-attach by `id` and
   the user's choices are reconciled, not reset.

Note: two lexers cannot target the same extension. The first one loaded
keeps it; the other stays visible in settings but inactive until one of
them is re-targeted.

## Publishing to the shop

The lexer shop is not live yet. The plan: a separate repository serving an
index of lexers, each entry being one lexer folder (modules + palette),
browsable and installable from inside the plugin, like Obsidian's community
plugins. The plugin already carries the shop's base URL as a setting
(Settings → Lexers Settings → "Lexer shop URL") with a placeholder default.

Until the shop exists, share the folder directly — anyone can install it
via Import or by dropping it into `imported_lexers/`.
