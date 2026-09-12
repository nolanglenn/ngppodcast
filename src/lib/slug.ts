export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

/**
 * Build a slug for an episode, falling back to its id when the title contains no
 * ASCII alphanumerics (which would otherwise produce an empty slug, and an empty
 * slug collides with the `/episodes` archive route itself).
 */
export function episodeSlug(title: string, id: string): string {
  return slugify(title) || slugify(id) || id;
}

/**
 * Give every item a distinct slug. Duplicate titles are common across a
 * long-running show, and a collision would make every episode after the first
 * one permanently unreachable via `getEpisodeBySlug`.
 *
 * The first occurrence keeps the plain slug; later ones get a short suffix
 * derived from the item's (stable) id, so slugs stay stable across rebuilds.
 */
export function ensureUniqueSlugs<T extends { id: string; slug: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((item) => {
    const base = item.slug || slugify(item.id) || item.id;
    let slug = base;
    if (seen.has(slug)) {
      const suffix = (slugify(item.id) || item.id).slice(0, 8);
      slug = `${base}-${suffix}`;
      let n = 2;
      while (seen.has(slug)) {
        slug = `${base}-${suffix}-${n}`;
        n += 1;
      }
    }
    seen.add(slug);
    return { ...item, slug };
  });
}
