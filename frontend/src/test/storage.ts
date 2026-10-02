/**
 * Node 25+ defines its own global `localStorage`, which shadows jsdom's and is unusable
 * unless Node runs with `--localstorage-file`. zustand's `persist` grabs the storage when
 * the store module is imported, so this must run before any app module (first import in
 * setup.ts). Installs a spec-compliant in-memory Storage when the global one is broken.
 */
class MemoryStorage implements Storage {
  #data = new Map<string, string>()
  get length() {
    return this.#data.size
  }
  clear() {
    this.#data.clear()
  }
  getItem(key: string) {
    return this.#data.get(key) ?? null
  }
  key(index: number) {
    return [...this.#data.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.#data.delete(key)
  }
  setItem(key: string, value: string) {
    this.#data.set(key, String(value))
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  let works = false
  try {
    works = typeof globalThis[name]?.setItem === 'function'
  } catch {
    works = false
  }
  if (!works) {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    })
  }
}
