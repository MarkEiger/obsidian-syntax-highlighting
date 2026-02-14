import { Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Extension, RangeSetBuilder } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';

// 1. Define Settings Interface
interface LetterAPluginSettings {
	highlightColor: string;
}

const DEFAULT_SETTINGS: LetterAPluginSettings = {
	highlightColor: '#ff0000', // Default Red
};

// 2. The Main Plugin Class
export default class LetterAPlugin extends Plugin {
	settings: LetterAPluginSettings;

	async onload() {
		await this.loadSettings();

		// Register the Editor Extension
		this.registerEditorExtension(this.buildEditorExtension());

		// Add the Settings Tab
		this.addSettingTab(new LetterASettingTab(this.app, this));

		// Apply the initial color to the CSS variable
		this.updateColorStyle();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateColorStyle();
		// Force a refresh of the editor to apply new colors immediately
		this.app.workspace.updateOptions(); 
	}

	updateColorStyle() {
		// We set a CSS variable on the body so the CSS file can use it
		document.body.style.setProperty('--letter-a-highlight-color', this.settings.highlightColor);
	}

	buildEditorExtension(): Extension {
		return ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = this.buildDecorations(view);
				}

				update(update: ViewUpdate) {
					if (update.docChanged || update.viewportChanged) {
						this.decorations = this.buildDecorations(update.view);
					}
				}

				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();
					
					// Define a widget that displays "b"
					class BWidget extends WidgetType {
						toDOM(view: EditorView): HTMLElement {
							const span = document.createElement("span");
							span.textContent = "c";
							span.className = "letter-a-highlight";
							return span;
						}
					}

					const replaceDecoration = Decoration.replace({
						widget: new BWidget(),
					});

					for (const { from, to } of view.visibleRanges) {
						const text = view.state.sliceDoc(from, to);
						const regex = /a/g;
						let match;
						while ((match = regex.exec(text)) !== null) {
							const matchPos = from + match.index;
							builder.add(matchPos, matchPos + 1, replaceDecoration);
						}
					}

					return builder.finish();
				}
			},
			{
				decorations: (v) => v.decorations,
			}
		);
	}
}

// 3. The Settings Tab Class
class LetterASettingTab extends PluginSettingTab {
	plugin: LetterAPlugin;

	constructor(app: any, plugin: LetterAPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Letter "a" Highlighter Settings' });

		new Setting(containerEl)
			.setName('Highlight Color')
			.setDesc('Choose the color for the letter "a" inside "a" code blocks.')
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.highlightColor)
					.onChange(async (value) => {
						this.plugin.settings.highlightColor = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
