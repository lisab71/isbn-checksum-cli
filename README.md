# isbn-checksum

Every ISBN, EAN-13, and UPC-A barcode ends in a check digit computed from the
digits before it. If you transpose two digits typing in a code, or a scanner
misreads a smudged barcode, the check digit almost always catches it. This is
a small command-line tool for checking whether a code's check digit is
correct, and for computing the missing check digit when you only have the
payload.

Three formats, three slightly different rules:

- **ISBN-10** - mod 11, weights 10 down to 1, and the check digit can be `X`
  (standing for the value 10) because it has to fit in one character.
- **ISBN-13 / EAN-13** - mod 10, same algorithm used by grocery-store
  barcodes. ISBN-13 is just EAN-13 with a `978` or `979` prefix.
- **UPC-A** - mod 10 as well, one digit shorter than EAN-13.

## Usage

Validate a code (the format is guessed from its length, or pin it down with
`--type`):

```
$ isbn-checksum validate 0-306-40615-2
type:      isbn10
digits:    0306406152
check:     2 (expected 2)
valid

$ isbn-checksum validate 978-0-13-595705-9
type:      isbn13
digits:    9780135957059
check:     9 (expected 9)
valid

$ isbn-checksum validate 036000291452
type:      upc-a
digits:    036000291452
check:     2 (expected 2)
valid

$ isbn-checksum validate 0-306-40615-3
type:      isbn10
digits:    0306406153
check:     3 (expected 2)
INVALID
```

Compute a check digit for a payload that's missing one (here `--type` is
required, since a bare digit string doesn't tell you which scheme to use):

```
$ isbn-checksum generate 030640615 --type isbn10
0306406152

$ isbn-checksum generate 978013595705 --type isbn13
9780135957059
```

Exit code is `0` for a valid code, `1` for an invalid one, `2` for a usage
error.

Validate a batch of codes by piping them in, one per line, with no `<code>`
argument. `--type` still applies to every line if given, otherwise each
line's format is guessed from its length:

```
$ cat codes.txt
0-306-40615-2
036000291452
0-306-40615-3
$ cat codes.txt | isbn-checksum validate
OK   0-306-40615-2  (isbn10, check 2, expected 2)
OK   036000291452  (upc-a, check 2, expected 2)
FAIL 0-306-40615-3  (isbn10, check 3, expected 2)
```

The exit code is `1` if any line is invalid or fails to parse, `0` if every
line is valid.

## Building

No dependencies beyond the TypeScript compiler itself:

```
npm install
npm run build
node dist/cli.js validate 0-306-40615-2
```

## Status

Validation and generation for all three formats, with a test suite covering
each one plus the X check-digit edge case, and batch validation from stdin.
Run it with `npm test`. See the checksum math in `src/checksum.ts` - each
function has a short note on why its weight scheme works the way it does.
