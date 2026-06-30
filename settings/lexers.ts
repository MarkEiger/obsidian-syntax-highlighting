import { ColorComponent, Setting } from "obsidian";
import { BaseSettingsTab } from "./base_settings";

export class LexerSettingsTab extends BaseSettingsTab {
	display() {
		const { containerEl, plugin } = this;
		// Lexer Settings Section
		containerEl.createEl('h2', { text: 'Lexers Settings' });

		for (const [hash, lexerSettings] of Object.entries(plugin.settings.lexersSettings)){
			const lexerDiv = containerEl.createDiv();
			const header = new Setting(lexerDiv)
				.setName(lexerSettings.extention)			
				.addText(text => {
					const container = text.inputEl.parentElement;
					if (container) {
						container.prepend(createSpan({ text: 'Code-Block Extension: ' }));
					}
					text.setValue(lexerSettings.extention).onChange(async (value) => {
						// TODO: update the second hashmap so that it know it changed
						const prev_value = lexerSettings.extention;
						const lexer = plugin.lexers[prev_value]; 
						delete plugin.lexers[prev_value];
						lexerSettings.extention = value
						plugin.lexers[value] = lexer;
						await plugin.saveSettings();
					});
				})
				.addToggle(toggle => {
					toggle.setValue(lexerSettings.enabled).onChange(async value => {
						lexerSettings.enabled = value;
						await this.plugin.saveSettings();
					});
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

			const palette = this.plugin.settings.coloursPallete;
			const mappings = lexerSettings.colourMappings;
			const entries = Object.entries(mappings);
			const count: number = entries.length;
			let index = 0;
			for (const [tokenType, colour] of entries){
				let colorComp: ColorComponent;
				// handle last entry for the rounded up corners
				let cssClass = index === count - 1 ? 'tokens-colors-footer' : 'tokens-colors-element';
				index++;

				const isCustom = !palette.some(c => c.value === colour.value);

				new Setting(tokensDiv)
					.setName(`${tokenType} Color`)
					.setClass(cssClass)
					.addDropdown(dropdown => {
						for (const option of palette) {
							dropdown.addOption(option.value, option.name);
						}
						dropdown.addOption('custom', 'Custom Color');
						dropdown.setValue(isCustom ? 'custom' : colour.value);
						dropdown.onChange(async value => {
							if (value === 'custom') {
								// let the user pick any colour with the picker
								colorComp.setDisabled(false);
							} else {
								const picked = palette.find(c => c.value === value)!;
								mappings[tokenType] = { name: picked.name, value: picked.value };
								colorComp.setValue(picked.value);
								colorComp.setDisabled(true);
							}
							await this.plugin.saveSettings();
						});
					})
					.addColorPicker(color => {
						colorComp = color;
						color
							.setValue(colour.value)
							.setDisabled(!isCustom)
							.onChange(async value => {
								mappings[tokenType] = { name: 'custom', value: value };
								await this.plugin.saveSettings();
							});
					});
			};
		};
	}
}