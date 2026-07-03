import { MarkdownView, Notice, Plugin } from 'obsidian';
import { EditorState, Extension, Range, StateEffect } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from '@codemirror/view';

import { LetterASettingTab, LexerSettings } from 'settings/settings';
import { LetterAPluginSettings, DEFAULT_SETTINGS, Colour } from 'settings/settings';
import { Lexer, lexers } from 'lexing/api';
import { validateLexer, seedLexerSettings, reconcileLexerSettings } from 'lexing/reconcile';
import { FileLexer, IMPORTED_LEXERS_DIR, LEXER_API_DTS, evaluateLexerSource } from 'lexing/loader';
import { default_colours } from 'settings/pallet';
import 'lexing';

type RegisteredLexer = {lexer: Lexer, uuid: string};
type LexersMap = Record<string, RegisteredLexer>;
// a fenced code block's location: from/to include the fences,
// contentFrom/contentTo span the text handed to the lexer
type CodeBlock = {
	from: number;
	contentFrom: number;
	contentTo: number;
	to: number;
	extension: string;
};

// Dispatched to every editor when settings change, so the ViewPlugin
// re-runs buildDecorations even though the document hasn't changed.
export const refreshHighlight = StateEffect.define<null>();
// 2. The Main Plugin Class
export default class LetterAPlugin extends Plugin {
	settings: LetterAPluginSettings = DEFAULT_SETTINGS;
	lexers: LexersMap =  {}          // keyed by code-block extension (render path)
	lexersByUuid: Record<string, Lexer> = {}  // keyed by settings uuid (settings path)
	// source file of each imported lexer, keyed by settings uuid (built-ins absent)
	lexerSourcePaths: Record<string, string> = {}
	// transient (not persisted) — which settings sections are expanded, so a
	// re-render of the settings pane preserves the user's open/closed sections
	expandedSections: Set<string> = new Set();
	// pending debounced settings write (null = nothing pending)
	saveTimer: number | null = null;

	async onload() {
		await this.loadSettings();

		await this.loadLexers();

		// Register the Editor Extension
		this.registerEditorExtension(this.buildEditorExtension());

		// Add the Settings Tab
		this.addSettingTab(new LetterASettingTab(this.app, this));

		this.addCommand({
			id: 'reload-lexers',
			name: 'Reload lexers',
			callback: async () => {
				await this.loadLexers();
				new Notice('Lexers reloaded');
			},
		});
	}

	importedLexersDir(): string {
		return `${this.manifest.dir}/${IMPORTED_LEXERS_DIR}`;
	}

	// scan imported_lexers/*.js; a file that fails to load is skipped with a
	// notice and its stored settings stay untouched until it loads again
	async scanFileLexers(): Promise<FileLexer[]> {
		const adapter = this.app.vault.adapter;
		const dir = this.importedLexersDir();
		if (!(await adapter.exists(dir))) {
			await adapter.mkdir(dir);
		}
		// keep the dev-time type stubs in sync with the installed plugin
		await adapter.write(`${dir}/lexer-api.d.ts`, LEXER_API_DTS);

		const fileLexers: FileLexer[] = [];
		for (const path of (await adapter.list(dir)).files) {
			if (!path.endsWith('.js')) continue;
			try {
				const code = await adapter.read(path);
				fileLexers.push({ lexer: evaluateLexerSource(code, path), path });
			} catch (e) {
				console.warn('[lexer file]', e);
				new Notice(`Failed to load lexer: ${e instanceof Error ? e.message : e}`);
			}
		}
		return fileLexers;
	}

	async loadLexers(){
		this.lexers = {};
		this.lexersByUuid = {};
		this.lexerSourcePaths = {};
		const seenIds = new Set<string>();

		const fileLexers = await this.scanFileLexers();
		const allLexers: { lexer: Lexer, path?: string }[] = [
			...lexers.map(lexer => ({ lexer })),
			...fileLexers,
		];
		const before = JSON.stringify(this.settings.lexersSettings);

		for (const { lexer, path } of allLexers){
			if (seenIds.has(lexer.id)) {
				console.warn(`[lexer ${lexer.id}] duplicate lexer id — skipping ${path ?? '(built-in)'}`);
				new Notice(`Lexer id "${lexer.id}" is already in use — skipping ${path ?? 'a duplicate'}.`);
				continue;
			}
			seenIds.add(lexer.id);
			for (const warning of validateLexer(lexer)) {
				console.warn(`[lexer ${lexer.id}] ${warning}`);
			}

			// stored settings re-attach by the lexer's declared id; the uuid
			// (the settings key) is minted once and survives lexer updates
			const existing = Object.entries(this.settings.lexersSettings)
				.find(([, ls]) => ls.lexerId === lexer.id);
			const uuid = existing?.[0] ?? crypto.randomUUID();
			let lexerSettings = existing?.[1];
			if (lexerSettings) {
				reconcileLexerSettings(lexerSettings, lexer);
			} else {
				lexerSettings = seedLexerSettings(lexer);
			}

			// settings of lexers that failed to load / were removed stay in
			// lexersSettings untouched — they re-attach by id when back
			this.settings.lexersSettings[uuid] = lexerSettings;
			// two lexers targeting the same extension: the first keeps the
			// render slot, the loser stays loaded (visible in settings) but
			// inactive until the user re-targets one of them
			const occupant = this.lexers[lexerSettings.extention];
			if (occupant) {
				console.warn(`[lexer ${lexer.id}] extension "${lexerSettings.extention}" is already targeted by "${occupant.lexer.name}" — "${lexer.name}" is inactive`);
				new Notice(`Extension "${lexerSettings.extention}" is already targeted by "${occupant.lexer.name}" — "${lexer.name}" is inactive until re-targeted in settings.`);
			} else {
				this.lexers[lexerSettings.extention] = {lexer: lexer, uuid: uuid};
			}
			this.lexersByUuid[uuid] = lexer;
			if (path) {
				this.lexerSourcePaths[uuid] = path;
			}
		}
		// persist only when reconciliation actually changed something; a
		// clean startup shouldn't write settings at all. The save's flush
		// repaints the editors, so only repaint directly when not saving —
		// a reloaded lexer file can tokenize the same settings differently
		if (JSON.stringify(this.settings.lexersSettings) !== before) {
			await this.saveSettings();
		} else {
			this.refreshEditors();
		}
	}

	// resolve a token mapping's colour id against the global palette and the
	// owning lexer's private pool (scope is derived, not stored)
	resolveColour(lexerSettings: LexerSettings, colourId: string | undefined): Colour | undefined {
		if (!colourId) return undefined;
		return this.settings.coloursPallete.find(c => c.id === colourId)
			?? lexerSettings.privatePool.find(c => c.id === colourId);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// on a fresh install coloursPallete IS the module-level default_colours
		// array — clone it so palette edits can't mutate the seed/fallback
		this.settings.coloursPallete = this.settings.coloursPallete.map(c => ({ ...c }));
	}

	// coalesce rapid saves (per-keystroke onChange handlers, colour-picker
	// drags) into one disk write + editor refresh once the input pauses
	async saveSettings() {
		if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
		this.saveTimer = window.setTimeout((): void => { void this.flushSettings(); }, 300);
	}

	async flushSettings() {
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		await this.saveData(this.settings);
		this.refreshEditors();
	}

	onunload() {
		// a pending debounced save must not be lost on quit/disable
		if (this.saveTimer !== null) void this.flushSettings();
	}

	refreshEditors() {
		this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
			const view = leaf.view as MarkdownView;
			// editor.cm is the underlying CM6 EditorView (not in the public typings)
			const cm = (view.editor as any)?.cm as EditorView | undefined;
			cm?.dispatch({ effects: refreshHighlight.of(null) });
		});
	}

	buildEditorExtension(): Extension {
		const plugin = this;
		// one shared Decoration.mark per colour value: identical instances make
		// CM's "did this decoration change?" check trivial across rebuilds, and
		// tokenizeBlock allocates no decoration objects, only ranges
		const markCache = new Map<string, Decoration>();
		const markFor = (colour: Colour): Decoration => {
			let mark = markCache.get(colour.value);
			if (!mark) {
				mark = Decoration.mark({
					attributes: { style: `color: ${colour.value}; font-weight: bold` }, // todo:maybe give controll to lexer
				});
				markCache.set(colour.value, mark);
			}
			return mark;
		};
		// find every ```lang fenced block from `start` (which must not be inside
		// a block) to the end of the document
		const scanBlocks = (state: EditorState, start: number): CodeBlock[] => {
			const text = state.sliceDoc(start);
			// markdown pairing rules: ANY line-start fence opens a block —
			// whatever its info string, including none — but only a bare ```
			// line closes one. The lexer extension is the info string's first
			// word; a block with no extension is tracked but never coloured.
			const code_block_regex = new RegExp(`(^\`\`\`([^\n]*)\n)([\\s\\S]*?)(^\`\`\`[ \t]*$)`, 'gm');
			const blocks: CodeBlock[] = [];
			let match;
			while ((match = code_block_regex.exec(text)) !== null) {
				const HEADER_ID = 1;
				const EXTENTION_ID = 2;
				const BLOCK_TEXT_ID = 3;
				const FOOTER_ID = 4;
				const from = start + match.index;
				const contentFrom = from + match[HEADER_ID].length;
				const contentTo = contentFrom + match[BLOCK_TEXT_ID].length;
				blocks.push({
					from,
					contentFrom,
					contentTo,
					to: contentTo + match[FOOTER_ID].length,
					extension: match[EXTENTION_ID].trim().split(/\s+/)[0],
				});
			}
			return blocks;
		};

		// tokenize one block and return its decorations (empty if no lexer is
		// registered for the extension, it is disabled, or tokenize throws)
		const tokenizeBlock = (state: EditorState, block: CodeBlock): Range<Decoration>[] => {
			if (!block.extension) return [];
			const registered: RegisteredLexer | undefined = plugin.lexers[block.extension];
			if (!registered) return [];
			const lexerSettings: LexerSettings = plugin.settings.lexersSettings[registered.uuid];
			if (!lexerSettings.enabled) return [];
			const lexer: Lexer = registered.lexer;
			const content = state.sliceDoc(block.contentFrom, block.contentTo);
			// a broken lexer must not take down the whole document
			let tokens;
			try {
				tokens = lexer.tokenize(content);
			} catch (e) {
				console.warn(`[lexer ${lexer.id}] tokenize threw:`, e);
				return [];
			}
			const ranges: Range<Decoration>[] = [];
			let last_index = 0;
			for (const token of tokens) {
				if (!token || typeof token.text !== 'string' || typeof token.type !== 'string') {
					console.warn(`[lexer ${lexer.id}] skipping malformed token`, token);
					continue;
				}
				const token_index = content.indexOf(token.text, last_index);
				if (token_index === -1) {
					console.warn(`[lexer ${lexer.id}] token text not found in block:`, token.text);
					continue;
				}
				const matchPos = block.contentFrom + token_index;
				const colour: Colour = plugin.resolveColour(lexerSettings, lexerSettings.colourMappings[token.type]) ?? default_colours[0];
				ranges.push(markFor(colour).range(matchPos, matchPos + token.text.length));
				last_index = token_index + token.text.length;
			}
			return ranges;
		};

		return ViewPlugin.fromClass(
			class {
				decorations: DecorationSet = Decoration.none;
				blocks: CodeBlock[] = [];

				constructor(view: EditorView) {
					this.rebuildFrom(view.state, 0);
				}

				update(update: ViewUpdate) {
					// settings changed: colours/mappings are global, rebuild everything
					if (update.transactions.some(tr =>
						tr.effects.some(e => e.is(refreshHighlight)))) {
						this.rebuildFrom(update.state, 0);
						return;
					}
					if (!update.docChanged) return;

					// shift decorations and block ranges through the edit; every
					// block the edit didn't touch is now correct without any work
					this.decorations = this.decorations.map(update.changes);
					this.blocks = this.blocks.map(b => ({
						from: update.changes.mapPos(b.from, -1),
						contentFrom: update.changes.mapPos(b.contentFrom, -1),
						contentTo: update.changes.mapPos(b.contentTo, 1),
						to: update.changes.mapPos(b.to, 1),
						extension: b.extension,
					}));

					// block boundaries can only move if a fence line changed, so
					// check the changed ranges — expanded to whole lines, both the
					// old and the new text — for a fence marker
					let earliest = Infinity; // earliest change, new-doc coordinates
					let fenceInvolved = false;
					const changed: { fromB: number; toB: number }[] = [];
					update.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
						changed.push({ fromB, toB });
						earliest = Math.min(earliest, fromB);
						if (!fenceInvolved) {
							const oldDoc = update.startState.doc;
							const newDoc = update.state.doc;
							const oldLines = oldDoc.sliceString(oldDoc.lineAt(fromA).from, oldDoc.lineAt(toA).to);
							const newLines = newDoc.sliceString(newDoc.lineAt(fromB).from, newDoc.lineAt(toB).to);
							fenceInvolved = oldLines.includes('```') || newLines.includes('```');
						}
					});

					if (fenceInvolved) {
						// fences pair top-down, so structure up to the last block
						// that ends before the edit cannot change. Rescanning from
						// that block's end (not the edit itself) also re-pairs any
						// unclosed fence sitting in the prose gap before the edit.
						let rescanStart = 0;
						for (const b of this.blocks) {
							if (b.to < earliest) rescanStart = Math.max(rescanStart, b.to);
						}
						this.rebuildFrom(update.state, rescanStart);
						return;
					}

					// content-only edit: re-tokenize just the touched blocks
					for (const block of this.blocks) {
						if (!changed.some(r => r.fromB <= block.contentTo && r.toB >= block.contentFrom)) continue;
						this.decorations = this.decorations.update({
							filterFrom: block.contentFrom,
							filterTo: block.contentTo,
							filter: () => false,
							add: tokenizeBlock(update.state, block),
						});
					}
				}

				// drop all structure and decorations from `start` onward and
				// rebuild them by rescanning; `start` must not be inside a block
				rebuildFrom(state: EditorState, start: number) {
					this.blocks = this.blocks.filter(b => b.to <= start);
					const rescanned = scanBlocks(state, start);
					const add: Range<Decoration>[] = [];
					// no spread pushes here: spreading passes every element as a
					// call argument and overflows the stack past ~65k tokens
					for (const block of rescanned) {
						for (const range of tokenizeBlock(state, block)) {
							add.push(range);
						}
						this.blocks.push(block);
					}
					this.decorations = this.decorations.update({
						filterFrom: start,
						filterTo: state.doc.length,
						filter: () => false,
						add,
					});
				}
			},
			{
				decorations: (v) => v.decorations,
			}
		);
	}
}