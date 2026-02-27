import { PluginSettingTab, Setting } from 'obsidian';
import LetterAPlugin from '../main';
import { PaletteSettings } from './pallet';
import { LexerSettings } from './lexers';

// 3. The Settings Tab Class
export class LetterASettingTab extends PluginSettingTab {
	plugin: LetterAPlugin;

	constructor(app: any, plugin: LetterAPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Highlighter Settings' });

		// these two will have to be deleted (they are here jsut for previous testing till the code migrates to the new architecture)
		// ---------------------------------------------------------------------------------------------------
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
		// ---------------------------------------------------------------------------------------------------

		// TODO: rewrite this in a way that new Settings are easy to add
		// just like lexers are
		new PaletteSettings(this.plugin, containerEl).display();
		new LexerSettings(this.plugin, containerEl).display();
	}
}
