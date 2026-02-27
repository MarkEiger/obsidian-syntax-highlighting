import { Setting } from "obsidian";
import { lexers } from "../lexing/index";
import { BaseSettings } from "./base_settings";

export class LexerSettings extends BaseSettings {
	display() {
		const { containerEl } = this;
		// Lexer Settings Section
		containerEl.createEl('h1', { text: 'Lexers' });

		for (const lexer of lexers) {
			const lexerDiv = containerEl.createDiv();

			const header = new Setting(lexerDiv)
				.setName(lexer.getExtention())
				.setDesc(`extention for the ${lexer.getExtention()} lexer`)
				.addToggle(toggle => {
					toggle.setValue(true);
					// TODO: check wether false is ever set, cause code looks wierd
				})
				.setClass('tokens-colors-header');

			header.settingEl.addClass('collapsed');

			const tokensDiv = lexerDiv.createDiv();
			tokensDiv.hide();

			header.addExtraButton((btn) => {
				btn.setIcon('chevron-right').setTooltip('Expand');

				const toggle = () => {
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
				};

				btn.onClick(toggle);
				header.settingEl.addEventListener('dblclick', toggle);
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