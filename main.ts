import { MarkdownView, Plugin } from 'obsidian';
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
	}

	async loadLexers(){
		const presentLexersSettings: Record<string, LexerSettings> = {};
		this.lexers = {};
		this.lexersByUuid = {};
		const seenIds = new Set<string>();

		for (const lexer of lexers){
			if (seenIds.has(lexer.id)) {
				console.warn(`[lexer ${lexer.id}] duplicate lexer id — skipping`);
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

			presentLexersSettings[uuid] = lexerSettings;
			this.lexers[lexerSettings.extention] = {lexer: lexer, uuid: uuid};
			this.lexersByUuid[uuid] = lexer;
		}
		this.settings.lexersSettings = presentLexersSettings;
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
						const tokens = lexer.tokenize(textInsideCodeBlock);
						for (const token of tokens) {
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