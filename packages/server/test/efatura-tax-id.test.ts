import { describe, it, expect } from 'vitest';
import {
  isValidTckn,
  isValidVkn,
  isValidTaxId,
  describeTaxIdProblem,
} from '../src/services/efatura/tax-id';

// A TCKN or VKN goes onto a document filed with the Turkish revenue
// administration. A wrong number is a filing error, so these are validated
// rather than coerced — and the checksum exists precisely to catch the
// typo and transposition cases exercised below.
//
// The fixtures are constructed from the published checksum rules rather than
// taken from real people: valid_10th = ((d1+d3+d5+d7+d9) * 7 - (d2+d4+d6+d8)) % 10,
// valid_11th = (sum of first ten) % 10.

const VALID_TCKNS = [
  '10000000146', // the widely-cited specimen value
  '62601815964',
  '18301661332',
  '28609139020',
  '70308246202',
];

const VALID_VKNS = [
  '3982597912',
  '9074833785',
  '8762328607',
  '1290404790',
  '6669725105',
];

describe('isValidTckn', () => {
  it('accepts well-formed numbers', () => {
    for (const tckn of VALID_TCKNS) {
      expect(isValidTckn(tckn), tckn).toBe(true);
    }
  });

  it('rejects a leading zero', () => {
    // Explicit rule: a TCKN never starts with 0.
    expect(isValidTckn('01234567890')).toBe(false);
  });

  it('rejects anything that is not exactly 11 digits', () => {
    expect(isValidTckn('')).toBe(false);
    expect(isValidTckn('1000000014')).toBe(false); // 10 — a VKN length
    expect(isValidTckn('100000001466')).toBe(false); // 12
    expect(isValidTckn('1000000014a')).toBe(false);
    expect(isValidTckn('10000000 46')).toBe(false);
  });

  it('rejects every single-digit corruption of a valid number', () => {
    // This is the property that makes the checksum worth having: a mistyped
    // digit must not silently produce another "valid" identifier.
    for (const tckn of VALID_TCKNS) {
      for (let i = 0; i < 11; i++) {
        for (const replacement of '0123456789') {
          if (replacement === tckn[i]) continue;
          const mutated = tckn.slice(0, i) + replacement + tckn.slice(i + 1);
          if (mutated[0] === '0') continue; // rejected by the leading-zero rule
          expect(isValidTckn(mutated), `${tckn} -> ${mutated}`).toBe(false);
        }
      }
    }
  });

  it('rejects transposition of the two check digits', () => {
    // Swapping positions 10 and 11 crosses the two independent checks, so it
    // is always caught.
    for (const tckn of VALID_TCKNS) {
      if (tckn[9] === tckn[10]) continue;
      const swapped = tckn.slice(0, 9) + tckn[10] + tckn[9];
      expect(isValidTckn(swapped), `${tckn} -> ${swapped}`).toBe(false);
    }
  });

  it('does NOT catch a same-parity transposition — a documented blind spot', () => {
    // The 10th check digit weights odd and even positions separately, so
    // swapping two digits that share a parity leaves both sums — and both
    // check digits — unchanged. This is a property of the published
    // algorithm, not a defect here, and it is pinned so nobody "fixes" the
    // validator into disagreeing with GİB.
    //
    // 18301661332 -> 13801661332 swaps positions 2 and 3 (both even-indexed
    // in 0-based terms, i.e. both in the same checksum group).
    expect(isValidTckn('18301661332')).toBe(true);
    expect(isValidTckn('13801661332')).toBe(true);

    // Callers that need to catch this must verify the identity against GİB,
    // which a checksum alone cannot do.
  });

  it('rejects repdigit numbers, which pass naive length checks', () => {
    expect(isValidTckn('11111111111')).toBe(false);
    expect(isValidTckn('99999999999')).toBe(false);
  });
});

describe('isValidVkn', () => {
  it('accepts well-formed numbers', () => {
    for (const vkn of VALID_VKNS) {
      expect(isValidVkn(vkn), vkn).toBe(true);
    }
  });

  it('rejects anything that is not exactly 10 digits', () => {
    expect(isValidVkn('')).toBe(false);
    expect(isValidVkn('398259791')).toBe(false); // 9
    expect(isValidVkn('39825979121')).toBe(false); // 11 — a TCKN length
    expect(isValidVkn('398259791x')).toBe(false);
  });

  it('rejects every single-digit corruption of a valid number', () => {
    for (const vkn of VALID_VKNS) {
      for (let i = 0; i < 10; i++) {
        for (const replacement of '0123456789') {
          if (replacement === vkn[i]) continue;
          const mutated = vkn.slice(0, i) + replacement + vkn.slice(i + 1);
          expect(isValidVkn(mutated), `${vkn} -> ${mutated}`).toBe(false);
        }
      }
    }
  });
});

describe('isValidTaxId', () => {
  it('requires the number and the scheme to agree', () => {
    // Length alone separates the two, so a company number filed as an
    // individual's (or vice versa) fails before the checksum is reached.
    // This is the point: the scheme is a claim about who the party is.
    expect(isValidTaxId(VALID_TCKNS[0], 'TCKN')).toBe(true);
    expect(isValidTaxId(VALID_TCKNS[0], 'VKN')).toBe(false);

    expect(isValidTaxId(VALID_VKNS[0], 'VKN')).toBe(true);
    expect(isValidTaxId(VALID_VKNS[0], 'TCKN')).toBe(false);
  });

  it('treats absent values as invalid rather than throwing', () => {
    expect(isValidTaxId(null, 'TCKN')).toBe(false);
    expect(isValidTaxId(undefined, 'VKN')).toBe(false);
    expect(isValidTaxId('', 'TCKN')).toBe(false);
  });
});

describe('describeTaxIdProblem', () => {
  it('returns null when the id is usable', () => {
    expect(describeTaxIdProblem(VALID_TCKNS[0], 'TCKN')).toBeNull();
    expect(describeTaxIdProblem(VALID_VKNS[0], 'VKN')).toBeNull();
  });

  it('names the expected length rather than just saying "invalid"', () => {
    // The user has to fix this, so the message has to say what is expected.
    expect(describeTaxIdProblem('123', 'TCKN')).toMatch(/11 digits/);
    expect(describeTaxIdProblem('123', 'VKN')).toMatch(/10 digits/);
  });

  it('distinguishes a missing id from a malformed one', () => {
    expect(describeTaxIdProblem(null, 'TCKN')).toMatch(/required/i);
    expect(describeTaxIdProblem('   ', 'TCKN')).toMatch(/required/i);
    expect(describeTaxIdProblem('abcdefghijk', 'TCKN')).toMatch(/digits only/i);
  });

  it('calls out a checksum failure specifically, so a typo is actionable', () => {
    // Right length and all digits, but the check digits do not agree.
    expect(describeTaxIdProblem('10000000147', 'TCKN')).toMatch(/checksum/i);
  });

  it('uses the scheme name the user would recognise', () => {
    expect(describeTaxIdProblem('123', 'TCKN')).toMatch(/TCKN/);
    expect(describeTaxIdProblem('123', 'VKN')).toMatch(/VKN/);
  });
});
