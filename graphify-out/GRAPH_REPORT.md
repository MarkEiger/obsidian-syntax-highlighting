# Graph Report - .  (2026-07-03)

## Corpus Check
- Corpus is ~12,395 words - fits in a single context window. You may not need a graph.

## Summary
- 187 nodes · 276 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.78)
- Token cost: 20,242 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Compiled Plugin Bundle|Compiled Plugin Bundle]]
- [[_COMMUNITY_Lexer Engine & Registration|Lexer Engine & Registration]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Settings Modals|Settings Modals]]
- [[_COMMUNITY_Colour Palette Settings|Colour Palette Settings]]
- [[_COMMUNITY_NASM Lexer|NASM Lexer]]
- [[_COMMUNITY_Plugin Core Lifecycle|Plugin Core Lifecycle]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Plugin Manifest|Plugin Manifest]]
- [[_COMMUNITY_Roadmap TODOs|Roadmap TODOs]]
- [[_COMMUNITY_Lexer API Typings|Lexer API Typings]]

## God Nodes (most connected - your core abstractions)
1. `LetterAPlugin` - 19 edges
2. `compilerOptions` - 11 edges
3. `classifyLine()` - 10 edges
4. `loadLexers()` - 8 edges
5. `PrivatePaletteModal` - 8 edges
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
- **Shareable Lexer and Colour Store Ecosystem** — todos_lexer_store_mechanism, todos_custom_colour_import_export, todos_obsidian_plugin_store_model, todos_lexer_authoring_documentation [INFERRED 0.85]

## Communities (13 total, 1 thin omitted)

### Community 0 - "Compiled Plugin Bundle"
Cohesion: 0.12
Nodes (22): buildEditorExtension(), copyToGlobal(), defaultMappings(), evaluateLexerSource(), flushSettings(), importedLexersDir(), inUse(), loadLexers() (+14 more)

### Community 1 - "Lexer Engine & Registration"
Cohesion: 0.12
Nodes (16): DeclaredColour, Lexer, Token, index, evaluateLexerSource(), FileLexer, pickJsFile(), validateLexerShape() (+8 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.08
Nodes (23): author, description, devDependencies, builtin-modules, codemirror, @codemirror/language, @codemirror/state, @codemirror/view (+15 more)

### Community 3 - "Settings Modals"
Cohesion: 0.11
Nodes (5): ColourNameModal, CopyCollisionModal, PrivatePaletteModal, RestoreDefaultsModal, LexerSettings

### Community 4 - "Colour Palette Settings"
Cohesion: 0.18
Nodes (9): BaseSettingsTab, LexerSettingsTab, default_colours, PaletteSettingsTab, Colour, ColourMapping, DEFAULT_SETTINGS, LetterAPluginSettings (+1 more)

### Community 5 - "NASM Lexer"
Cohesion: 0.23
Nodes (15): ARITY, baseMnemonic(), classifyLine(), DATA_DIRECTIVES, DIRECTIVES, EXTRA, isDirectiveWord(), isPureHex() (+7 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, baseUrl, importHelpers, inlineSourceMap, inlineSources, lib, module (+4 more)

### Community 8 - "Plugin Manifest"
Cohesion: 0.22
Nodes (8): author, authorUrl, description, id, isDesktopOnly, minAppVersion, name, version

### Community 9 - "Roadmap TODOs"
Cohesion: 0.25
Nodes (8): Colour Import Conflict Rename Prompt, Custom Colour Import/Export, Lexer Authoring Documentation and Publish, Lexer Extension Conflict Prevention, Lexer Store Mechanism, Obsidian Plugin Store Distribution Model, Fix pwndbg Lexer, Gitignore and Build Releases

### Community 10 - "Lexer API Typings"
Cohesion: 0.40
Nodes (3): DeclaredColour, Lexer, Token

## Knowledge Gaps
- **56 isolated node(s):** `Token`, `DeclaredColour`, `ARITY`, `EXTRA`, `DeclaredColour` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LetterAPlugin` connect `Plugin Core Lifecycle` to `Lexer Engine & Registration`, `Settings Modals`, `Colour Palette Settings`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `reconcileLexerSettings()` connect `Compiled Plugin Bundle` to `Plugin Core Lifecycle`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `evaluateLexerSource()` connect `Compiled Plugin Bundle` to `Plugin Core Lifecycle`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `Token`, `DeclaredColour`, `ARITY` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Compiled Plugin Bundle` be split into smaller, more focused modules?**
  _Cohesion score 0.12315270935960591 - nodes in this community are weakly interconnected._
- **Should `Lexer Engine & Registration` be split into smaller, more focused modules?**
  _Cohesion score 0.1168091168091168 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._