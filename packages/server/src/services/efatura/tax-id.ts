/**
 * Turkish tax identifier validation.
 *
 * Two different numbers identify a party to the revenue administration (GİB):
 *
 *   VKN  — Vergi Kimlik Numarası, 10 digits, issued to legal entities.
 *   TCKN — T.C. Kimlik Numarası, 11 digits, issued to natural persons.
 *
 * They are not interchangeable, and the UBL PartyIdentification schemeID must
 * name the right one. A wrong or malformed number here is a filing error, not
 * a display bug — so these validate rather than coerce. Callers should reject
 * bad input instead of truncating it into a plausible-looking wrong number.
 */

export type TaxScheme = 'VKN' | 'TCKN';

/**
 * Validate a TCKN (11-digit Turkish national ID).
 *
 * Rules, all of which must hold:
 *   1. Exactly 11 digits.
 *   2. The first digit is not 0.
 *   3. digit10 = ((sum of digits 1,3,5,7,9) * 7 - (sum of digits 2,4,6,8)) mod 10
 *   4. digit11 = (sum of digits 1..10) mod 10
 *
 * Rules 3 and 4 are the published checksum. They catch transposition and
 * single-digit typos, which are the realistic data-entry errors here.
 */
export function isValidTckn(value: string): boolean {
  if (!/^[0-9]{11}$/.test(value)) return false;
  if (value[0] === '0') return false;

  const d = [...value].map(Number);

  // Odd-position digits (1st, 3rd, 5th, 7th, 9th) and even-position (2nd, 4th, 6th, 8th).
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
  const evenSum = d[1] + d[3] + d[5] + d[7];

  const check10 = (oddSum * 7 - evenSum) % 10;
  if (((check10 + 10) % 10) !== d[9]) return false;

  const check11 = d.slice(0, 10).reduce((sum, n) => sum + n, 0) % 10;
  return check11 === d[10];
}

/**
 * Validate a VKN (10-digit Turkish tax number for legal entities).
 *
 * Deliberately a FORMAT check only — 10 numeric digits, no checksum.
 *
 * A VKN checksum algorithm circulates widely online (the power-of-2 / mod-9
 * "Maliye" algorithm). It was implemented here and tested against real,
 * publicly published VKNs: it rejects GİB's own documentation example
 * (1288331521) and every real company number tried, at roughly the ~10% rate
 * chance alone would produce. No GİB-published VKN checksum specification
 * could be found to reconcile this — most likely it does not hold for
 * legacy-issued numbers.
 *
 * Rejecting on that algorithm would block real customers from being invoiced,
 * which is far worse than accepting a mistyped VKN that GİB will bounce. So
 * the length/charset rule is the whole check.
 *
 * Note there is NO leading-zero restriction: real VKNs such as 0730015566
 * begin with 0. Always carry a VKN as a string, never a number.
 */
export function isValidVkn(value: string): boolean {
  return /^[0-9]{10}$/.test(value);
}

/**
 * Validate a tax id against the scheme it is filed under.
 *
 * Length alone distinguishes the two (10 vs 11 digits), so a VKN in a TCKN
 * field fails on length before the checksum is reached — which is the
 * intent: the number and the scheme must agree.
 */
export function isValidTaxId(value: string | null | undefined, scheme: TaxScheme): boolean {
  if (!value) return false;
  return scheme === 'TCKN' ? isValidTckn(value) : isValidVkn(value);
}

/**
 * Human-readable reason a tax id is unusable for e-Fatura, or null when it is
 * valid. Callers surface this to the user, so it names the expected shape
 * rather than just saying "invalid".
 */
export function describeTaxIdProblem(
  value: string | null | undefined,
  scheme: TaxScheme,
): string | null {
  const expectedDigits = scheme === 'TCKN' ? 11 : 10;
  const label = scheme === 'TCKN' ? 'TCKN' : 'VKN';

  if (!value || !value.trim()) {
    return `A ${label} is required to generate an e-Fatura for this recipient`;
  }
  if (!/^[0-9]+$/.test(value)) {
    return `${label} must contain digits only`;
  }
  if (value.length !== expectedDigits) {
    return `${label} must be exactly ${expectedDigits} digits`;
  }
  if (!isValidTaxId(value, scheme)) {
    // Only TCKN has a checksum here (see isValidVkn), so a VKN that reaches
    // this point has already passed every check it has.
    return `${label} checksum is invalid — check the number for a typo`;
  }
  return null;
}
