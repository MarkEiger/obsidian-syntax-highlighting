import { MarkdownView, Notice, Plugin } from 'obsidian';
import { Extension, RangeSetBuilder, StateEffect } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';

import { LetterASettingTab, LexerSettings } from 'settings/settings';
import { LetterAPluginSettings, DEFAULT_SETTINGS, Colour } from 'settings/settings';
import { Lexer, lexers } from 'lexing/api';
import { validateLexer, seedLexerSettings, reconcileLexerSettings } from 'lexing/reconcile';
import { FileLexer, IMPORTED_LEXERS_DIR, LEXER_API_DTS, evaluateLexerSource } from 'lexing/loader';
import { default_colours } from 'settings/pallet';
import 'lexing';

type RegisteredLexer = {lexer: Lexer, uuid: string};
type LexersMap = Record<string, RegisteredLexer>;

// Dispatched to every editor when settings change, so the ViewPlugin
// re-runs buildDecorations even though the document hasn't changed.
export const refreshHighlight = StateEffect.define<null>();
// 2. The Main Plugin Class
export default class LetterAPlugin extends Plugin {
	settings: LetterAPluginSettings = DEFAULT_SETTINGS;
	lexers: LexersMap =  {}          // keyed by code-block extension (render path)
	lexersByUuid: Record<string, Lexer> = {}  // keyed by settings uuid (settings path)
	// source file of each imported lexer, keyed by settings uuid (built-ins absent)
	lexerSourcePaths: Record<string, string> = {}
	// transient (not persisted) — which settings sections are expanded, so a
	// re-render of the settings pane preserves the user's open/closed sections
	expandedSections: Set<string> = new Set();

	async onload() {
		await this.loadSettings();

		await this.loadLexers();

		// Register the Editor Extension
		this.registerEditorExtension(this.buildEditorExtension());

		// Add the Settings Tab
		this.addSettingTab(new LetterASettingTab(this.app, this));

		this.addCommand({
			id: 'reload-lexers',
			name: 'Reload lexers',
			callback: async () => {
				await this.loadLexers();
				new Notice('Lexers reloaded');
			},
		});
	}

	importedLexersDir(): string {
		return `${this.manifest.dir}/${IMPORTED_LEXERS_DIR}`;
	}

	// scan imported_lexers/*.js; a file that fails to load is skipped with a
	// notice and its stored settings stay untouched until it loads again
	async scanFileLexers(): Promise<FileLexer[]> {
		const adapter = this.app.vault.adapter;
		const dir = this.importedLexersDir();
		if (!(await adapter.exists(dir))) {
			await adapter.mkdir(dir);
		}
		// keep the dev-time type stubs in sync with the installed plugin
		await adapter.write(`${dir}/lexer-api.d.ts`, LEXER_API_DTS);

		const fileLexers: FileLexer[] = [];
		for (const path of (await adapter.list(dir)).files) {
			if (!path.endsWith('.js')) continue;
			try {
				const code = await adapter.read(path);
				fileLexers.push({ lexer: evaluateLexerSource(code, path), path });
			} catch (e) {
				console.warn('[lexer file]', e);
				new Notice(`Failed to load lexer: ${e instanceof Error ? e.message : e}`);
			}
		}
		return fileLexers;
	}

	async loadLexers(){
		this.lexers = {};
		this.lexersByUuid = {};
		this.lexerSourcePaths = {};
		const seenIds = new Set<string>();

		const fileLexers = await this.scanFileLexers();
		const allLexers: { lexer: Lexer, path?: string }[] = [
			...lexers.map(lexer => ({ lexer })),
			...fileLexers,
		];

		for (const { lexer, path } of allLexers){
			if (seenIds.has(lexer.id)) {
				console.warn(`[lexer ${lexer.id}] duplicate lexer id — skipping ${path ?? '(built-in)'}`);
				new Notice(`Lexer id "${lexer.id}" is already in use — skipping ${path ?? 'a duplicate'}.`);
				continue;
			}
			seenIds.add(lexer.id);
			for (const warning of validateLexer(lexer)) {
				console.warn(`[lexer ${lexer.id}] ${warning}`);
			}

			// stored settings re-attach by the lexer's declared id; the uuid
			// (the settings key) is minted once and survives lexer updates
			const existing = Object.entries(this.settings.lexersSettings)
				.find(([, ls]) => ls.lexerId === lexer.id);
			const uuid = existing?.[0] ?? crypto.randomUUID();
			let lexerSettings = existing?.[1];
			if (lexerSettings) {
				reconcileLexerSettings(lexerSettings, lexer);
			} else {
				lexerSettings = seedLexerSettings(lexer);
			}

			// settings of lexers that failed to load / were removed stay in
			// lexersSettings untouched — they re-attach by id when back
			this.settings.lexersSettings[uuid] = lexerSettings;
			this.lexers[lexerSettings.extention] = {lexer: lexer, uuid: uuid};
			this.lexersByUuid[uuid] = lexer;
			if (path) {
				this.lexerSourcePaths[uuid] = path;
			}
		}
		await this.saveSettings();
	}

	// resolve a token mapping's colour id against the global palette and the
	// owning lexer's private pool (scope is derived, not stored)
	resolveColour(lexerSettings: LexerSettings, colourId: string | undefined): Colour | undefined {
		if (!colourId) return undefined;
		return this.settings.coloursPallete.find(c => c.id === colourId)
			?? lexerSettings.privatePool.find(c => c.id === colourId);
	}

	async loadSettings() {
		console.log("loading data")
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// on a fresh install coloursPallete IS the module-level default_colours
		// array — clone it so palette edits can't mutate the seed/fallback
		this.settings.coloursPallete = this.settings.coloursPallete.map(c => ({ ...c }));
	}

	async saveSettings() {
		console.log("Saving settings:", this.settings);
		await this.saveData(this.settings);
		// Force a refresh of the editors to apply the new settings immediately
		this.refreshEditors();
	}

	refreshEditors() {
		this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
			const view = leaf.view as MarkdownView;
			// editor.cm is the underlying CM6 EditorView (not in the public typings)
			const cm = (view.editor as any)?.cm as EditorView | undefined;
			cm?.dispatch({ effects: refreshHighlight.of(null) });
		});
	}

	buildEditorExtension(): Extension {
		const plugin = this;
		return ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = this.buildDecorations(view);
				}

				update(update: ViewUpdate) {
					if (
						update.docChanged ||
						update.viewportChanged ||
						update.transactions.some(tr =>
							tr.effects.some(e => e.is(refreshHighlight)))
					) {
						this.decorations = this.buildDecorations(update.view);
					}
				}

				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();
					class BWidget extends WidgetType {
						text: string;
						colour: Colour;
						constructor(text: string, colour: Colour) {
							super();
							this.text = text;
							this.colour = colour
						}
						toDOM(view: EditorView): HTMLElement {
							const span = document.createElement("span");
							span.textContent = this.text;
							span.style.color = this.colour.value;
							span.style.fontWeight = "bold"; // todo:maybe give controll to lexer
							return span;
						}
					}

					const file_text = view.state.doc.toString();
					const code_block_regex2 = new RegExp(`(\`\`\`(\\w+)\n)([\\s\\S]*?)(\`\`\`)`, 'gmi');

					let code_block;
					while ((code_block = code_block_regex2.exec(file_text))!==null) {
						const HEADER_ID = 1;
						const EXTENTION_ID = 2;
						const BLOCK_TEXT_ID = 3;
						const FOOTER_ID = 4;
						const registered: RegisteredLexer | undefined = plugin.lexers[code_block[EXTENTION_ID]];
						if (!registered){
							continue;
						}

						const lexer: Lexer = registered.lexer;
						const lexerSettings: LexerSettings = plugin.settings.lexersSettings[registered.uuid];
						if (!lexerSettings.enabled){
							continue;
						}

						const start_of_code_block = code_block.index + code_block[HEADER_ID].length; // Position of the start of the text inside the code block
						const textInsideCodeBlock = code_block[BLOCK_TEXT_ID]; // The second capture group contains the text inside the code block
						console.log("found code block: " + textInsideCodeBlock);
						let last_index = 0;
						// a broken lexer must not take down the whole document
						let tokens;
						try {
							tokens = lexer.tokenize(textInsideCodeBlock);
						} catch (e) {
							console.warn(`[lexer ${lexer.id}] tokenize threw:`, e);
							continue;
						}
						for (const token of tokens) {
							if (!token || typeof token.text !== 'string' || typeof token.type !== 'string') {
								console.warn(`[lexer ${lexer.id}] skipping malformed token`, token);
								continue;
							}
							console.log('token found ' + token.text + " token type: " + token.type)
							const relevant_part = textInsideCodeBlock.slice(last_index)
							const token_index = relevant_part.indexOf(token.text)

							for (let i = 0; i < token.text.length; i++) {
								const colour: Colour = plugin.resolveColour(lexerSettings, lexerSettings.colourMappings[token.type]) ?? default_colours[0];
								const replaceDecoration = Decoration.replace({
									widget: new BWidget(relevant_part[token_index + i], colour),
								});
								const matchPos = start_of_code_block + last_index + token_index
								builder.add(matchPos + i, matchPos + i + 1, replaceDecoration);
							}
							last_index += token_index + token.text.length;
						}
					}

					return builder.finish();
				}
			},
			{
				decorations: (v) => v.decorations,
			}
		);
	}
}