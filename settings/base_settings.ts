import LetterAPlugin from '../main';

export abstract class BaseSettings {
	constructor(protected plugin: LetterAPlugin, protected containerEl: HTMLElement) { }
	abstract display(): void
}