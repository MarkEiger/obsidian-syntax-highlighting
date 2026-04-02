import { Setting } from 'obsidian';
import { Colour } from '../main';
import { BaseSettingsTab } from './base_settings';

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

        colorsHeader.settingEl.addClass('collapsed');

        const colorsContainer = defaultColorsDiv.createDiv();
        colorsContainer.hide();

        colorsHeader.addExtraButton((btn) => {
            btn.setIcon('chevron-right').setTooltip('Expand');

            const toggle = () => {
                if (colorsContainer.isShown()) {
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
            };

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
                        btn.setIcon('trash')
                            .setTooltip('Remove')
                            .onClick(async () => {
                                plugin.settings.coloursPallete.splice(index, 1);
                                await plugin.saveSettings();
                                renderColors();
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
                    plugin.settings.coloursPallete.push(new Colour('New Color', '#ffffff'));
                    await plugin.saveSettings();
                    renderColors();
                });
            })
            .setClass('tokens-colors-footer');
    }
}