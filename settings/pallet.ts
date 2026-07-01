import { Notice, Setting } from 'obsidian';
import { BaseSettingsTab } from './base_settings';
import { Colour, newColourId } from './settings';

export const default_colours: Colour[] = [
    {id: 'global-red', name: 'Red', value:'#ff0000', isCustom: true},
    {id: 'global-green', name: 'Green', value: '#00ff00', isCustom: true},
    {id: 'global-blue', name: 'Blue', value: '#0000ff', isCustom: true},
    {id: 'global-yellow', name: 'Yellow', value: '#ffff00', isCustom: true},
    {id: 'global-cyan', name: 'Cyan', value: '#00ffff', isCustom: true},
    {id: 'global-magenta', name: 'Magenta', value: '#ff00ff', isCustom: true}
]
export class PaletteSettingsTab extends BaseSettingsTab {
    display() {
        const { containerEl, plugin } = this;

        // Default Colors Section
        containerEl.createEl('h2', { text: 'Default Colors' });

        const defaultColorsDiv = containerEl.createDiv();
        const colorsHeader = new Setting(defaultColorsDiv)
            .setName('Palette')
            .setDesc('Manage default colors')
            .setClass('tokens-colors-header');

        const colorsContainer = defaultColorsDiv.createDiv();

        colorsHeader.addExtraButton((btn) => {
            const key = 'palette';
            const apply = (expanded: boolean) => {
                if (expanded) {
                    colorsContainer.show();
                    btn.setIcon('chevron-down').setTooltip('Collapse');
                    colorsHeader.settingEl.removeClass('collapsed');
                    plugin.expandedSections.add(key);
                } else {
                    colorsContainer.hide();
                    btn.setIcon('chevron-right').setTooltip('Expand');
                    colorsHeader.settingEl.addClass('collapsed');
                    plugin.expandedSections.delete(key);
                }
            };
            apply(plugin.expandedSections.has(key)); // restore previous state

            const toggle = () => apply(!colorsContainer.isShown());
            btn.onClick(toggle);
            colorsHeader.settingEl.addEventListener('dblclick', (event: MouseEvent) => {
					// 3. Identify the element that was clicked
					const target = event.target as HTMLElement;

					// Ignore double-clicks on inputs or toggles
					if (target.closest('input, .checkbox-container, .extra-setting-button')) {
						return;
					}
					toggle();
				}
            );
        });

        const colorListContainer = colorsContainer.createDiv();

        const renderColors = () => {
            colorListContainer.empty();
            plugin.settings.coloursPallete.forEach((colorValue, index) => {
                const setting = new Setting(colorListContainer);
                setting
                    .addText((text) => {
                        text.setValue(colorValue.name).onChange(async (value) => {
                            plugin.settings.coloursPallete[index].name = value;
                            await plugin.saveSettings();
                        });
                        setting.nameEl.appendChild(text.inputEl);
                    })
                    .addColorPicker((color) => {
                        color.setValue(colorValue.value).onChange(async (value) => {
                            plugin.settings.coloursPallete[index].value = value;
                            await plugin.saveSettings();
                        });
                    })
                    .addExtraButton((btn) => {
                        const inUse = this.colourInUse(colorValue);
                        btn.setIcon('trash')
                            .setTooltip(!colorValue.isCustom ? 'Supplied colours cannot be deleted'
                                : inUse ? 'In use by a token type — cannot delete' : 'Remove')
                            .onClick(async () => {
                                if (!colorValue.isCustom) {
                                    new Notice(`Cannot delete "${colorValue.name}": it is supplied by a lexer.`);
                                    return;
                                }
                                // recompute: a token may have been re-coloured since render
                                if (this.colourInUse(colorValue)) {
                                    new Notice(`Cannot delete "${colorValue.name}": it is in use by a token type.`);
                                    return;
                                }
                                plugin.settings.coloursPallete.splice(index, 1);
                                await plugin.saveSettings();
                                this.refresh();
                            });
                    })
                    .setClass('tokens-colors-element');
            });
        };

        renderColors();

        new Setting(colorsContainer)
            .setName('Add Color')
            .addButton((btn) => {
                btn.setButtonText('Add').onClick(async () => {
                    plugin.settings.coloursPallete.push({id: newColourId(), name:'New Color', value:'#ffffff', isCustom: true});
                    await plugin.saveSettings();
                    this.refresh();
                });
            })
            .setClass('tokens-colors-footer');
    }

    // a colour is "in use" if any lexer's token mapping references its id.
    // Includes disabled lexers.
    private colourInUse(colour: Colour): boolean {
        return Object.values(this.plugin.settings.lexersSettings).some(ls =>
            Object.values(ls.colourMappings).includes(colour.id));
    }
}