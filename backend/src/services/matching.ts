import Fuse from 'fuse.js';

const FUSE_THRESHOLD = 0.4;

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/\(.*?\)/g, '')         // remove parenthetical content
    .replace(/[^\w\s]/g, '')         // strip punctuation
    .replace(/\s+/g, ' ')            // collapse whitespace
    .trim()
    .replace(/^(the|a|an)\s+/i, ''); // remove leading articles
}

export function fuzzyMatch(canonical: string, answer: string): boolean {
  if (!answer?.trim()) return false;

  const normCanonical = normalize(canonical);
  const normAnswer = normalize(answer);

  // Exact match after normalization
  if (normCanonical === normAnswer) return true;

  // Substring match: answer is contained in canonical or vice versa
  if (normCanonical.includes(normAnswer) || normAnswer.includes(normCanonical)) return true;

  // Fuse.js fuzzy match
  const fuse = new Fuse([normCanonical], { threshold: FUSE_THRESHOLD });
  const results = fuse.search(normAnswer);
  return results.length > 0;
}

// For artist matching: accept any one of the listed artists
export function matchArtist(canonicalArtists: string[], answer: string): boolean {
  return canonicalArtists.some((artist) => fuzzyMatch(artist, answer));
}
