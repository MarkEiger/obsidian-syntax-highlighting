# Graph Report - .  (2026-07-03)

## Corpus Check
- Corpus is ~11,433 words - fits in a single context window. You may not need a graph.

## Summary
- 181 nodes · 266 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.78)
- Token cost: 19,656 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Compiled Plugin Bundle|Compiled Plugin Bundle]]
- [[_COMMUNITY_Lexer API & Loading Pipeline|Lexer API & Loading Pipeline]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Settings Modals|Settings Modals]]
- [[_COMMUNITY_NASM Lexer|NASM Lexer]]
- [[_COMMUNITY_Settings Tabs & Palette|Settings Tabs & Palette]]
- [[_COMMUNITY_LetterAPlugin Core|LetterAPlugin Core]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Plugin Manifest|Plugin Manifest]]
- [[_COMMUNITY_Roadmap & TODOs|Roadmap & TODOs]]
- [[_COMMUNITY_Lexer API Type Declarations|Lexer API Type Declarations]]

## God Nodes (most connected - your core abstractions)
1. `LetterAPlugin` - 17 edges
2. `compilerOptions` - 11 edges
3. `classifyLine()` - 10 edges
4. `PrivatePaletteModal` - 8 edges
5. `loadLexers()` - 7 edges
6. `Colour` - 7 edges
7. `BaseSettingsTab` - 6 edges
8. `Lexer` - 5 edges
9. `reconcileLexerSettings()` - 5 edges
10. `ColourNameModal` - 5 edges

## Surprising Connections (you probably didn't know these)
- `LetterASettingTab` --references--> `LetterAPlugin`  [EXTRACTED]
  settings/settings.ts → main.ts
- `LexerSettingsTab` --inherits--> `BaseSettingsTab`  [EXTRACTED]
  settings/lexers.ts → settings/base_settings.ts
- `PaletteSettingsTab` --inherits--> `BaseSettingsTab`  [EXTRACTED]
  settings/pallet.ts → settings/base_settings.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shareable Extension Ecosystem (Store, Colours, Docs)** — todos_lexer_store_mechanism, todos_custom_colour_import_export, todos_lexer_authoring_documentation [INFERRED 0.75]

## Communities (13 total, 1 thin omitted)

### Community 0 - "Compiled Plugin Bundle"
Cohesion: 0.13
Nodes (20): buildEditorExtension(), copyToGlobal(), defaultMappings(), evaluateLexerSource(), importedLexersDir(), inUse(), loadLexers(), loadSettings() (+12 more)

### Community 1 - "Lexer API & Loading Pipeline"
Cohesion: 0.12
Nodes (15): DeclaredColour, Lexer, Token, index, evaluateLexerSource(), FileLexer, pickJsFile(), validateLexerShape() (+7 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.08
Nodes (23): author, description, devDependencies, builtin-modules, codemirror, @codemirror/language, @codemirror/state, @codemirror/view (+15 more)

### Community 3 - "Settings Modals"
Cohesion: 0.11
Nodes (7): ColourNameModal, CopyCollisionModal, PrivatePaletteModal, RestoreDefaultsModal, Colour, LexerSettings, newColourId()

### Community 4 - "NASM Lexer"
Cohesion: 0.23
Nodes (15): ARITY, baseMnemonic(), classifyLine(), DATA_DIRECTIVES, DIRECTIVES, EXTRA, isDirectiveWord(), isPureHex() (+7 more)

### Community 5 - "Settings Tabs & Palette"
Cohesion: 0.20
Nodes (7): BaseSettingsTab, LexerSettingsTab, default_colours, PaletteSettingsTab, ColourMapping, DEFAULT_SETTINGS, LetterAPluginSettings

### Community 7 - "TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, baseUrl, importHelpers, inlineSourceMap, inlineSources, lib, module (+4 more)

### Community 8 - "Plugin Manifest"
Cohesion: 0.22
Nodes (8): author, authorUrl, description, id, isDesktopOnly, minAppVersion, name, version

### Community 9 - "Roadmap & TODOs"
Cohesion: 0.29
Nodes (7): Colour Name Conflict Rename Popup, Custom Colour Import/Export and Sharing, Add Gitignore and Build Releases, Documentation on How to Add a Lexer, Lexer Store Mechanism, Lexers Kept in Separate Branch, Obsidian Plugin Store Browsing Model

### Community 10 - "Lexer API Type Declarations"
Cohesion: 0.40
Nodes (3): DeclaredColour, Lexer, Token

## Knowledge Gaps
- **55 isolated node(s):** `Token`, `DeclaredColour`, `ARITY`, `EXTRA`, `DeclaredColour` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LetterAPlugin` connect `LetterAPlugin Core` to `Lexer API & Loading Pipeline`, `Settings Modals`, `Settings Tabs & Palette`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Why does `reconcileLexerSettings()` connect `Compiled Plugin Bundle` to `LetterAPlugin Core`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `evaluateLexerSource()` connect `Compiled Plugin Bundle` to `LetterAPlugin Core`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `Token`, `DeclaredColour`, `ARITY` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Compiled Plugin Bundle` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._
- **Should `Lexer API & Loading Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.12307692307692308 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._