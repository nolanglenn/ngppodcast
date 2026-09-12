function bigrams(input: string): string[] {
  const clean = input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const pairs: string[] = [];
  for (let i = 0; i < clean.length - 1; i++) {
    pairs.push(clean.slice(i, i + 2));
  }
  return pairs;
}

export function titleSimilarity(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

  const remaining = new Map<string, number>();
  for (const bg of bigramsB) {
    remaining.set(bg, (remaining.get(bg) ?? 0) + 1);
  }

  let matches = 0;
  for (const bg of bigramsA) {
    const count = remaining.get(bg) ?? 0;
    if (count > 0) {
      matches += 1;
      remaining.set(bg, count - 1);
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}
