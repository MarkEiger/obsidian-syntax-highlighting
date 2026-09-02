type StorageConstructor = new (path: string) => StorageHandler;

const REGISTRY: Record<string, StorageConstructor> = {};

export function register(key: string, cls: StorageConstructor) : void {
    REGISTRY[key] = cls;
}

export function get(key: string) : StorageConstructor {
    return REGISTRY[key];
}