/**
 * Categories have no color/icon in the data model (the API returns only
 * `{ id, slug, names }`). The UI derives a stable color and glyph from the
 * immutable `slug` so a category always looks the same across views without
 * persisting anything server-side.
 */

// Curated palette — all readable as a solid swatch with white/dark glyphs.
const PALETTE = [
  '#185FA5', // primary blue
  '#3C3489', // accent indigo
  '#639922', // income green
  '#E24B4A', // expense red
  '#EF9F27', // pending amber
  '#378ADD', // transfer blue
  '#A32D2D', // deep red
  '#854F0B', // brown
  '#2E7D6B', // teal
  '#7A4FB5', // violet
  '#B5651D', // ochre
  '#4A6FA5', // slate blue
] as const;

/** Deterministic hash of a slug → a stable palette color. */
export function categoryColor(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * Soft per-category tint for glyph squares: the palette color at low alpha as a
 * background with the solid color as the glyph. The alpha composites over the
 * themed surface, so it reads as a calm accent in both light and dark mode
 * (vs. the louder white-on-solid swatch). The square is decorative (aria-hidden);
 * the accessible label is the category name beside it.
 */
export function categoryTint(slug: string): { bg: string; fg: string } {
  const color = categoryColor(slug);
  return { bg: `${color}24`, fg: color };
}

/** First grapheme of the display name, used as the icon-square glyph. */
export function categoryGlyph(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : '?';
}
