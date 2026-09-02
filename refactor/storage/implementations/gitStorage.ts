class GitStorage implements StorageHandler {
    path: string;

    constructor(path: string){
        this.path = path;
    }
    getLanguagePack(name: string) {
        throw new Error("Method not implemented.");
    }
    getLexer(path: string) {
        throw new Error("Method not implemented.");
    }
    getTheme(path: string) {
        throw new Error("Method not implemented.");
    }
}