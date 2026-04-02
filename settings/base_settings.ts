import LetterAPlugin from '../main';

export abstract class BaseSettingsTab {
	constructor(protected plugin: LetterAPlugin, protected containerEl: HTMLElement) { }
	abstract display(): void
}