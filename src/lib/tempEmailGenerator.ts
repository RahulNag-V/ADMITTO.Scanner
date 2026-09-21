/**
 * Funny & Random Short Temporary Email Generator
 * Creates catchy, short temporary emails based on the user's name.
 */

const FUN_WORDS = [
  'ninja',
  'cool',
  'ace',
  'spark',
  'cyber',
  'swift',
  'turbo',
  'flash',
  'blaze',
  'star',
  'pilot',
  'pro',
  'alpha',
  'nova',
  'mega',
  'hero',
  'vibe',
  'echo',
  'cosmic',
  'chief',
  'zen',
  'bolt',
];

export function generateFunTempEmail(name: string, currentEmail?: string): string {
  const clean = (name || '').trim();
  let baseSlug = 'user';

  if (clean) {
    // Extract first word / name, keep only alphanumeric, max 8 chars
    const firstWord = clean.split(/\s+/)[0] || '';
    const sanitized = firstWord.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sanitized.length > 0) {
      baseSlug = sanitized.slice(0, 8);
    }
  }

  // Filter out the word that might already be in currentEmail to guarantee a fresh roll
  const availableWords = FUN_WORDS.filter(
    (w) => !currentEmail || !currentEmail.toLowerCase().includes(w)
  );
  const wordList = availableWords.length > 0 ? availableWords : FUN_WORDS;
  const pickedWord = wordList[Math.floor(Math.random() * wordList.length)];

  // Random 1-2 digit number
  const numPool = [7, 11, 21, 42, 77, 88, 99, 3, 9, 24];
  const pickedNum = numPool[Math.floor(Math.random() * numPool.length)];

  // Pattern: funWord.nameSlugNum@gmail.com (short, catchy, under 25 chars)
  return `${pickedWord}.${baseSlug}${pickedNum}@gmail.com`;
}
