interface Driver {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}
interface Manifest {
  version: string;
  chunks: number;
}
function manifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw);
    return typeof m.version === "string" &&
      /^[a-z0-9-]+$/.test(m.version) &&
      Number.isInteger(m.chunks) &&
      m.chunks > 0 &&
      m.chunks <= 128
      ? m
      : null;
  } catch {
    return null;
  }
}
// A chunk stays below 2 KB, including UTF-8 characters that use four bytes.
export function secureStorage(
  driver: Driver,
  version = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
) {
  return {
    async getItem(key: string) {
      const m = manifest(await driver.getItemAsync(key));
      if (!m) return null;
      const pieces = await Promise.all(
        Array.from({ length: m.chunks }, (_, i) =>
          driver.getItemAsync(`${key}.${m.version}.${i}`),
        ),
      );
      return pieces.some((p) => p === null) ? null : pieces.join("");
    },
    async setItem(key: string, value: string) {
      const old = manifest(await driver.getItemAsync(key));
      const characters = Array.from(value);
      const m = {
        version: version(),
        chunks: Math.max(1, Math.ceil(characters.length / 500)),
      };
      if (m.chunks > 128)
        throw new Error("This session is too large to save securely.");
      try {
        for (let i = 0; i < m.chunks; i++)
          await driver.setItemAsync(
            `${key}.${m.version}.${i}`,
            characters.slice(i * 500, (i + 1) * 500).join(""),
          );
        await driver.setItemAsync(key, JSON.stringify(m));
      } catch (e) {
        for (let i = 0; i < m.chunks; i++)
          await driver
            .deleteItemAsync(`${key}.${m.version}.${i}`)
            .catch(() => {});
        throw e;
      }
      if (old)
        for (let i = 0; i < old.chunks; i++)
          await driver
            .deleteItemAsync(`${key}.${old.version}.${i}`)
            .catch(() => {});
    },
    async removeItem(key: string) {
      const old = manifest(await driver.getItemAsync(key));
      await driver.deleteItemAsync(key);
      if (old)
        for (let i = 0; i < old.chunks; i++)
          await driver.deleteItemAsync(`${key}.${old.version}.${i}`);
    },
  };
}
