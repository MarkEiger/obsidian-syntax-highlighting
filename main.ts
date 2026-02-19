import { Plugin, PluginSettingTab, Setting, ColorComponent } from 'obsidian';
import { Extension, RangeSetBuilder } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';

import {lexers} from "./lexing/index";

// 1. Define Settings Interface
interface LetterAPluginSettings {
	highlightColor: string;
	codeExtension: string; // Future setting for code block extension (e.g., "a")
}

const DEFAULT_SETTINGS: LetterAPluginSettings = {
	highlightColor: '#ff0000', // Default Red
	codeExtension: 'customCode', // Default code block extension to look for
};

// 2. The Main Plugin Class
export default class LetterAPlugin extends Plugin {
	settings: LetterAPluginSettings;

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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
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
							/*  
							1) start by cororing the entire code block (keeping original text)
							2) make the colouring affect only the inside, excluding the ```code_extension and ``` parts
							3) make the colouring affect only a certain regex pattern (e.g., only the letter "a" inside the code block)

							todo:
							4) make said regex pattern customizable via settings (e.g., only the letter "a" or any other pattern)
							5) think of to implement an entire lexing in this fasion, since a word might fit multiple regexes
							my options are:
							- itterate over every word and offer it to each regex, first taker gets it (this works for nasm but genrally sucks)
							- require a lexer to be written by each fork, and only export the names of tokens and their colours to the settings

							the second option is better, but i still need to think of all of what it requires from me to make it as simple as possible for the lexer
							so it wont need to be aware of my api, and not do the painting, but rather that would be me doing it\
							i guess i'll do some reading on lexers

							i quess the output imma take from the lexer is gonna be a list of token and their types
							the matching between type and colour will be exported to the user to be able to customize

							so all i need the lexer to define is as follows:
							a list of tokens to be displayed in the settings, i.e static class member
							tokenize() function
							*/


							const start_of_code_block = from + code_block.index + code_block[HEADER_ID].length; // Position of the start of the text inside the code block
							const textInsideCodeBlock = code_block[BLOCK_TEXT_ID]; // The second capture group contains the text inside the code block
							const target_regex = /\w+/gi;
							let match;
							while ((match = target_regex.exec(textInsideCodeBlock)) !== null) {
								const match_content = match[0];
								const matchPos = start_of_code_block + match.index;
								const replaceDecoration = Decoration.replace({
									widget: new BWidget(match_content),
								});
								builder.add(matchPos, matchPos + match_content.length, replaceDecoration);

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

// 3. The Settings Tab Class
class LetterASettingTab extends PluginSettingTab {
	plugin: LetterAPlugin;

	constructor(app: any, plugin: LetterAPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		// if the ai slop fails, just analyze this and write my own code
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Letter "a" Highlighter Settings' });

		new Setting(containerEl) // Highlight Color Setting
			.setName('Highlight Color')
			.setDesc('Choose the color for the letter "a" inside "a" code blocks.')
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.highlightColor)
					.onChange(async (value) => {
						this.plugin.settings.highlightColor = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl) // Code Extension Setting
			.setName('Code Extension')
			.setDesc('The code block extension to look for. (regex syntax)')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.codeExtension)
					.onChange(async (value) => {
						this.plugin.settings.codeExtension = value;
						await this.plugin.saveSettings();
					})
			);


		

		// Lexer Settings Section
		containerEl.createEl('h1', { text: 'Lexers' });

		for (const lexer of lexers) {
			const lexerDiv = containerEl.createDiv();

			const header = new Setting(lexerDiv)
				.setName(lexer.getExtention())
				.setDesc(`extention for the ${lexer.getExtention()} lexer`)
				.addText((text) =>{})
				.setClass('tokens-colors-header');

			header.settingEl.addClass('collapsed');

			const tokensDiv = lexerDiv.createDiv();
			tokensDiv.hide();

			header.addExtraButton((btn) => {
				btn.setIcon('chevron-right')
					.setTooltip('Expand')
					.onClick(() => {
						if (tokensDiv.isShown()) {
							tokensDiv.hide();
							btn.setIcon('chevron-right');
							btn.setTooltip('Expand');
							header.settingEl.addClass('collapsed');
						} else {
							tokensDiv.show();
							btn.setIcon('chevron-down');
							btn.setTooltip('Collapse');
							header.settingEl.removeClass('collapsed');
						}
					});
			});

			let tokens = lexer.getAvailableToeknTypes();
			if (tokens.length === 0) continue;

			const last_token = tokens[tokens.length - 1];
			// TODO: verufy there are tokens
			tokens = tokens.slice(0, -1); // remove the last token since it will be used as the header for the section of the tokens colors, and i dont want it to be colored like the rest of the tokens
			
			// Token Color Settings
			for (const token of tokens) {
				new Setting(tokensDiv)
					.setName(`${token} Color`)
					.addColorPicker((color) => color.setValue('#ff0000'))
					.setClass('tokens-colors-element');
			}
			new Setting(tokensDiv)
				.setName(`${last_token} Color`)
				.addColorPicker((color) => color.setValue('#ff0000'))
				.setClass('tokens-colors-footer');
		}
	}
}
