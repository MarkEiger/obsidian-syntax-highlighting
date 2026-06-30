import { App, ColorComponent, DropdownComponent, Modal, Setting } from "obsidian";
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
			
			const tokensDiv = lexerDiv.createDiv();

			header.addExtraButton((btn) => {
				const key = `lexer:${hash}`;
				const apply = (expanded: boolean) => {
					if (expanded) {
						tokensDiv.show();
						btn.setIcon('chevron-down').setTooltip('Collapse');
						header.settingEl.removeClass('collapsed');
						plugin.expandedSections.add(key);
					} else {
						tokensDiv.hide();
						btn.setIcon('chevron-right').setTooltip('Expand');
						header.settingEl.addClass('collapsed');
						plugin.expandedSections.delete(key);
					}
				};
				apply(plugin.expandedSections.has(key)); // restore previous state

				const toggle = () => apply(!tokensDiv.isShown());
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
				let dropdownComp: DropdownComponent;
				// guards the picker's onChange against programmatic setValue() calls
				let programmatic = false;
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
						dropdownComp = dropdown;
							dropdown.addOption('custom', 'Custom Color');
						dropdown.setValue(isCustom ? 'custom' : colour.value);
						dropdown.onChange(async value => {
							if (value === 'custom') {
								// enable the picker and open it immediately
								colorComp.setDisabled(false);
								(colorComp as any).colorPickerEl.click();
							} else {
								const picked = palette.find(c => c.value === value)!;
								mappings[tokenType] = { name: picked.name, value: picked.value };
								programmatic = true;
								colorComp.setValue(picked.value);
								programmatic = false;
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
								// ignore programmatic setValue() (palette selection / revert)
								if (programmatic) return;
								// only react to genuine custom picks
								if (dropdownComp.getValue() !== 'custom') return;
								// remember the colour active before this custom pick, so we
								// can roll back if the user dismisses the naming modal
								const previous = mappings[tokenType];
								const prevIsCustom = !palette.some(c => c.value === previous.value);
								mappings[tokenType] = { name: 'custom', value: value };
								await this.plugin.saveSettings();
								// ask for a (unique) name and add the colour to the palette
								const taken = palette.map(c => c.name);
								new ColourNameModal(this.plugin.app, value, taken, async name => {
									const colour = { name, value };
									this.plugin.settings.coloursPallete.push(colour);
									mappings[tokenType] = colour;
									await this.plugin.saveSettings();
									// re-render so the new colour shows in the palette tab
									// and in every token dropdown
									this.refresh();
								}, async () => {
									// cancelled: revert to the previous colour
									mappings[tokenType] = previous;
									dropdownComp.setValue(prevIsCustom ? 'custom' : previous.value);
									programmatic = true;
									colorComp.setValue(previous.value);
									programmatic = false;
									colorComp.setDisabled(!prevIsCustom);
									await this.plugin.saveSettings();
								}).open();
							});
					});
			};
		};
	}
}

class ColourNameModal extends Modal {
	private name = '';
	private submitted = false;
	constructor(app: App, private value: string, private taken: string[], private onSubmit: (name: string) => void, private onCancel: () => void) {
		super(app);
	}
	onOpen() {
		this.titleEl.setText('Name this colour');
		new Setting(this.contentEl)
			.setName('Palette name')
			.addText(text => text
				.setPlaceholder(this.value)
				.onChange(v => this.name = v));
		const error = this.contentEl.createDiv({ cls: 'setting-item-description' });
		error.style.color = 'var(--text-error)';
		new Setting(this.contentEl)
			.addButton(btn => btn
				.setButtonText('Add to palette')
				.setCta()
				.onClick(() => {
					const name = this.name.trim() || this.value;
					if (this.taken.some(t => t.toLowerCase() === name.toLowerCase())) {
						error.setText(`A colour named "${name}" already exists.`);
						return;
					}
					this.submitted = true;
					this.close();
					this.onSubmit(name);
				}));
	}
	onClose() {
		this.contentEl.empty();
		// dismissed without adding to the palette -> let the caller revert
		if (!this.submitted) this.onCancel();
	}
}