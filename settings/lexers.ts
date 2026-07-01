import { ColorComponent, DropdownComponent, Menu, Notice, Setting } from "obsidian";
import { BaseSettingsTab } from "./base_settings";
import { Colour, newColourId } from "./settings";
import { ColourNameModal, PrivatePaletteModal, RestoreDefaultsModal } from "./modals";
import { restoreLexerDefaults } from "../lexing/reconcile";
import { evaluateLexerSource, pickJsFile } from "../lexing/loader";
import { Lexer } from "../lexing/api";

export class LexerSettingsTab extends BaseSettingsTab {
	display() {
		const { containerEl, plugin } = this;
		// Lexer Settings Section
		containerEl.createEl('h2', { text: 'Lexers Settings' });

		new Setting(containerEl)
			.setName('Imported lexers')
			.setDesc('Import a .js lexer file, or reload the imported lexers folder')
			.addButton(btn => btn
				.setButtonText('Import')
				.setCta()
				.onClick(() => {
					pickJsFile(async (code, fileName) => {
						let imported: Lexer;
						try {
							imported = evaluateLexerSource(code, fileName);
						} catch (e) {
							new Notice(`${e instanceof Error ? e.message : e}`);
							return;
						}
						// same id from a different file would just be skipped at
						// load — reject here with a clear message instead
						const clash = Object.entries(plugin.lexersByUuid)
							.find(([, l]) => l.id === imported.id);
						if (clash) {
							const clashPath = plugin.lexerSourcePaths[clash[0]];
							if (!clashPath || !clashPath.endsWith(`/${fileName}`)) {
								new Notice(`Lexer id "${imported.id}" is already installed — use its Update option instead.`);
								return;
							}
						}
						await plugin.app.vault.adapter.write(`${plugin.importedLexersDir()}/${fileName}`, code);
						await plugin.loadLexers();
						this.refresh();
						new Notice(`Imported "${imported.name}" (${imported.id})`);
					});
				}))
			.addButton(btn => btn
				.setButtonText('Reload')
				.onClick(async () => {
					await plugin.loadLexers();
					this.refresh();
					new Notice('Lexers reloaded');
				}));

		for (const [uuid, lexerSettings] of Object.entries(plugin.settings.lexersSettings)){
			const lexer = plugin.lexersByUuid[uuid];
			// settings kept for a lexer that isn't currently loaded — invisible
			// until its file loads again
			if (!lexer) continue;
			const lexerDiv = containerEl.createDiv();
			const header = new Setting(lexerDiv)
				.setName(lexerSettings.extention)
				.addText(text => {
					const container = text.inputEl.parentElement;
					if (container) {
						container.prepend(createSpan({ text: 'Code-Block Extension: ' }));
					}
					text.setValue(lexerSettings.extention).onChange(async (value) => {
						const prev_value = lexerSettings.extention;
						const registered = plugin.lexers[prev_value];
						delete plugin.lexers[prev_value];
						lexerSettings.extention = value
						plugin.lexers[value] = registered;
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

			// 3-dots menu: restore defaults / view private palette
			header.addExtraButton(btn => {
				btn.setIcon('more-vertical').setTooltip('More options');
				btn.extraSettingsEl.addEventListener('click', (evt: MouseEvent) => {
					const menu = new Menu();
					menu.addItem(item => item
						.setTitle('Restore default colours')
						.setIcon('rotate-ccw')
						.onClick(() => {
							new RestoreDefaultsModal(plugin.app, lexerSettings.extention, async keepCustomColours => {
								restoreLexerDefaults(lexerSettings, lexer, keepCustomColours);
								await plugin.saveSettings();
								this.refresh();
							}).open();
						}));
					menu.addItem(item => item
						.setTitle('View private palette')
						.setIcon('palette')
						.onClick(() => {
							new PrivatePaletteModal(plugin, lexerSettings, () => this.refresh()).open();
						}));
					// imported lexers can be updated from a new .js file
					const sourcePath = plugin.lexerSourcePaths[uuid];
					if (sourcePath) {
						menu.addItem(item => item
							.setTitle('Update lexer')
							.setIcon('upload')
							.onClick(() => {
								pickJsFile(async (code, fileName) => {
									let updated: Lexer;
									try {
										updated = evaluateLexerSource(code, fileName);
									} catch (e) {
										new Notice(`${e instanceof Error ? e.message : e}`);
										return;
									}
									if (updated.id !== lexer.id) {
										new Notice(`Id mismatch: the file declares "${updated.id}" but this lexer is "${lexer.id}". To install it as a new lexer, use Import.`);
										return;
									}
									// overwrite the installed source; settings re-attach
									// by id and reconcile keeps the user's choices
									await plugin.app.vault.adapter.write(sourcePath, code);
									await plugin.loadLexers();
									this.refresh();
									new Notice(`"${lexerSettings.extention}" updated to ${updated.version !== undefined ? `v${updated.version}` : 'the new file'}`);
								});
							}));
					}
					menu.showAtMouseEvent(evt);
				});
			});

			const tokensDiv = lexerDiv.createDiv();

			header.addExtraButton((btn) => {
				const key = `lexer:${uuid}`;
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

			const palette = plugin.settings.coloursPallete;
			const pool = lexerSettings.privatePool;
			const mappings = lexerSettings.colourMappings;
			const resolve = (id: string | undefined) => plugin.resolveColour(lexerSettings, id);

			const entries = Object.entries(mappings);
			entries.forEach(([tokenType, mappedId], index) => {
				let colorComp: ColorComponent;
				let dropdownComp: DropdownComponent;
				// guards the picker's onChange against programmatic setValue() calls
				let programmatic = false;
				// handle last entry for the rounded up corners
				const cssClass = index === entries.length - 1 ? 'tokens-colors-footer' : 'tokens-colors-element';

				const current = resolve(mappedId);

				new Setting(tokensDiv)
					.setName(`${tokenType} Color`)
					.setClass(cssClass)
					.addDropdown(dropdown => {
						dropdownComp = dropdown;
						dropdown.addOption('custom', 'Custom Colour');
						// two namespaces, disambiguated by optgroups; options
						// are keyed by colour id
						const addGroup = (label: string, colours: Colour[]) => {
							if (!colours.length) return;
							const group = dropdown.selectEl.createEl('optgroup', { attr: { label } });
							for (const c of colours) {
								group.createEl('option', { value: c.id, text: c.name });
							}
						};
						addGroup('Global palette', palette);
						addGroup('Private colours', pool);

						dropdown.setValue(current ? current.id : 'custom');
						dropdown.onChange(async id => {
							if (id === 'custom') {
								// enable the picker and open it immediately; the
								// mapping only changes once the pick is named
								colorComp.setDisabled(false);
								(colorComp as any).colorPickerEl.click();
								return;
							}
							mappings[tokenType] = id;
							programmatic = true;
							colorComp.setValue(resolve(id)?.value ?? '#ffffff');
							programmatic = false;
							colorComp.setDisabled(true);
							await plugin.saveSettings();
						});
					})
					.addColorPicker(color => {
						colorComp = color;
						color
							.setValue(current?.value ?? '#ffffff')
							.setDisabled(true)
							.onChange(value => {
								// ignore programmatic setValue() (palette selection / revert)
								if (programmatic) return;
								// only react to genuine custom picks
								if (dropdownComp.getValue() !== 'custom') return;
								const previousId = mappings[tokenType];
								// name it (unique within this lexer's pool); it
								// joins the private pool, not the global palette
								new ColourNameModal(plugin.app, value, pool.map(c => c.name), async name => {
									const colour: Colour = { id: newColourId(), name, value, isCustom: true };
									pool.push(colour);
									mappings[tokenType] = colour.id;
									await plugin.saveSettings();
									this.refresh();
								}, () => {
									// cancelled: revert to the colour before the custom pick
									dropdownComp.setValue(previousId);
									programmatic = true;
									colorComp.setValue(resolve(previousId)?.value ?? '#ffffff');
									programmatic = false;
									colorComp.setDisabled(true);
								}).open();
							});
					});
			});
		};
	}
}
