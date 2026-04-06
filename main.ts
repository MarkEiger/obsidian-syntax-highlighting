import { Plugin, PluginSettingTab, Setting, ColorComponent, DropdownComponent } from 'obsidian';
import { Extension, RangeSetBuilder } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';

import { LetterASettingTab } from 'settings/settings';
import { Lexer } from 'lexing/api';
import { lexers } from 'lexing';


export class Colour{
	name: string;
	value: string;
	constructor(name: string, value: string) {
		this.name = name;
		this.value = value;
	}
}

// 1. Define Settings Interface
interface LetterAPluginSettings {
	highlightColor: string;
	codeExtension: string; // Future setting for code block extension (e.g., "a")
	coloursPallete: Colour[];
	lexers: Lexer[];
}

// there is a bug, lexers aren't initialized yet when this is created, so it is empty
const DEFAULT_SETTINGS: LetterAPluginSettings = {
	highlightColor: '#ff0000', // Default Red
	codeExtension: 'customCode', // Default code block extension to look for
	coloursPallete: [
		new Colour('Red', '#ff0000'),
		new Colour('Green', '#00ff00'),
		new Colour('Blue', '#0000ff'),
		new Colour('Yellow', '#ffff00'),
		new Colour('Cyan', '#00ffff'),
		new Colour('Magenta', '#ff00ff')
	],
	lexers: lexers // TODO: complicate this a little, instead of just taking the lexers from the array, 
	// create new instances of them here, to be able to set their default value unless they are serialzied from data.json
};

// 2. The Main Plugin Class
export default class LetterAPlugin extends Plugin {
	settings: LetterAPluginSettings;

	dropdowns: DropdownComponent[]

	async onload() {
		await this.loadSettings();

		// Register the Editor Extension
		this.registerEditorExtension(this.buildEditorExtension());

		// Add the Settings Tab
		this.addSettingTab(new LetterASettingTab(this.app, this));

		// Apply the initial color to the CSS variable
		this.updateColorStyle();
	}

	async loadSettings() {
		console.log("loading data")
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		console.log("Saving settings:", this.settings);
		await this.saveData(this.settings);
		this.updateColorStyle();
		// Force a refresh of the editor to apply new colors immediately
		this.app.workspace.updateOptions();
	}

	updateColorStyle() {
		// We set a CSS variable on the body so the CSS file can use it
		document.body.style.setProperty('--letter-a-highlight-color', this.settings.highlightColor);
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
						constructor(text: string) {
							super();
							this.text = text;
						}
						toDOM(view: EditorView): HTMLElement {
							const span = document.createElement("span");
							span.textContent = this.text;
							span.className = "letter-a-highlight";
							return span;
						}
					}

					for (const { from, to } of view.visibleRanges) {
						const file_text = view.state.sliceDoc(from, to);
						const code_extention = plugin.settings.codeExtension;
						const code_block_regex = new RegExp(`(\`\`\`${code_extention}\n)([\\s\\S]*?)(\`\`\`)`, 'gmi');
						const HEADER_ID = 1;
						const BLOCK_TEXT_ID = 2;
						const FOOTER_ID = 3;
						let code_block;
						while ((code_block = code_block_regex.exec(file_text)) !== null) {
							const start_of_code_block = from + code_block.index + code_block[HEADER_ID].length; // Position of the start of the text inside the code block
							const textInsideCodeBlock = code_block[BLOCK_TEXT_ID]; // The second capture group contains the text inside the code block
							const target_regex = /ab/gi;
							let match;
							while ((match = target_regex.exec(textInsideCodeBlock)) !== null) {
								const match_content = match[0];
								const matchPos = start_of_code_block + match.index;
								// TOOD: maybe separate it and colour 
								// it letter by letter to prevent bugs
								for (let i = 0; i < match_content.length; i++) {
									const replaceDecoration = Decoration.replace({
										widget: new BWidget(match_content[i]),
									});
									builder.add(matchPos + i, matchPos + i + 1, replaceDecoration);
								}
							}
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