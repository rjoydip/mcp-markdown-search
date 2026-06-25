/**
 * splitIntoChunks — semantic text chunker for markdown content.
 *
 * Strategy:
 *   1. Split on markdown headings (# through ######) to keep sections intact.
 *   2. If a section exceeds `size`, use a sliding window with `overlap`.
 *   3. Drop trivially small chunks (< 20 chars).
 */
// fallow-ignore-next-line complexity
export function splitIntoChunks(
  text: string,
  size: number = 1000,
  overlap: number = 100,
): string[] {
  if (!text?.trim()) return [];

  const chunks: string[] = [];
  const sections = text.split(/(?=\n#{1,6} )/);

  for (const section of sections) {
    if (section.length <= size) {
      if (section.trim()) chunks.push(section.trim());
    } else {
      const step = Math.max(size - overlap, 1);
      let start = 0;
      while (start < section.length) {
        const end = Math.min(start + size, section.length);
        const chunk = section.slice(start, end).trim();
        if (chunk) chunks.push(chunk);
        start += step;
      }
    }
  }

  return chunks.filter((c) => c.length > 20);
}

/**
 * buildVectorId — create a Vectorize-safe vector ID from a file path + chunk index.
 * IDs must be ASCII with no slashes or special characters.
 */
export function buildVectorId(filePath: string, chunkIndex: number): string {
  const encoded = Buffer.from(filePath, "utf-8").toString("base64url").replace(/=+$/, "");
  return `${encoded}__chunk_${chunkIndex}`;
}
