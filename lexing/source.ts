import type { DataAdapter } from 'obsidian';
import { Lexer, PaletteColour, lexers } from './api';
import { LEXER_API_DTS, LEXER_ENTRY, evaluateLexerModules, paletteFilePath, parsePaletteSource } from './loader';

// one lexer as produced by a source; `origin` is the vault folder it can be
// updated in place from (absent for built-ins)
export type LoadedLexer = { lexer: Lexer, palette: PaletteColour[], origin?: string };

// THE sourcing contract: where lexers come from. The composition root holds
// a list of sources; a new kind of source (e.g. shop-installed) implements
// this and gets appended there — nothing downstream changes.
export interface LexerSource {
	load(): Promise<LoadedLexer[]>;
}

// the lexers compiled into the plugin, registered via lexing/api's registerLexer
export class BuiltinLexerSource implements LexerSource {
	async load(): Promise<LoadedLexer[]> {
		return lexers.map(({ lexer, palette }) => ({ lexer, palette }));
	}
}

// Scans a vault folder where every lexer is a FOLDER with an index.js entry,
// optional sibling modules (require'able), and a palette.json. A lexer that
// fails to load is skipped with a notification and its stored settings stay
// untouched until it loads again.
export class FileLexerSource implements LexerSource {
	constructor(
		private adapter: DataAdapter,
		private dir: string,
		private notify: (msg: string) => void,
	) {}

	// all .js files under a lexer's folder, keyed by folder-relative path
	// ('index.js', 'lib/tables.js') — the module map require() resolves in
	private async collectModules(folder: string, root: string, out: Record<string, string>): Promise<void> {
		const listing = await this.adapter.list(folder);
		for (const file of listing.files) {
			if (!file.endsWith('.js')) continue;
			out[file.slice(root.length + 1)] = await this.adapter.read(file);
		}
		for (const sub of listing.folders) {
			await this.collectModules(sub, root, out);
		}
	}

	async load(): Promise<LoadedLexer[]> {
		if (!(await this.adapter.exists(this.dir))) {
			await this.adapter.mkdir(this.dir);
		}
		// keep the dev-time type stubs in sync with the installed plugin
		await this.adapter.write(`${this.dir}/lexer-api.d.ts`, LEXER_API_DTS);

		const listing = await this.adapter.list(this.dir);
		// flat .js files were the pre-folder format — never silently ignored
		for (const stray of listing.files.filter(f => f.endsWith('.js'))) {
			console.warn(`[lexer file] flat lexer files are no longer supported — move "${stray}" into its own folder as ${LEXER_ENTRY}`);
			this.notify(`"${stray.split('/').pop()}" is a flat lexer file — move it into its own folder as ${LEXER_ENTRY}.`);
		}

		const loaded: LoadedLexer[] = [];
		for (const folder of listing.folders) {
			try {
				const modules: Record<string, string> = {};
				await this.collectModules(folder, folder, modules);
				if (!(LEXER_ENTRY in modules)) {
					if (Object.keys(modules).length) {
						this.notify(`Lexer folder "${folder.split('/').pop()}" has no ${LEXER_ENTRY} — skipped.`);
					}
					continue; // empty folder: nothing to say
				}
				const lexer = evaluateLexerModules(modules, LEXER_ENTRY, folder);
				// palette.json inside the folder. A missing or broken palette
				// doesn't block the lexer — its token types just fall back to
				// the default colour
				let palette: PaletteColour[] = [];
				const palettePath = paletteFilePath(folder);
				if (await this.adapter.exists(palettePath)) {
					try {
						palette = parsePaletteSource(await this.adapter.read(palettePath), palettePath);
					} catch (e) {
						console.warn('[lexer palette]', e);
						this.notify(`Failed to load palette: ${e instanceof Error ? e.message : e}`);
					}
				}
				loaded.push({ lexer, palette, origin: folder });
			} catch (e) {
				console.warn('[lexer file]', e);
				this.notify(`Failed to load lexer: ${e instanceof Error ? e.message : e}`);
			}
		}
		return loaded;
	}
}
