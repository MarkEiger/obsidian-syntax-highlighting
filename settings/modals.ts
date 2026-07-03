import { App, Modal, Notice, Setting } from "obsidian";
import LetterAPlugin from "../main";
import { Colour, LexerSettings, newColourId } from "./settings";

// Ask for a colour name, unique (case-insensitive) among `taken`.
// Cancel = any dismissal that isn't the submit button.
export class ColourNameModal extends Modal {
	private name = '';
	private submitted = false;
	constructor(app: App, private value: string, private taken: string[], private onSubmit: (name: string) => void, private onCancel: () => void) {
		super(app);
	}
	onOpen() {
		this.titleEl.setText('Name this colour');
		new Setting(this.contentEl)
			.setName('Colour name')
			.addText(text => text
				.setPlaceholder(this.value)
				.onChange(v => this.name = v));
		const error = this.contentEl.createDiv({ cls: 'setting-item-description' });
		error.style.color = 'var(--text-error)';
		new Setting(this.contentEl)
			.addButton(btn => btn
				.setButtonText('Add')
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
		// dismissed without adding -> let the caller revert
		if (!this.submitted) this.onCancel();
	}
}

// Confirm restore-to-defaults and ask what happens to the user's custom
// private colours. Closing without choosing = cancel.
export class RestoreDefaultsModal extends Modal {
	constructor(app: App, private lexerName: string, private onRestore: (keepCustomColours: boolean) => void) {
		super(app);
	}
	onOpen() {
		this.titleEl.setText(`Restore "${this.lexerName}" colours to defaults`);
		this.contentEl.createEl('p', {
			text: 'Supplied colour values and all token mappings will be reset to the lexer\'s defaults. The global palette, the extension name and the enabled state are not touched.'
		});
		this.contentEl.createEl('p', {
			text: 'What should happen to the custom colours you added to this lexer?'
		});
		new Setting(this.contentEl)
			.addButton(btn => btn
				.setButtonText('Keep them')
				.setCta()
				.onClick(() => { this.close(); this.onRestore(true); }))
			.addButton(btn => btn
				.setButtonText('Delete them')
				.setWarning()
				.onClick(() => { this.close(); this.onRestore(false); }))
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}
	onClose() {
		this.contentEl.empty();
	}
}

// The name clashes with an existing global colour: override its value
// (keeping its id, so tokens using it follow) or add under a new name.
class CopyCollisionModal extends Modal {
	private name: string;
	constructor(app: App, existingName: string, private taken: string[], private onDone: (action: 'override' | 'rename', name?: string) => void) {
		super(app);
		this.name = existingName;
	}
	onOpen() {
		this.titleEl.setText('Name already in the global palette');
		this.contentEl.createEl('p', {
			text: `A global colour named "${this.name}" already exists. Override its value, or add this colour under a new name.`
		});
		new Setting(this.contentEl)
			.setName('New name')
			.addText(text => text
				.setValue(this.name)
				.onChange(v => this.name = v));
		const error = this.contentEl.createDiv({ cls: 'setting-item-description' });
		error.style.color = 'var(--text-error)';
		new Setting(this.contentEl)
			.addButton(btn => btn
				.setButtonText('Override existing')
				.setWarning()
				.onClick(() => { this.close(); this.onDone('override'); }))
			.addButton(btn => btn
				.setButtonText('Add with new name')
				.setCta()
				.onClick(() => {
					const name = this.name.trim();
					if (!name || this.taken.some(t => t.toLowerCase() === name.toLowerCase())) {
						error.setText(`"${name}" is already taken — pick another name or override.`);
						return;
					}
					this.close();
					this.onDone('rename', name);
				}));
	}
	onClose() {
		this.contentEl.empty();
	}
}

// A lexer's private pool: tweak values, copy colours to the global palette,
// delete unused customs. Supplied colours (isCustom false) can't be deleted
// and their names are frozen.
export class PrivatePaletteModal extends Modal {
	constructor(private plugin: LetterAPlugin, private lexerSettings: LexerSettings, private lexerName: string, private refresh: () => void) {
		super(plugin.app);
	}
	onOpen() {
		this.render();
	}
	private render() {
		const { contentEl, lexerSettings } = this;
		contentEl.empty();
		this.titleEl.setText(`"${this.lexerName}" private palette`);

		if (!lexerSettings.privatePool.length) {
			contentEl.createEl('p', { text: 'This lexer has no private colours.' });
			return;
		}
		for (const colour of lexerSettings.privatePool) {
			const row = new Setting(contentEl)
				.setName(colour.name)
				.setDesc(colour.isCustom ? 'Custom colour' : 'Supplied by the lexer');
			row.addColorPicker(picker => picker
				.setValue(colour.value)
				.onChange(async value => {
					colour.value = value;
					await this.plugin.saveSettings();
					this.refresh();
				}));
			row.addExtraButton(btn => btn
				.setIcon('copy')
				.setTooltip('Copy to global palette')
				.onClick(() => this.copyToGlobal(colour)));
			if (colour.isCustom) {
				const inUse = this.inUse(colour);
				row.addExtraButton(btn => btn
					.setIcon('trash')
					.setTooltip(inUse ? 'In use by a token type — cannot delete' : 'Delete')
					.onClick(async () => {
						// recompute: a token may have been re-coloured meanwhile
						if (this.inUse(colour)) {
							new Notice(`Cannot delete "${colour.name}": it is in use by a token type.`);
							return;
						}
						const pool = this.lexerSettings.privatePool;
						pool.splice(pool.indexOf(colour), 1);
						await this.plugin.saveSettings();
						this.refresh();
						this.render();
					}));
			}
		}
	}
	private inUse(colour: Colour): boolean {
		return Object.values(this.lexerSettings.colourMappings).includes(colour.id);
	}
	private copyToGlobal(colour: Colour) {
		const palette = this.plugin.settings.coloursPallete;
		const clash = palette.find(c => c.name.toLowerCase() === colour.name.toLowerCase());
		if (!clash) {
			palette.push({ id: newColourId(), name: colour.name, value: colour.value, isCustom: true });
			void this.plugin.saveSettings().then(() => this.refresh());
			new Notice(`"${colour.name}" added to the global palette.`);
			return;
		}
		new CopyCollisionModal(this.app, clash.name, palette.map(c => c.name), async (action, name) => {
			if (action === 'override') {
				// keep the global colour's id: tokens pointing at it follow
				clash.value = colour.value;
				new Notice(`Global "${clash.name}" updated.`);
			} else {
				palette.push({ id: newColourId(), name: name!, value: colour.value, isCustom: true });
				new Notice(`"${name}" added to the global palette.`);
			}
			await this.plugin.saveSettings();
			this.refresh();
		}).open();
	}
	onClose() {
		this.contentEl.empty();
	}
}
