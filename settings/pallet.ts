import { Setting } from 'obsidian';
import { Colour } from '../main';
import { BaseSettings } from './base_settings';

export class PaletteSettings extends BaseSettings {
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
            colorsHeader.settingEl.addEventListener('dblclick', toggle);
        });

        const colorListContainer = colorsContainer.createDiv();

        const renderColors = () => {
            colorListContainer.empty();
            plugin.settings.defaultColors.forEach((colorValue, index) => {
                const setting = new Setting(colorListContainer);
                setting
                    .addText((text) => {
                        text.setValue(colorValue.name).onChange(async (value) => {
                            plugin.settings.defaultColors[index].name = value;
                            await plugin.saveSettings();
                        });
                        setting.nameEl.appendChild(text.inputEl);
                    })
                    .addColorPicker((color) => {
                        color.setValue(colorValue.value).onChange(async (value) => {
                            plugin.settings.defaultColors[index].value = value;
                            await plugin.saveSettings();
                        });
                    })
                    .addExtraButton((btn) => {
                        btn.setIcon('trash')
                            .setTooltip('Remove')
                            .onClick(async () => {
                                plugin.settings.defaultColors.splice(index, 1);
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
                    plugin.settings.defaultColors.push(new Colour('New Color', '#ffffff'));
                    await plugin.saveSettings();
                    renderColors();
                });
            })
            .setClass('tokens-colors-footer');
    }
}