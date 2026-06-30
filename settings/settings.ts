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

		containerEl.createEl('h2', { text: 'Highlighter Settings' });
		// TODO: rewrite this in a way that new Settings are easy to add
		// just like lexers are
		new PaletteSettingsTab(this.plugin, containerEl).display();
		new LexerSettingsTab(this.plugin, containerEl).display();
	}
}

export class Colour{
	name: string;
	value: string;
	constructor(name: string, value: string) {
		this.name = name;
		this.value = value;
	}
}

export type ColourMapping = Map<string, Colour>;

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
	lexers: Map<string, LexerSettings>;
}

// there is a bug, lexers aren't initialized yet when this is created, so it is empty
export const DEFAULT_SETTINGS: LetterAPluginSettings = {
	coloursPallete: default_colours,
	lexers: new Map<string, LexerSettings>()
};