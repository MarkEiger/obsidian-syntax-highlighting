import { App, PluginSettingTab, Setting } from 'obsidian';
import {lexers} from "../lexing/index";
import LetterAPlugin from '../main';
import {Colour} from '../main';

// 3. The Settings Tab Class
export class LetterASettingTab extends PluginSettingTab {
	plugin: LetterAPlugin;
	private paletteExpanded = false;

	constructor(app: any, plugin: LetterAPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		// if the ai slop fails, just analyze this and write my own code
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Highlighter Settings' });

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

		// Default Colors Section
		containerEl.createEl('h2', { text: 'Default Colors' });

		const defaultColorsDiv = containerEl.createDiv();
		const colorsHeader = new Setting(defaultColorsDiv)
			.setName('Palette')
			.setDesc('Manage default colors')
			.setClass('tokens-colors-header');

		if (!this.paletteExpanded) colorsHeader.settingEl.addClass('collapsed');

		const colorsContainer = defaultColorsDiv.createDiv();
		if (!this.paletteExpanded) colorsContainer.hide();

		colorsHeader.addExtraButton((btn) => {
			btn.setIcon(this.paletteExpanded ? 'chevron-down' : 'chevron-right')
				.setTooltip(this.paletteExpanded ? 'Collapse' : 'Expand')
				.onClick(() => {
					this.paletteExpanded = !this.paletteExpanded;
					if (!this.paletteExpanded) {
						colorsContainer.hide();
						btn.setIcon('chevron-right');
						btn.setTooltip('Expand');
						colorsHeader.settingEl.addClass('collapsed');
					} else {
						colorsContainer.show();
						btn.setIcon('chevron-down');
						btn.setTooltip('Collapse');
						colorsHeader.settingEl.removeClass('collapsed');
					}
				});
		});

		this.plugin.settings.defaultColors.forEach((colorValue, index) => {
			const setting = new Setting(colorsContainer);
			setting
				// .setName(`Color ${index + 1}`)
                // TODO: user a text input to set the name of the color
                .addText((text) => {
                    text.setValue(colorValue.name).onChange(async (value) => {
                        this.plugin.settings.defaultColors[index].name = value;
                        await this.plugin.saveSettings();
                    });
					setting.nameEl.appendChild(text.inputEl);
                })
				.addColorPicker((color) => {
					color.setValue(colorValue.value).onChange(async (value) => {
						this.plugin.settings.defaultColors[index].value = value;
						await this.plugin.saveSettings();
					});
				})
				.addExtraButton((btn) => {
					btn.setIcon('trash')
						.setTooltip('Remove')
						.onClick(async () => {
							this.plugin.settings.defaultColors.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						});
				})
				.setClass('tokens-colors-element');
		});

		new Setting(colorsContainer)
			.setName('Add Color')
			.addButton((btn) => {
				btn.setButtonText('Add').onClick(async () => {
					this.plugin.settings.defaultColors.push(new Colour('New Color', '#ffffff'));
					await this.plugin.saveSettings();
					this.display();
				});
			})
			.setClass('tokens-colors-footer');

		

		// Lexer Settings Section
		containerEl.createEl('h1', { text: 'Lexers' });

		for (const lexer of lexers) {
			const lexerDiv = containerEl.createDiv();

			const header = new Setting(lexerDiv)
				.setName(lexer.getExtention())
				.setDesc(`extention for the ${lexer.getExtention()} lexer`)
				.addToggle(toggle => {
					toggle.setValue(true);
				})
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
