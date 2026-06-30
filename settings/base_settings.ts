import LetterAPlugin from '../main';

export abstract class BaseSettingsTab {
	// `refresh` re-renders the whole settings pane, so a change in one tab
	// (e.g. adding/removing a palette colour) is reflected in the others.
	constructor(protected plugin: LetterAPlugin, protected containerEl: HTMLElement, protected refresh: () => void) { }
	abstract display(): void
}