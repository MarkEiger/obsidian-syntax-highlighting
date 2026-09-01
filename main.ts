import { MarkdownView, Notice, Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';

import { LetterASettingTab, LexerSettings } from 'settings/settings';
import { LetterAPluginSettings, DEFAULT_SETTINGS, Colour } from 'settings/settings';
import { IMPORTED_LEXERS_DIR } from 'lexing/loader';
import { LexerSource, LoadedLexer, BuiltinLexerSource, FileLexerSource } from 'lexing/source';
import { attachLexers } from 'lexing/reconcile';
import { LexerRegistry } from 'lexing/registry';
import { Highlighter, highlightExtension, refreshHighlight } from 'editor/highlighter';
import 'lexing';

// The composition root: owns the plugin lifecycle and settings persistence,
// and wires the parts together — sources produce lexers, attachLexers binds
// them to stored settings, the registry indexes them, and highlighterFor
// glues the result to the editor extension.
export default class LetterAPlugin extends Plugin {
	settings: LetterAPluginSettings = DEFAULT_SETTINGS;
	// where lexers come from; a future source kind (e.g. shop-installed)
	// gets appended here and everything downstream picks it up
	sources: LexerSource[] = [];
	registry = new LexerRegistry();
	// transient (not persisted) — which settings sections are expanded, so a
	// re-render of the settings pane preserves the user's open/closed sections
	expandedSections: Set<string> = new Set();
	// pending debounced settings write (null = nothing pending)
	saveTimer: number | null = null;

	async onload() {
		await this.loadSettings();

		this.sources = [
			new BuiltinLexerSource(),
			new FileLexerSource(this.app.vault.adapter, this.importedLexersDir(), msg => new Notice(msg)),
		];
		await this.loadLexers();

		// Register the Editor Extension
		this.registerEditorExtension(highlightExtension(ext => this.highlighterFor(ext)));

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

	// gather every source's lexers, bind them to stored settings, and
	// rebuild the registry's lookups
	async loadLexers() {
		const notify = (msg: string) => new Notice(msg);
		// in order: an id collision is resolved in favour of the earlier source
		const loaded: LoadedLexer[] = [];
		for (const source of this.sources) {
			loaded.push(...await source.load());
		}
		const { attached, changed } = attachLexers(loaded, this.settings.lexersSettings, notify);
		this.registry.rebuild(attached, this.settings.lexersSettings, notify);
		// persist only when reconciliation actually changed something; a
		// clean startup shouldn't write settings at all. The save's flush
		// repaints the editors, so only repaint directly when not saving —
		// a reloaded lexer file can tokenize the same settings differently
		if (changed) {
			await this.saveSettings();
		} else {
			this.refreshEditors();
		}
	}

	// the render path's view of a registered lexer: the editor extension asks
	// per extension and gets tokens + resolved colours, or null when nothing
	// should colour it (no lexer registered, or disabled in settings)
	highlighterFor(extension: string): Highlighter | null {
		const registered = this.registry.byExtension[extension];
		if (!registered) return null;
		const lexerSettings = this.settings.lexersSettings[registered.uuid];
		if (!lexerSettings?.enabled) return null;
		return {
			id: registered.lexer.id,
			tokenize: input => registered.lexer.tokenize(input),
			colourFor: tokenType =>
				this.resolveColour(lexerSettings, lexerSettings.colourMappings[tokenType])?.value ?? null,
		};
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
}
