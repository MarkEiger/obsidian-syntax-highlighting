import { ColorComponent, Setting } from "obsidian";
import { BaseSettingsTab } from "./base_settings";
import { ColourMapping } from "lexing/api";

export class LexerSettingsTab extends BaseSettingsTab {
	display() {
		const { containerEl, plugin } = this;
		// Lexer Settings Section
		containerEl.createEl('h2', { text: 'Lexers Settings' });

		// take example from this
		// plugin.settings.coloursPallete.forEach((colorValue, index) => {

		plugin.settings.lexers.forEach((lexer, index) => {
			const lexerDiv = containerEl.createDiv();
			const header = new Setting(lexerDiv)
				.setName(lexer.extension)			
				.addText(text => {
					const container = text.inputEl.parentElement;
					if (container) {
						container.prepend(createSpan({ text: 'Code-Block Extension: ' }));
					}
					text.setValue(lexer.extension).onChange(async (value) => {
						plugin.settings.lexers[index].extension = value
						await plugin.saveSettings();
					});
				})
				.addToggle(toggle => {
					toggle.setValue(lexer.enabled).onChange(async value => {
						plugin.settings.lexers[index].enabled = value;
						await this.plugin.saveSettings();
					});
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
				header.settingEl.addEventListener('dblclick', (event: MouseEvent) => {
					// 3. Identify the element that was clicked
					const target = event.target as HTMLElement;

					// Ignore double-clicks on inputs or toggles
					if (target.closest('input, .checkbox-container, .extra-setting-button')) {
						return;
					}
					toggle();
				});
			});

			let mappings: ColourMapping[] = lexer.colourMappings
			mappings.forEach((mapping, index) => {
				let colorComp: ColorComponent;
				let cssClass = 'tokens-colors-element';
				if (index === mappings.length - 1){
					cssClass = 'tokens-colors-footer';
				}
				new Setting(tokensDiv)
					.setName(`${mapping.tokenType} Color`)
					.setClass(cssClass)
					.addDropdown(dropdown => {
						for (const option of this.plugin.settings.coloursPallete) {
							dropdown.addOption(option.value, option.name);
						}
						dropdown.addOption('custom', 'Custom Color');
						dropdown.setValue(mapping.color);
						dropdown.onChange(async value => {
							lexer.colourMappings[index].color = value;
							colorComp.setValue(value);
							await this.plugin.saveSettings();
						});
					})
					.addColorPicker(color => {
						colorComp = color;
						color
						.setValue(mapping.color)
						.setDisabled(true)
					});
			});
		});
	}
}