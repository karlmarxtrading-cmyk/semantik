/**
 * Short document labels have too few function words for prose language scoring.
 * Recognize only a complete label + identifier grammar, never free-form prose.
 * This is a routing decision, not a semantic validation or a translation.
 */
const labels = Object.freeze({
  en: new Set('start begin end continued page pages chapter section figure table document record appendix trace code version reference identifier number'.split(' ')),
  id: new Set('awal mulai akhir lanjutan bersambung halaman bab bagian gambar tabel dokumen rekaman lampiran jejak kode versi rujukan pengenal nomor'.split(' '))
});
const neutralLabels = new Set(['id', 'no']);
const hasLetter = /[A-Za-z]/;
const hasDigit = /[0-9]/;
// Numeric page/record numbers, or compact mixed letter/digit identifiers. A unit
// such as 20mg is not an identifier; identifiers begin with a letter.
const identifier = token => /^[0-9]{1,12}$/.test(token) ||
  (token.length <= 64 && /^[A-Za-z][A-Za-z0-9]*(?:[._/-][A-Za-z0-9]+)*$/.test(token) && hasLetter.test(token) && hasDigit.test(token));

export function detectMetadataLanguage(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 160 || /[\r\n=<>$%+−!?;]/.test(value)) return 'unknown';
  // These are label separators only. Sentence punctuation and all unrecognized
  // words remain in tokens and make the entire classification fail closed.
  const tokens = value.trim().split(/[\s:|#()[\]]+/u).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 6) return 'unknown';
  let en = 0, id = 0, codes = 0, words = 0;
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (labels.en.has(lower)) { en++; words++; }
    else if (labels.id.has(lower)) { id++; words++; }
    else if (neutralLabels.has(lower)) words++;
    else if (identifier(token)) codes++;
    else return 'unknown';
  }
  if (!codes || codes > 3 || words > 3 || Boolean(en) === Boolean(id)) return 'unknown';
  return en ? 'en' : 'id';
}
