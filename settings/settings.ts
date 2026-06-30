import { PluginSettingTab, Setting } from 'obsidian';
import LetterAPlugin from '../main';
import { default_colours, PaletteSettingsTab } from './pallet';
import { LexerSettingsTab } from './lexers';


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

		const refresh = () => this.display();

		containerEl.createEl('h2', { text: 'Highlighter Settings' });
		new PaletteSettingsTab(this.plugin, containerEl, refresh).display();
		new LexerSettingsTab(this.plugin, containerEl, refresh).display();
	}
}

export type Colour = {
	name: string;
	value: string;
}

export type ColourMapping = Record<string, Colour>;

// move all this code to the apropriate filess
export class LexerSettings {
	extention: string;
	colourMappings: ColourMapping;
	enabled: boolean;
	constructor(extention: string, colourMappings: ColourMapping, enabled?: boolean){
		this.extention = extention;
		this.colourMappings = colourMappings;
		this.enabled = enabled ?? true;
	}
}

// 1. Define Settings Interface
export interface LetterAPluginSettings {
	coloursPallete: Colour[];
	lexersSettings: Record<string, LexerSettings>;
}

// there is a bug, lexers aren't initialized yet when this is created, so it is empty
export const DEFAULT_SETTINGS: LetterAPluginSettings = {
	coloursPallete: default_colours,
	lexersSettings: {}
};