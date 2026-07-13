import type { z } from 'zod';

/**
 * Parse a JSONL dataset (one object per line; blank lines ignored) with the given
 * Zod schema. Throws with the offending line number on the first malformed/invalid
 * record, and on a duplicate `id`, so a bad dataset fails loudly instead of being
 * used silently. `filename` only labels the error messages. Shared by the chat and
 * judge dataset loaders.
 */
export function parseJsonlDataset<T extends { id: string }>(
  text: string,
  schema: z.ZodType<T>,
  filename: string,
): T[] {
  const records: T[] = [];
  const seen = new Set<string>();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // eslint-disable-next-line security/detect-object-injection -- i is a bounded loop index into lines
    const line = lines[i].trim();
    if (line === '') continue;

    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      throw new Error(`${filename} line ${i + 1}: not valid JSON`);
    }

    const result = schema.safeParse(json);
    if (!result.success) {
      throw new Error(`${filename} line ${i + 1}: ${result.error.issues[0]?.message ?? 'invalid'}`);
    }
    if (seen.has(result.data.id)) {
      throw new Error(`${filename} line ${i + 1}: duplicate case id "${result.data.id}"`);
    }
    seen.add(result.data.id);
    records.push(result.data);
  }

  return records;
}
