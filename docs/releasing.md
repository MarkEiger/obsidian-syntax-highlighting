# Building a release

The repo ships no lexers and no vault state (`data.json`, `imported_lexers/`
are gitignored) — a release is just the compiled plugin. Lexers are
distributed separately through the lexer shop (see `adding-a-lexer.md`).

## Steps

1. **Bump the version** in `manifest.json` (semver, e.g. `1.1.0`). If the
   plugin now needs a newer Obsidian API, bump `minAppVersion` too.

2. **Build:**

   ```sh
   npm install     # first time only
   npm run build   # typechecks, then bundles main.ts -> main.js
   ```

3. **Tag and publish a GitHub release.** The release tag must be exactly the
   version from `manifest.json`, with no `v` prefix (Obsidian's convention):

   ```sh
   git tag 1.1.0
   git push origin 1.1.0
   ```

4. **Attach the release artifacts** to the GitHub release:
   - `main.js`
   - `manifest.json`
   - `styles.css`

   These three files are what a user drops into
   `<vault>/.obsidian/plugins/obsidian-highlight-a-in-a/` to install manually.

## What never ships

- `data.json` — the user's live settings (palette, lexer mappings).
- `imported_lexers/` — the user's installed lexers; they come from the shop
  or manual import, never from the plugin release.
