import { describe, expect, test } from 'vitest';
import { CBOR, type ParseWarning } from '@cbortech/cbor';
import { CborByteString, CborTag } from '@cbortech/cbor/ast';
import { UUID } from '@cbortech/uuid';
import {
  CborTaggedUuidAsUUIDExt,
  CborTaggedUuidExt,
  CborUuidExt,
  uuid,
  uuid_as_UUID,
} from './index';

const TEXT = '019e226f-78d8-7892-8c91-79013e6905e2';
const TEXT_UPPER = '019E226F-78D8-7892-8C91-79013E6905E2';
const BYTES = new Uint8Array([
  0x01, 0x9e, 0x22, 0x6f, 0x78, 0xd8, 0x78, 0x92, 0x8c, 0x91, 0x79, 0x01, 0x3e,
  0x69, 0x05, 0xe2,
]);

const cbor = new CBOR({ extensions: [uuid] });

describe("uuid — uuid'...'", () => {
  test('parses UUID app-string into a bare 16-byte string', () => {
    const value = cbor.fromCDN(`uuid'${TEXT}'`);

    expect(value).toBeInstanceOf(CborUuidExt);
    expect((value as CborUuidExt).value).toEqual(BYTES);
    expect(value.toJS()).toEqual(BYTES);
    expect(value.toCDN()).toBe(`uuid'${TEXT}'`);
  });

  test('parses raw app-string form', () => {
    const value = cbor.fromCDN(`uuid\`${TEXT}\``);

    expect(value).toBeInstanceOf(CborUuidExt);
    expect((value as CborUuidExt).value).toEqual(BYTES);
    expect(value.toCDN()).toBe(`uuid'${TEXT}'`);
  });

  test('normalizes uppercase hex to lowercase canonical CDN', () => {
    const value = cbor.fromCDN(`uuid'${TEXT_UPPER}'`);

    expect(value.toCDN()).toBe(`uuid'${TEXT}'`);
  });

  test('falls back to plain byte string when appStrings is false', () => {
    const value = cbor.fromCDN(`uuid'${TEXT}'`);

    expect(value.toCDN({ appStrings: false })).toBe(
      "h'019e226f78d878928c9179013e6905e2'"
    );
  });
});

describe("uuid — UUID'...'", () => {
  test('parses UUID app-string into tag 37 over a 16-byte string', () => {
    const value = cbor.fromCDN(`UUID'${TEXT}'`);

    expect(value).toBeInstanceOf(CborTaggedUuidExt);
    expect((value as CborTaggedUuidExt).tag).toBe(37n);
    expect((value as CborTaggedUuidExt).content).toBeInstanceOf(CborByteString);
    expect(
      ((value as CborTaggedUuidExt).content as CborByteString).value
    ).toEqual(BYTES);
    expect(value.toCDN()).toBe(`UUID'${TEXT}'`);
  });

  test('falls back to numeric tag notation when appStrings is false', () => {
    const value = cbor.fromCDN(`UUID'${TEXT}'`);

    expect(value.toCDN({ appStrings: false })).toBe(
      "37(h'019e226f78d878928c9179013e6905e2')"
    );
  });

  test('round-trips through CBOR decoding with the extension', () => {
    const encoded = cbor.fromCDN(`UUID'${TEXT}'`).toCBOR();
    const decoded = cbor.fromCBOR(encoded);

    expect(decoded).toBeInstanceOf(CborTaggedUuidExt);
    expect(decoded.toCDN()).toBe(`UUID'${TEXT}'`);
  });

  test('does not claim tag 37 values that are not 16-byte strings', () => {
    const decoded = cbor.fromCDN("37(h'00')");

    expect(decoded).toBeInstanceOf(CborTag);
    expect(decoded).not.toBeInstanceOf(CborTaggedUuidExt);
  });
});

describe('uuid — app-sequence form', () => {
  test("uuid<<'...'>> parses byte-string content as UTF-8 UUID text", () => {
    const value = cbor.fromCDN(`uuid<<'${TEXT}'>>`);

    expect(value).toBeInstanceOf(CborUuidExt);
    expect(value.toCDN()).toBe(`uuid'${TEXT}'`);
  });

  test('UUID<<"...">> parses text-string content as tagged UUID', () => {
    const value = cbor.fromCDN(`UUID<<"${TEXT}">>`);

    expect(value).toBeInstanceOf(CborTaggedUuidExt);
    expect(value.toCDN()).toBe(`UUID'${TEXT}'`);
  });

  test("uuid<<'no-dash'>> recovers from no-dash byte-string UUID in non-strict mode", () => {
    const TEXT_NO_DASHES = '019e226f78d878928c9179013e6905e2';
    const warnings: ParseWarning[] = [];
    const value = cbor.fromCDN(`uuid<<'${TEXT_NO_DASHES}'>>`, {
      strict: false,
      onWarning: (w) => warnings.push(w),
      silent: true,
    });

    expect(value).toBeInstanceOf(CborUuidExt);
    expect((value as CborUuidExt).value).toEqual(BYTES);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain(TEXT_NO_DASHES);
  });
});

describe('uuid_as_UUID', () => {
  const cbor = new CBOR({ extensions: [uuid_as_UUID] });

  test("uuid'...' still returns Uint8Array from toJS()", () => {
    const value = cbor.fromCDN(`uuid'${TEXT}'`);

    expect(value).toBeInstanceOf(CborUuidExt);
    expect(value.toJS()).toEqual(BYTES);
  });

  test("UUID'...' returns a UUID object from toJS()", () => {
    const value = cbor.fromCDN(`UUID'${TEXT}'`);

    expect(value).toBeInstanceOf(CborTaggedUuidAsUUIDExt);
    expect(value.toJS()).toBeInstanceOf(UUID);
    expect((value.toJS() as UUID).toString()).toBe(TEXT);
  });

  test("UUID'...' toCDN() still emits UUID'...' notation", () => {
    const value = cbor.fromCDN(`UUID'${TEXT}'`);

    expect(value.toCDN()).toBe(`UUID'${TEXT}'`);
  });

  test('CBOR binary tag 37 decodes to UUID object via toJS()', () => {
    const encoded = new CBOR({ extensions: [uuid] })
      .fromCDN(`UUID'${TEXT}'`)
      .toCBOR();
    const decoded = cbor.fromCBOR(encoded);

    expect(decoded).toBeInstanceOf(CborTaggedUuidAsUUIDExt);
    expect(decoded.toJS()).toBeInstanceOf(UUID);
    expect((decoded.toJS() as UUID).toString()).toBe(TEXT);
  });

  test('fromJS(UUID) round-trips through CBOR', () => {
    const original = new UUID(TEXT);
    const encoded = cbor.fromJS(original).toCBOR();
    const decoded = cbor.fromCBOR(encoded);

    expect(decoded).toBeInstanceOf(CborTaggedUuidAsUUIDExt);
    expect((decoded.toJS() as UUID).toString()).toBe(TEXT);
  });

  test('fromJS(UUID) produces tagged form (tag 37)', () => {
    const item = cbor.fromJS(new UUID(TEXT));

    expect(item).toBeInstanceOf(CborTaggedUuidAsUUIDExt);
    expect(item.toCDN()).toBe(`UUID'${TEXT}'`);
  });

  test('does not claim tag 37 values that are not 16-byte strings', () => {
    const decoded = cbor.fromCDN("37(h'00')");

    expect(decoded).toBeInstanceOf(CborTag);
    expect(decoded).not.toBeInstanceOf(CborTaggedUuidExt);
  });
});

describe('uuid — invalid input', () => {
  test.each([
    '019e226f78d878928c9179013e6905e2',
    '019e226f-78d8-7892-8c91-79013e6905e',
    '019e226f-78d8-7892-8c91-79013e6905e22',
    '019e226f-78d8-7892-8c91-79013e6905eg',
  ])('rejects %s (strict mode)', (text) => {
    expect(() => cbor.fromCDN(`uuid'${text}'`)).toThrow(SyntaxError);
  });
});

describe('uuid — strict: false', () => {
  const TEXT_NO_DASHES = '019e226f78d878928c9179013e6905e2';

  test('accepts no-dash UUID with warning and continues parsing', () => {
    const warnings: ParseWarning[] = [];
    const value = cbor.fromCDN(`uuid'${TEXT_NO_DASHES}'`, {
      strict: false,
      onWarning: (w) => warnings.push(w),
      silent: true,
    });

    expect(value).toBeInstanceOf(CborUuidExt);
    expect((value as CborUuidExt).value).toEqual(BYTES);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain(TEXT_NO_DASHES);
  });

  test('accepts no-dash UUID in UUID-tagged form with warning', () => {
    const warnings: ParseWarning[] = [];
    const value = cbor.fromCDN(`UUID'${TEXT_NO_DASHES}'`, {
      strict: false,
      onWarning: (w) => warnings.push(w),
      silent: true,
    });

    expect(value).toBeInstanceOf(CborTaggedUuidExt);
    expect(warnings).toHaveLength(1);
  });

  test.each([
    '019e226f-78d8-7892-8c91-79013e6905e',
    '019e226f-78d8-7892-8c91-79013e6905e22',
    '019e226f-78d8-7892-8c91-79013e6905eg',
  ])(
    'emits warning for %s (UUID class also rejects it) in non-strict mode',
    (text) => {
      const warnings: ParseWarning[] = [];
      const value = cbor.fromCDN(`uuid'${text}'`, {
        strict: false,
        onWarning: (w) => warnings.push(w),
        silent: true,
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain(text);
      // CDN parser returns an unresolved fallback node when the extension throws
      expect(value.toCDN()).toContain(`uuid'${text}'`);
    }
  );

  const NIL_UUID = '00000000-0000-0000-0000-000000000000';
  const NIL_BYTES = new Uint8Array(16);

  test('uuid<<null>> is accepted as Nil UUID with warning in non-strict mode', () => {
    const warnings: ParseWarning[] = [];
    const value = cbor.fromCDN('uuid<<null>>', {
      strict: false,
      onWarning: (w) => warnings.push(w),
      silent: true,
    });

    expect(value).toBeInstanceOf(CborUuidExt);
    expect((value as CborUuidExt).value).toEqual(NIL_BYTES);
    expect(value.toCDN()).toBe(`uuid'${NIL_UUID}'`);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('null');
  });

  test('UUID<<null>> is accepted as tagged Nil UUID with warning in non-strict mode', () => {
    const warnings: ParseWarning[] = [];
    const value = cbor.fromCDN('UUID<<null>>', {
      strict: false,
      onWarning: (w) => warnings.push(w),
      silent: true,
    });

    expect(value).toBeInstanceOf(CborTaggedUuidExt);
    expect(value.toCDN()).toBe(`UUID'${NIL_UUID}'`);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('null');
  });

  test('uuid<<null>> throws SyntaxError in strict mode (default)', () => {
    expect(() => cbor.fromCDN('uuid<<null>>')).toThrow(SyntaxError);
  });

  test('UUID<<null>> throws SyntaxError in strict mode (default)', () => {
    expect(() => cbor.fromCDN('UUID<<null>>')).toThrow(SyntaxError);
  });

  // BYTES = [0x01, 0x9e, ...] — not valid UTF-8, so treated as raw UUIDBytes
  const BYTES_HEX = '019e226f78d878928c9179013e6905e2';

  test('uuid<<h"...16 raw bytes...">> is accepted with warning in non-strict mode', () => {
    const warnings: ParseWarning[] = [];
    const value = cbor.fromCDN(`uuid<<h'${BYTES_HEX}'>>`, {
      strict: false,
      onWarning: (w) => warnings.push(w),
      silent: true,
    });

    expect(value).toBeInstanceOf(CborUuidExt);
    expect((value as CborUuidExt).value).toEqual(BYTES);
    expect(value.toCDN()).toBe(`uuid'${TEXT}'`);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('bytes');
  });

  test('UUID<<h"...16 raw bytes...">> is accepted as tagged UUID with warning in non-strict mode', () => {
    const warnings: ParseWarning[] = [];
    const value = cbor.fromCDN(`UUID<<h'${BYTES_HEX}'>>`, {
      strict: false,
      onWarning: (w) => warnings.push(w),
      silent: true,
    });

    expect(value).toBeInstanceOf(CborTaggedUuidExt);
    expect(value.toCDN()).toBe(`UUID'${TEXT}'`);
    expect(warnings).toHaveLength(1);
  });

  test('uuid<<h"...raw bytes...">> throws SyntaxError in strict mode (default)', () => {
    expect(() => cbor.fromCDN(`uuid<<h'${BYTES_HEX}'>>`)).toThrow(SyntaxError);
  });
});
