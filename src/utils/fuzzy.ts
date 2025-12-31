// src/utils/fuzzy.ts

// Cheap, fast-ish Levenshtein with early exit
export function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;

  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;

  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    let bestInRow = v1[0];
    const ac = a.charCodeAt(i);
    for (let j = 0; j < bl; j++) {
      const cost = ac === b.charCodeAt(j) ? 0 : 1;
      const m = Math.min(
        v1[j] + 1,        // deletion
        v0[j + 1] + 1,    // insertion
        v0[j] + cost      // substitution
      );
      v1[j + 1] = m;
      if (m < bestInRow) bestInRow = m;
    }
    if (bestInRow > max) return max + 1; // early exit
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v1[bl];
}

export function similarity(a: string, b: string, maxDist = 3): number {
  const d = levenshtein(a, b, maxDist);
  if (d === maxDist + 1) return 0;
  const denom = Math.max(a.length, b.length) || 1;
  return 1 - d / denom; // 0..1
}

export function bestMatches(
  query: string,
  candidates: string[],
  limit = 10,
  minSim = 0.65
): Array<{ value: string; score: number }> {
  const q = query.trim().toLowerCase();
  const scored: Array<{ value: string; score: number }> = [];

  // First, prefer contains/startsWith as “free wins”
  for (const c of candidates) {
    const lc = c.toLowerCase();
    if (lc.startsWith(q)) scored.push({ value: c, score: 0.999 });
    else if (lc.includes(q)) scored.push({ value: c, score: 0.9 });
  }
  // If not enough, add fuzzy
  if (scored.length < limit) {
    for (const c of candidates) {
      const lc = c.toLowerCase();
      if (lc.includes(q)) continue; // already in list
      const s = similarity(q, lc, 3);
      if (s >= minSim) scored.push({ value: c, score: s });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  // de-dup by value
  const seen = new Set<string>();
  const out: Array<{ value: string; score: number }> = [];
  for (const x of scored) {
    if (seen.has(x.value)) continue;
    seen.add(x.value);
    out.push(x);
    if (out.length >= limit) break;
  }
  return out;
}
