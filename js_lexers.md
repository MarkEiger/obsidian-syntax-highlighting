# JS Lexers

How to write and ship a lexer as a plain JavaScript file — no build step, no
recompiling the plugin. Drop a file in the lexers folder and it becomes a
language.

> Note: it's a **JS file, not JSON**, because `tokenize` is a function. The rest
> of the object is JSON-shaped data.

---

## Where lexers live

```
.obsidian/plugins/obsidian-syntax-highlighting/lexers/*.js
```

The plugin scans this folder on load (and when you run the **Reload lexers**
command). Each `.js` file contributes one lexer.

---

## The file format

A lexer file exports a single object via CommonJS:

```js
module.exports = {
  // Stable, author-declared identity. Namespaced (reverse-DNS or author/name)
  // so it stays unique across authors. This is the key that travels across
  // versions — keep it constant between releases so updates can find the
  // installed lexer. See "Identity" and "Updates" below.
  id: 'alfred.python',

  // Bump when the lexer's contract changes (new/removed token types, changed
  // colour defaults). Drives update migrations and colour re-seeding.
  version: 1,

  // display name + default code-block tag (the ```python fence).
  // The user can rename the targeted extension later in settings.
  name: 'python',

  // EVERY colour this lexer uses. These become the lexer's PRIVATE pool —
  // namespaced to this lexer, they never pollute the user's global palette
  // (the user can promote one via "copy to global palette"). Names are
  // frozen once shipped: they are the reconciliation key across updates.
  requiredColours: [
    { name: 'Keyword Blue', value: '#569cd6' },
    { name: 'String Green', value: '#6a9955' },
  ],

  // token type -> the NAME of a colour declared above in requiredColours.
  // (Only requiredColours — global palette colours are renamable, so they
  // can't be referenced by name from a lexer.) Every token `type` your
  // tokenizer emits should have an entry here (unmapped types fall back to
  // the default colour).
  colourMapping: {
    keyword: 'Keyword Blue',
    string:  'String Green',
  },

  // (input: string) => Array<{ text: string, type: string }>
  // `type` must match a key in colourMapping.
  tokenize(input) {
    const tokens = [];
    // ... your lexing logic ...
    // tokens.push({ text: 'def', type: 'keyword' });
    return tokens;
  },
};
```

### Fields

| Field             | Who writes it | Purpose |
|-------------------|---------------|---------|
| `id`              | author | Stable, namespaced identity. The match key for installs/updates. |
| `version`         | author | Integer; bump on contract changes to trigger migrations. |
| `name`            | author | Display name and default code-block tag. Editable per-vault in settings. |
| `requiredColours` | author | `{ name, value }[]` — every colour the lexer uses; becomes its private pool. Names frozen. |
| `colourMapping`   | author | `{ [tokenType]: requiredColourName }` — default colour for each token type. |
| `tokenize`        | author | `(input) => Token[]`, where `Token = { text, type }`. |

A `Token` is just a plain object: `{ text: string, type: string }`. No class or
import needed.

---

## Identity: declared `id` vs internal UUID

There are **two** identifiers, and keeping them separate is what makes updates
work without losing the user's settings.

- **`id` (in the file, written by the author).** A stable, namespaced string
  like `alfred.python`. It stays constant across versions, so it's how the
  plugin recognizes "this new file is a newer release of an already-installed
  lexer." It travels *with* the file.

- **UUID (in plugin data, written by the plugin — never in the file).** The
  internal primary key for the user's settings (colour customizations, renamed
  extension, enabled flag). Auto-minted with `crypto.randomUUID()` on first
  install. Guaranteed injective even if two authors collide on the same `id`.

The plugin keeps a small mapping internally:

```
uuid  ->  { id, version, sourcePath }
```

Why the UUID lives in plugin data and **not** in the file: an update *replaces*
the file, so anything stored in the file would be lost on update. The UUID has
to outlive the file's contents, so it lives in plugin storage and is looked up
by the file's stable `id`.

### Rules

- **Keep `id` constant across releases.** Changing it makes the plugin treat the
  lexer as brand new and orphans the user's settings.
- **Namespace it** (reverse-DNS `com.alfred.python`, or `alfred/python`) so it
  stays unique across authors. The loader warns on a collision and the internal
  UUID still keeps colliding lexers separate, but auto-update can't tell which
  one to update.
- **To fork**, change the `id`. Same logical `id` = treated as the same lexer
  (an update that overwrites), so a fork needs its own id.

---

## Updates

When the maintainer ships a new version and the user pulls it (manual overwrite,
`git pull` of the lexers folder, or a future in-plugin updater), the file's
contents change but its `id` stays the same. The plugin does **match-then-rebind**:

1. **First install** — no stored mapping has this `id` → mint a UUID, record
   `uuid -> { id, version, sourcePath }`, seed colours from `requiredColours` /
   `colourMapping`.
2. **Update** — an installed lexer already has this `id` → **keep its existing
   UUID**, swap in the new `tokenize` / `name` / colours, then:
   - run colour **reconciliation** (below), and
   - if `version` increased, run any migrations.

Because every `LexerSettings` entry is keyed by the UUID — which never
changed — the user's renamed extension, enabled state, and colour choices all
survive the update automatically. The plugin only replaced the behavior, not the
identity.

A future in-plugin updater can add a `source` / `updateUrl` field to the file,
compare the remote `version` against the installed one, fetch, and replace —
matching on `id` downstream exactly as above.

---

## How colours bind (and reconcile on update)

Each stored colour carries a plugin-minted **id**; token mappings are stored as
`tokenType → colourId`, so renames and recolours never break the link. Supplied
colours (`isCustom: false`) keep their author-given name frozen — that name is
how the stored colour re-attaches to your declaration.

On load (install *or* update), for each lexer:

1. **Reconcile the private pool** — declared colours already in the pool (by
   frozen name) keep their id and the user's tweaked value; newly declared
   names are added with fresh ids; dropped names are removed unless a token
   still points at them. The user's custom private colours are untouched.
2. **Reconcile the mapping** — for each token type in `colourMapping`:
   - if the user already customized that token type, keep their choice;
   - otherwise seed it from `colourMapping` (resolved within the private pool).

So updating a lexer to add a new token type adds it with a sensible default,
while preserving everything the user customized. Token types you remove simply
stop being used. "Restore default colours" (in the lexer's ⋮ menu) resets
supplied colour values and all token mappings back to your declaration.

---

## Loading rules & constraints

- **CommonJS only.** Use `module.exports = {...}`. ESM `export default` / `import`
  syntax won't parse.
- **One file, one (or more) lexers.** Export a single object as above. (If
  multi-lexer files are supported later, that'll be documented here.)
- **Reload** with the **Reload lexers** command after editing a file — files in
  the plugin folder don't fire automatic file-change events.
- **Failure is isolated.** A file that throws on load is skipped (with a notice);
  a `tokenize` that throws at runtime disables highlighting for that block but
  never crashes the editor. Beyond that, correctness of a lexer is the author's
  and installer's responsibility — install lexers you trust.

---

## Minimal example

```js
module.exports = {
  id: 'alfred.shout',
  version: 1,
  name: 'shout',
  requiredColours: [{ name: 'Loud Red', value: '#ff3333' }],
  colourMapping: { word: 'Loud Red' },
  tokenize(input) {
    const tokens = [];
    for (const m of input.matchAll(/[A-Z]{2,}/g)) {
      tokens.push({ text: m[0], type: 'word' });
    }
    return tokens;
  },
};
```

Drop this in `.obsidian/plugins/obsidian-syntax-highlighting/lexers/shout.js`,
run **Reload lexers**, and ```shout fenced blocks will highlight all-caps words
in red.
