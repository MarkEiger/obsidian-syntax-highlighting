import { Plugin } from 'obsidian';
import { Extension, RangeSetBuilder } from '@codemirror/state';
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
import { hashLexer } from 'lexing/hashLexer';
import { default_colours } from 'settings/pallet';
import 'lexing';

type LexerWithHash = {lexer: Lexer, hash: string};
type LexersMap = Record<string, LexerWithHash>;
// 2. The Main Plugin Class
export default class LetterAPlugin extends Plugin {
	settings: LetterAPluginSettings = DEFAULT_SETTINGS;
	lexers: LexersMap =  {}

	async onload() {
		await this.loadSettings();

		await this.loadLexers();

		// Register the Editor Extension
		this.registerEditorExtension(this.buildEditorExtension());

		// Add the Settings Tab
		this.addSettingTab(new LetterASettingTab(this.app, this));
	}

	async loadLexers(){
		for (const lexer of lexers){
			const hash = await hashLexer(lexer);
			let lexerSettings: LexerSettings = this.settings.lexersSettings[hash];
			if (!lexerSettings)
			{
				lexerSettings = new LexerSettings(lexer.name, lexer.defaultColoursMapping)
				this.settings.lexersSettings[hash] = lexerSettings
			}
			this.lexers[lexerSettings.extention] = {lexer: lexer, hash: hash};
		}
	}

	async loadSettings() {
		console.log("loading data")
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		console.log("Saving settings:", this.settings);
		await this.saveData(this.settings);
		// Force a refresh of the editor to apply new colors immediately
		this.app.workspace.updateOptions();
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
					if (update.docChanged || update.viewportChanged) {
						this.decorations = this.buildDecorations(update.view);
					}
				}

				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();

					// Define a widget that displays "b"
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
						const lexerWithHash: LexerWithHash | undefined = plugin.lexers[code_block[EXTENTION_ID]];
						if (!lexerWithHash){
							continue;
						}

						const lexer: Lexer = lexerWithHash.lexer;
						const lexerSettings: LexerSettings = plugin.settings.lexersSettings[lexerWithHash.hash];
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
								const colour: Colour = lexerSettings.colourMappings[token.type] ?? default_colours[0];
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