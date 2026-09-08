// Check-digit math for the numbering schemes you run into on real book and product
// barcodes. ISBN-10 uses mod 11 (with 'X' standing in for 10); ISBN-13, EAN-13, and
// UPC-A all use the same mod-10 scheme once you index weights from the check digit
// outward rather than from the start of the string.

export type CodeType = 'isbn10' | 'isbn13' | 'upc-a';

export interface CheckResult {
  type: CodeType;
  input: string;
  digits: string;
  expectedCheckDigit: string;
  actualCheckDigit: string;
  valid: boolean;
}

/** Strip spaces and hyphens, which are conventional in printed ISBNs. */
export function normalize(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Identify a code by length alone. This is a guess, not a format check -
 * validate() below still verifies the digits are legal for that type.
 */
export function detectType(code: string): CodeType | null {
  const c = normalize(code);
  if (c.length === 10) return 'isbn10';
  if (c.length === 13) return 'isbn13';
  if (c.length === 12) return 'upc-a';
  return null;
}

function assertDigits(s: string, allowTrailingX: boolean): void {
  const body = allowTrailingX ? s.slice(0, -1) : s;
  const last = allowTrailingX ? s.slice(-1) : '';
  if (!/^\d+$/.test(body)) {
    throw new Error(`expected digits, got "${s}"`);
  }
  if (allowTrailingX && !/^[0-9X]$/.test(last)) {
    throw new Error(`final character must be a digit or X, got "${last}"`);
  }
}

/**
 * ISBN-10 weights count down from 10 to 1, left to right, and the full sum
 * (including the check digit itself) must be a multiple of 11. 'X' represents
 * the value 10, which is needed because the check digit is a single character.
 */
export function isbn10CheckDigit(first9: string): string {
  if (first9.length !== 9) throw new Error('isbn-10 payload must be 9 digits');
  assertDigits(first9, false);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += (10 - i) * Number(first9[i]);
  }
  const remainder = sum % 11;
  const check = (11 - remainder) % 11;
  return check === 10 ? 'X' : String(check);
}

export function checkIsbn10(code: string): CheckResult {
  const c = normalize(code);
  if (c.length !== 10) throw new Error('isbn-10 must be 10 characters');
  assertDigits(c, true);
  const expected = isbn10CheckDigit(c.slice(0, 9));
  return {
    type: 'isbn10',
    input: code,
    digits: c,
    expectedCheckDigit: expected,
    actualCheckDigit: c[9],
    valid: expected === c[9],
  };
}

/**
 * Mod-10 check digit shared by ISBN-13, EAN-13, and UPC-A. The weight
 * assigned to each digit depends on its distance from the check digit, not
 * its position from the start of the code, so the same loop works whether
 * the payload is 12 digits (ISBN-13/EAN-13) or 11 digits (UPC-A). The digit
 * immediately to the left of the check digit always carries weight 3.
 */
export function mod10CheckDigit(payload: string): string {
  assertDigits(payload, false);
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const distanceFromEnd = payload.length - 1 - i;
    const weight = distanceFromEnd % 2 === 0 ? 3 : 1;
    sum += weight * Number(payload[i]);
  }
  const check = (10 - (sum % 10)) % 10;
  return String(check);
}

export function checkIsbn13(code: string): CheckResult {
  const c = normalize(code);
  if (c.length !== 13) throw new Error('isbn-13 must be 13 digits');
  assertDigits(c, false);
  const expected = mod10CheckDigit(c.slice(0, 12));
  return {
    type: 'isbn13',
    input: code,
    digits: c,
    expectedCheckDigit: expected,
    actualCheckDigit: c[12],
    valid: expected === c[12],
  };
}

export function checkUpcA(code: string): CheckResult {
  const c = normalize(code);
  if (c.length !== 12) throw new Error('upc-a must be 12 digits');
  assertDigits(c, false);
  const expected = mod10CheckDigit(c.slice(0, 11));
  return {
    type: 'upc-a',
    input: code,
    digits: c,
    expectedCheckDigit: expected,
    actualCheckDigit: c[11],
    valid: expected === c[11],
  };
}

export function validate(code: string, type?: CodeType): CheckResult {
  const t = type ?? detectType(code);
  if (!t) {
    throw new Error(
      `could not tell what kind of code "${code}" is from its length; pass --type`
    );
  }
  if (t === 'isbn10') return checkIsbn10(code);
  if (t === 'isbn13') return checkIsbn13(code);
  return checkUpcA(code);
}

/** Compute the check digit for a payload that's missing its final digit. */
export function generate(payload: string, type: CodeType): string {
  const p = normalize(payload);
  if (type === 'isbn10') return isbn10CheckDigit(p);
  if (type === 'isbn13') return mod10CheckDigit(p);
  return mod10CheckDigit(p);
}
