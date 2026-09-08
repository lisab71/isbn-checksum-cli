#!/usr/bin/env node
import { CodeType, detectType, generate, validate } from './checksum';

const USAGE = `isbn-checksum - validate or generate check digits for barcodes

Usage:
  isbn-checksum validate <code> [--type isbn10|isbn13|upc-a]
  isbn-checksum generate <payload> --type isbn10|isbn13|upc-a
  isbn-checksum --help

Examples:
  isbn-checksum validate 0-306-40615-2
  isbn-checksum validate 978-0-13-595705-9
  isbn-checksum validate 036000291452
  isbn-checksum generate 030640615 --type isbn10
  isbn-checksum generate 978013595705 --type isbn13
`;

function parseType(args: string[]): CodeType | undefined {
  const i = args.indexOf('--type');
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (value !== 'isbn10' && value !== 'isbn13' && value !== 'upc-a') {
    throw new Error(`--type must be one of isbn10, isbn13, upc-a (got "${value}")`);
  }
  return value;
}

function stripFlags(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type') {
      i++; // skip its value
      continue;
    }
    out.push(args[i]);
  }
  return out;
}

function runValidate(args: string[]): number {
  const type = parseType(args);
  const [code] = stripFlags(args);
  if (!code) {
    console.error('validate needs a code to check, e.g. isbn-checksum validate 0-306-40615-2');
    return 2;
  }
  const result = validate(code, type);
  console.log(`type:      ${result.type}`);
  console.log(`digits:    ${result.digits}`);
  console.log(`check:     ${result.actualCheckDigit} (expected ${result.expectedCheckDigit})`);
  console.log(result.valid ? 'valid' : 'INVALID');
  return result.valid ? 0 : 1;
}

function runGenerate(args: string[]): number {
  const type = parseType(args);
  const [payload] = stripFlags(args);
  if (!payload) {
    console.error('generate needs a payload, e.g. isbn-checksum generate 030640615 --type isbn10');
    return 2;
  }
  if (!type) {
    console.error('generate needs --type isbn10|isbn13|upc-a since a bare payload has no clue to its format');
    return 2;
  }
  const check = generate(payload, type);
  console.log(`${payload.replace(/[\s-]/g, '')}${check}`);
  return 0;
}

function main(argv: string[]): number {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    return command ? 0 : 2;
  }

  try {
    if (command === 'validate') return runValidate(rest);
    if (command === 'generate') return runGenerate(rest);
    console.error(`unknown command "${command}"\n`);
    console.log(USAGE);
    return 2;
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    return 1;
  }
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

// Exported for the type-detection help path and for tests added later.
export { main, USAGE };
export type { CodeType };
export { detectType };
