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
	// stable unique id — token mappings reference colours by id, never by
	// name or value, so renames and recolours don't break the link
	id: string;
	name: string;
	value: string;
	// true  = user-created: renamable, deletable while unused
	// false = supplied by a lexer: name frozen (it's the reconciliation key
	//         against the lexer's declaration), cannot be deleted
	isCustom: boolean;
}

export function newColourId(): string {
	return crypto.randomUUID();
}

// tokenType -> colour id (resolved against the global palette + the
// owning lexer's private pool)
export type ColourMapping = Record<string, string>;

// move all this code to the apropriate filess
export class LexerSettings {
	// the lexer's declared id — how stored settings re-attach to a
	// (possibly updated) lexer across loads
	lexerId: string;
	extention: string;
	enabled: boolean;
	// this lexer's namespaced colours: supplied ones (isCustom false)
	// plus the user's custom picks (isCustom true)
	privatePool: Colour[];
	colourMappings: ColourMapping;
	constructor(lexerId: string, extention: string, privatePool: Colour[], colourMappings: ColourMapping, enabled?: boolean){
		this.lexerId = lexerId;
		this.extention = extention;
		this.privatePool = privatePool;
		this.colourMappings = colourMappings;
		this.enabled = enabled ?? true;
	}
}

// base URL of the lexer shop (raw content root) — a placeholder until the
// remote shop exists; the user can change it in settings
export const DEFAULT_SHOP_URL = 'https://raw.githubusercontent.com/mark/obsidian-lexer-shop/main';

// 1. Define Settings Interface
export interface LetterAPluginSettings {
	coloursPallete: Colour[];
	lexersSettings: Record<string, LexerSettings>;
	shopUrl: string;
}

// there is a bug, lexers aren't initialized yet when this is created, so it is empty
export const DEFAULT_SETTINGS: LetterAPluginSettings = {
	coloursPallete: default_colours,
	lexersSettings: {},
	shopUrl: DEFAULT_SHOP_URL
};