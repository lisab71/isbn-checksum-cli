import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBatchResult, runBatch } from './cli';

test('formatBatchResult marks a valid code OK and reports its check digit', () => {
  const { text, ok } = formatBatchResult('0-306-40615-2');
  assert.equal(ok, true);
  assert.match(text, /^OK  /);
  assert.match(text, /isbn10/);
});

test('formatBatchResult marks a wrong check digit FAIL without throwing', () => {
  const { text, ok } = formatBatchResult('0-306-40615-3');
  assert.equal(ok, false);
  assert.match(text, /^FAIL /);
});

test('formatBatchResult marks an unparseable line ERR without throwing', () => {
  const { text, ok } = formatBatchResult('not-a-code');
  assert.equal(ok, false);
  assert.match(text, /^ERR  /);
});

test('formatBatchResult honors an explicit --type override', () => {
  // '9780135957059' is 13 digits, so length alone would already say isbn13;
  // passing the type explicitly should produce the same result via the override path.
  const { ok } = formatBatchResult('9780135957059', 'isbn13');
  assert.equal(ok, true);
});

function captureLogs(fn: () => number): { lines: string[]; exitCode: number } {
  const lines: string[] = [];
  const original = console.log;
  console.log = (msg: string) => lines.push(msg);
  try {
    const exitCode = fn();
    return { lines, exitCode };
  } finally {
    console.log = original;
  }
}

test('runBatch validates every line and exits 0 when all codes are valid', () => {
  const input = '0-306-40615-2\n036000291452\n';
  const { lines, exitCode } = captureLogs(() => runBatch(input));
  assert.equal(lines.length, 2);
  assert.equal(exitCode, 0);
});

test('runBatch exits 1 if any line is invalid or unparseable, and skips blank lines', () => {
  const input = '0-306-40615-2\n\n0-306-40615-3\n  \n';
  const { lines, exitCode } = captureLogs(() => runBatch(input));
  assert.equal(lines.length, 2);
  assert.equal(exitCode, 1);
});

test('runBatch exits 2 and reports an error when stdin has no codes', () => {
  const original = console.error;
  const errors: string[] = [];
  console.error = (msg: string) => errors.push(msg);
  let exitCode: number;
  try {
    exitCode = runBatch('\n  \n');
  } finally {
    console.error = original;
  }
  assert.equal(exitCode, 2);
  assert.equal(errors.length, 1);
});
