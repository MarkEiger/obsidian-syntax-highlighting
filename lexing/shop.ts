import { DataAdapter, requestUrl } from 'obsidian';
import { PaletteColour } from './api';
import { parsePaletteSource } from './loader';

// One abstraction, two transports: a shop is a file tree, and a palette
// reference (meta.json's defaultPalette id) is a path relative to its root
// — true on GitHub, in the raw-URL mirror, and in a local checkout alike.
// Only the reader differs.
export interface ShopSource {
	// path is relative to the shop root, e.g. 'palettes/dracula.json'
	readText(path: string): Promise<string>;
	// where this shop lives — for error messages
	describe(): string;
}

export class RemoteShopSource implements ShopSource {
	constructor(private baseUrl: string) {}
	async readText(path: string): Promise<string> {
		const url = `${this.baseUrl.replace(/\/+$/, '')}/${path}`;
		return (await requestUrl({ url })).text;
	}
	describe(): string { return this.baseUrl; }
}

export class VaultShopSource implements ShopSource {
	constructor(private adapter: DataAdapter, private root: string) {}
	async readText(path: string): Promise<string> {
		return this.adapter.read(`${this.root.replace(/\/+$/, '')}/${path}`);
	}
	describe(): string { return this.root; }
}

// The shop URL setting doubles as the transport switch: an http(s) URL is
// the remote shop, anything else is a vault-relative folder (a local shop
// checkout — same resolution code path, which is the point).
export function shopSourceFor(shopUrl: string, adapter: DataAdapter): ShopSource {
	const trimmed = shopUrl.trim();
	return /^https?:\/\//i.test(trimmed)
		? new RemoteShopSource(trimmed)
		: new VaultShopSource(adapter, trimmed);
}

// the slice of a lexer's shop meta.json the plugin acts on
export type LexerMeta = { defaultPalette?: string | null };

// Fetch a palette by id from the shop's palettes/ folder. Accepts both the
// plugin's bare-array palette format and the shop's { colours: [...] } one.
export async function fetchShopPalette(source: ShopSource, paletteId: string): Promise<PaletteColour[]> {
	// palette ids are simple names, never paths — reject traversal outright
	if (!/^[\w.-]+$/.test(paletteId)) {
		throw new Error(`invalid palette id "${paletteId}"`);
	}
	const path = `palettes/${paletteId}.json`;
	let text: string;
	try {
		text = await source.readText(path);
	} catch (e) {
		throw new Error(`couldn't fetch "${path}" from the shop (${source.describe()}) — ${e instanceof Error ? e.message : e}`);
	}
	return parsePaletteSource(text, path);
}
