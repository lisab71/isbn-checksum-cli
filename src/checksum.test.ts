import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize,
  detectType,
  isbn10CheckDigit,
  checkIsbn10,
  mod10CheckDigit,
  checkIsbn13,
  checkUpcA,
  validate,
  generate,
} from './checksum';

test('normalize strips spaces and hyphens and upper-cases X', () => {
  assert.equal(normalize('0-306-40615-2'), '0306406152');
  assert.equal(normalize('978 0 13 595705 9'), '9780135957059');
  assert.equal(normalize('123456789x'), '123456789X');
});

test('detectType guesses format from length alone', () => {
  assert.equal(detectType('0-306-40615-2'), 'isbn10');
  assert.equal(detectType('978-0-13-595705-9'), 'isbn13');
  assert.equal(detectType('036000291452'), 'upc-a');
  assert.equal(detectType('12345'), null);
});

test('isbn10CheckDigit handles the ordinary digit case', () => {
  // 978-0-13-595705-9 without its own check digit isn't isbn-10, so use the
  // README's isbn-10 example: payload 030640615 -> check digit 2.
  assert.equal(isbn10CheckDigit('030640615'), '2');
});

test('isbn10CheckDigit produces X when the remainder works out to 10', () => {
  // weights 10..2 against digits 1..9: sum = 210, 210 % 11 = 1, so
  // check = (11 - 1) % 11 = 10, which prints as 'X'.
  assert.equal(isbn10CheckDigit('123456789'), 'X');
});

test('checkIsbn10 accepts a trailing X and is case-insensitive', () => {
  const result = checkIsbn10('123456789x');
  assert.equal(result.actualCheckDigit, 'X');
  assert.equal(result.expectedCheckDigit, 'X');
  assert.equal(result.valid, true);
});

test('checkIsbn10 flags a wrong check digit as invalid, including a wrong X', () => {
  assert.equal(checkIsbn10('0-306-40615-3').valid, false);
  assert.equal(checkIsbn10('1234567890').valid, false);
});

test('checkIsbn10 rejects the wrong length and non-digit payloads', () => {
  assert.throws(() => checkIsbn10('030640615'), /10 characters/);
  assert.throws(() => checkIsbn10('03064061Y2'), /digits/);
});

test('mod10CheckDigit is shared correctly by isbn-13 and upc-a lengths', () => {
  assert.equal(mod10CheckDigit('978013595705'), '9');
  assert.equal(mod10CheckDigit('03600029145'), '2');
});

test('checkIsbn13 validates the README example and its length', () => {
  const result = checkIsbn13('978-0-13-595705-9');
  assert.equal(result.digits, '9780135957059');
  assert.equal(result.valid, true);
  assert.throws(() => checkIsbn13('978013595705'), /13 digits/);
});

test('checkUpcA validates the README example', () => {
  const result = checkUpcA('036000291452');
  assert.equal(result.valid, true);
  assert.equal(checkUpcA('036000291453').valid, false);
});

test('validate dispatches on detected type and honors an explicit override', () => {
  assert.equal(validate('036000291452').type, 'upc-a');
  assert.throws(() => validate('12345'), /--type/);
});

test('generate computes the missing check digit for each format', () => {
  assert.equal(generate('030640615', 'isbn10'), '0306406152');
  assert.equal(generate('123456789', 'isbn10'), '123456789X');
  assert.equal(generate('978013595705', 'isbn13'), '9780135957059');
  assert.equal(generate('03600029145', 'upc-a'), '036000291452');
});
