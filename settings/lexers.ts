import { ColorComponent, DropdownComponent, Menu, Notice, Setting } from "obsidian";
import { BaseSettingsTab } from "./base_settings";
import { Colour, DEFAULT_SHOP_URL, newColourId } from "./settings";
import { ColourNameModal, PrivatePaletteModal, RestoreDefaultsModal } from "./modals";
import { restoreLexerDefaults } from "../lexing/reconcile";
import { LEXER_ENTRY, PickedFile, evaluateLexerModules, paletteFilePath, parsePaletteSource, pickLexerFolder } from "../lexing/loader";
import { LexerMeta, fetchShopPalette, shopSourceFor } from "../lexing/shop";
import { Lexer } from "../lexing/api";
import type LetterAPlugin from "../main";

// Digest a picked lexer folder into its module map and optional palette.
// A folder with a single .js uses it as the entry whatever it's called
// (so old single-file lexers import as-is); multi-file folders need an
// index.js at the root. The palette is palette.json (or *.palette.json)
// at the root. Other files are ignored. Returns null (with a Notice) on
// a bad pick.
function splitLexerPick(files: PickedFile[]): { modules: Record<string, string>, palette?: PickedFile, meta?: PickedFile } | null {
	const jsFiles = files.filter(f => f.path.endsWith('.js'));
	if (!jsFiles.length) {
		new Notice('The selected folder contains no .js lexer modules.');
		return null;
	}
	const modules: Record<string, string> = {};
	if (jsFiles.length === 1) {
		modules[LEXER_ENTRY] = jsFiles[0].content;
	} else {
		if (!jsFiles.some(f => f.path === LEXER_ENTRY)) {
			new Notice(`A multi-file lexer needs ${LEXER_ENTRY} at the folder root as its entry.`);
			return null;
		}
		for (const f of jsFiles) modules[f.path] = f.content;
	}
	// palette.json, or the old <name>.palette.json sidecar naming. Any other
	// .json (package.json, ...) is NOT a palette — ignore it rather than
	// failing the import trying to parse it as one. meta.json is kept for
	// its defaultPalette reference (and copied into the installed folder).
	const rootJsons = files.filter(f => f.path.endsWith('.json') && !f.path.includes('/'));
	const palette = rootJsons.find(f => f.path === 'palette.json')
		?? rootJsons.find(f => f.path.endsWith('.palette.json'));
	const meta = rootJsons.find(f => f.path === 'meta.json');
	return { modules, palette, meta };
}

// The palette.json content to install with a lexer: a bundled palette wins
// (offline-safe, no shop needed); otherwise meta.json's defaultPalette id is
// resolved through the configured shop — the same shop-root-relative path
// whether the shop is the remote URL or a local checkout in the vault.
// Returns undefined (with a Notice when a reference existed) for palette-less.
async function resolvePickPalette(plugin: LetterAPlugin, pick: { palette?: PickedFile, meta?: PickedFile }): Promise<string | undefined> {
	if (pick.palette) return pick.palette.content;
	if (!pick.meta) return undefined;
	let paletteId: LexerMeta['defaultPalette'];
	try {
		paletteId = (JSON.parse(pick.meta.content) as LexerMeta).defaultPalette;
	} catch {
		new Notice('meta.json is not valid JSON — importing without a palette.');
		return undefined;
	}
	if (typeof paletteId !== 'string' || !paletteId) return undefined;
	try {
		const colours = await fetchShopPalette(shopSourceFor(plugin.settings.shopUrl, plugin.app.vault.adapter), paletteId);
		return JSON.stringify(colours, null, 2);
	} catch (e) {
		new Notice(`Palette "${paletteId}": ${e instanceof Error ? e.message : e} — importing without colours.`);
		return undefined;
	}
}

export class LexerSettingsTab extends BaseSettingsTab {
	display() {
		const { containerEl, plugin } = this;
		// Lexer Settings Section
		containerEl.createEl('h2', { text: 'Lexers Settings' });

		new Setting(containerEl)
			.setName('Lexer shop URL')
			.setDesc('Where lexers and palettes are fetched from: an https:// URL (the remote shop), or a vault-relative folder for a local shop checkout. Clearing the field resets it.')
			.addText(text => text
				.setValue(plugin.settings.shopUrl)
				.onChange(async value => {
					plugin.settings.shopUrl = value.trim() || DEFAULT_SHOP_URL;
					await plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Imported lexers')
			.setDesc('Import a lexer folder (its modules and palette.json), or reload the imported lexers folder')
			.addButton(btn => btn
				.setButtonText('Import')
				.setCta()
				.onClick(() => {
					pickLexerFolder(async files => {
						const pick = splitLexerPick(files);
						if (!pick) return;
						let imported: Lexer;
						try {
							imported = evaluateLexerModules(pick.modules, LEXER_ENTRY, 'imported lexer');
							if (pick.palette) parsePaletteSource(pick.palette.content, pick.palette.path);
						} catch (e) {
							new Notice(`${e instanceof Error ? e.message : e}`);
							return;
						}
						// same id would just be skipped at load — reject here
						// with a clear message instead
						const clash = Object.values(plugin.lexersByUuid).some(l => l.id === imported.id);
						if (clash) {
							new Notice(`Lexer id "${imported.id}" is already installed — use its Update option instead.`);
							return;
						}
						// bundled palette, or meta.json's reference resolved
						// through the shop (remote URL or local checkout)
						const paletteContent = await resolvePickPalette(plugin, pick);
						// every lexer gets its own folder, named after its id
						const folder = `${plugin.importedLexersDir()}/${imported.id.replace(/[^\w.-]/g, '_')}`;
						const adapter = plugin.app.vault.adapter;
						if (!(await adapter.exists(folder))) {
							await adapter.mkdir(folder);
						}
						for (const [name, content] of Object.entries(pick.modules)) {
							await adapter.write(`${folder}/${name}`, content);
						}
						if (paletteContent) {
							// stored as palette.json whatever the source was
							await adapter.write(paletteFilePath(folder), paletteContent);
						}
						if (pick.meta) {
							// kept for future shop features (update checks,
							// descriptions) — the loader ignores it
							await adapter.write(`${folder}/meta.json`, pick.meta.content);
						}
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
				.setName(lexer.name)
				.addText(text => {
					const container = text.inputEl.parentElement;
					if (container) {
						container.prepend(createSpan({ text: 'Code-Block Extension: ' }));
					}
					text.setValue(lexerSettings.extention);
					// commit on blur/Enter, not per keystroke — intermediate
					// values would transiently clobber other registrations
					const commit = async () => {
						const value = text.getValue().trim();
						const prev = lexerSettings.extention;
						if (value === prev) return;
						const reject = (reason: string) => {
							new Notice(reason);
							text.setValue(prev);
						};
						if (!value) return reject('Extension cannot be empty.');
						if (/\s/.test(value)) return reject('Extension must be a single word.');
						// check stored settings, not just loaded lexers — a
						// clash with an unloaded lexer would resurface on load
						const clash = Object.entries(plugin.settings.lexersSettings)
							.find(([otherUuid, ls]) => otherUuid !== uuid && ls.extention === value);
						if (clash) {
							const clashLexer = plugin.lexersByUuid[clash[0]];
							const clashName = clashLexer ? `"${clashLexer.name}"` : `id "${clash[1].lexerId}" (not loaded)`;
							return reject(`Extension "${value}" is already targeted by ${clashName}.`);
						}
						// the slot may belong to another lexer if this one lost
						// a collision at load time — only free it if it's ours
						if (plugin.lexers[prev]?.uuid === uuid) {
							delete plugin.lexers[prev];
						}
						lexerSettings.extention = value;
						plugin.lexers[value] = { lexer, uuid };
						await plugin.saveSettings();
					};
					text.inputEl.addEventListener('blur', () => { void commit(); });
					text.inputEl.addEventListener('keydown', evt => {
						if (evt.key === 'Enter') text.inputEl.blur();
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
							new RestoreDefaultsModal(plugin.app, lexer.name, async keepCustomColours => {
								restoreLexerDefaults(lexerSettings, lexer, plugin.lexerPalettes[uuid] ?? [], keepCustomColours);
								await plugin.saveSettings();
								this.refresh();
							}).open();
						}));
					menu.addItem(item => item
						.setTitle('View private palette')
						.setIcon('palette')
						.onClick(() => {
							new PrivatePaletteModal(plugin, lexerSettings, lexer.name, () => this.refresh()).open();
						}));
					// imported lexers can be updated from a new .js file
					const sourcePath = plugin.lexerSourcePaths[uuid];
					if (sourcePath) {
						menu.addItem(item => item
							.setTitle('Update lexer')
							.setIcon('upload')
							.onClick(() => {
								pickLexerFolder(async files => {
									const pick = splitLexerPick(files);
									if (!pick) return;
									let updated: Lexer;
									try {
										updated = evaluateLexerModules(pick.modules, LEXER_ENTRY, 'updated lexer');
										if (pick.palette) parsePaletteSource(pick.palette.content, pick.palette.path);
									} catch (e) {
										new Notice(`${e instanceof Error ? e.message : e}`);
										return;
									}
									if (updated.id !== lexer.id) {
										new Notice(`Id mismatch: the file declares "${updated.id}" but this lexer is "${lexer.id}". To install it as a new lexer, use Import.`);
										return;
									}
									// a new bundled palette or a (re)resolvable meta
									// reference replaces the stored palette; neither
									// present keeps the existing palette.json as-is
									const paletteContent = await resolvePickPalette(plugin, pick);
									// replace the folder's modules; settings re-attach
									// by id and reconcile keeps the user's choices. Old
									// .js files go first so a module dropped from the
									// new version can't linger and still be require'd
									const adapter = plugin.app.vault.adapter;
									for (const f of (await adapter.list(sourcePath)).files) {
										if (f.endsWith('.js')) await adapter.remove(f);
									}
									for (const [name, content] of Object.entries(pick.modules)) {
										await adapter.write(`${sourcePath}/${name}`, content);
									}
									if (paletteContent) {
										await adapter.write(paletteFilePath(sourcePath), paletteContent);
									}
									if (pick.meta) {
										await adapter.write(`${sourcePath}/meta.json`, pick.meta.content);
									}
									await plugin.loadLexers();
									this.refresh();
									new Notice(`"${lexer.name}" updated to ${updated.version !== undefined ? `v${updated.version}` : 'the new file'}`);
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
						// '' mapping = undecorated, the editor's normal text colour
						dropdown.addOption('default', 'Default (no colour)');
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

						dropdown.setValue(current ? current.id : 'default');
						dropdown.onChange(async id => {
							if (id === 'custom') {
								// enable the picker and open it immediately; the
								// mapping only changes once the pick is named
								colorComp.setDisabled(false);
								(colorComp as any).colorPickerEl.click();
								return;
							}
							mappings[tokenType] = id === 'default' ? '' : id;
							programmatic = true;
							colorComp.setValue(resolve(mappings[tokenType])?.value ?? '#ffffff');
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
									dropdownComp.setValue(resolve(previousId) ? previousId : 'default');
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
