import { EditorState, Extension, Range, StateEffect } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from '@codemirror/view';

// The editor layer's view of a token — structurally identical to the lexing
// layer's Token, declared locally so this module depends only on CodeMirror.
export type Token = { text: string; type: string };

// Everything the render path needs to know about the lexer serving an
// extension: identity (for console tags), tokens, and each token type's
// resolved colour.
export type Highlighter = {
	id: string;
	// may throw — the caller guards, a broken lexer must not take down the doc
	tokenize(input: string): Token[];
	// resolved CSS colour value, or null to leave the token undecorated
	colourFor(tokenType: string): string | null;
};

// extension -> the active highlighter, or null when nothing should colour it
// (no lexer registered, disabled, ...) — that decision belongs to the
// composition root, not the editor layer
export type HighlightSource = (extension: string) => Highlighter | null;

// Dispatched to every editor when settings change, so the ViewPlugin
// re-runs buildDecorations even though the document hasn't changed.
export const refreshHighlight = StateEffect.define<null>();

// a fenced code block's location: from/to include the fences,
// contentFrom/contentTo span the text handed to the lexer
type CodeBlock = {
	from: number;
	contentFrom: number;
	contentTo: number;
	to: number;
	extension: string;
};

export function highlightExtension(source: HighlightSource): Extension {
	// one shared Decoration.mark per colour value: identical instances make
	// CM's "did this decoration change?" check trivial across rebuilds, and
	// tokenizeBlock allocates no decoration objects, only ranges
	const markCache = new Map<string, Decoration>();
	const markFor = (colour: string): Decoration => {
		let mark = markCache.get(colour);
		if (!mark) {
			mark = Decoration.mark({
				attributes: { style: `color: ${colour}; font-weight: bold` }, // todo:maybe give controll to lexer
			});
			markCache.set(colour, mark);
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

	// tokenize one block and return its decorations (empty if the source has
	// no highlighter for the extension, or tokenize throws)
	const tokenizeBlock = (state: EditorState, block: CodeBlock): Range<Decoration>[] => {
		if (!block.extension) return [];
		const highlighter = source(block.extension);
		if (!highlighter) return [];
		const content = state.sliceDoc(block.contentFrom, block.contentTo);
		// a broken lexer must not take down the whole document
		let tokens;
		try {
			tokens = highlighter.tokenize(content);
		} catch (e) {
			console.warn(`[lexer ${highlighter.id}] tokenize threw:`, e);
			return [];
		}
		const ranges: Range<Decoration>[] = [];
		let last_index = 0;
		for (const token of tokens) {
			if (!token || typeof token.text !== 'string' || typeof token.type !== 'string') {
				console.warn(`[lexer ${highlighter.id}] skipping malformed token`, token);
				continue;
			}
			const token_index = content.indexOf(token.text, last_index);
			if (token_index === -1) {
				console.warn(`[lexer ${highlighter.id}] token text not found in block:`, token.text);
				continue;
			}
			const matchPos = block.contentFrom + token_index;
			// unmapped or unresolvable token types stay undecorated — the
			// editor's normal text colour, never a loud fallback
			const colour = highlighter.colourFor(token.type);
			if (colour) {
				ranges.push(markFor(colour).range(matchPos, matchPos + token.text.length));
			}
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
