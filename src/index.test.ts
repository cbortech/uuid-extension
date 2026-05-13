import { describe, expect, test } from 'vitest';
import { CBOR } from '@cbortech/cbor';
import { CborByteString, CborTag } from '@cbortech/cbor/ast';
import { CborTaggedUuidExt, CborUuidExt, uuid } from './index';

const TEXT = '019e226f-78d8-7892-8c91-79013e6905e2';
const TEXT_UPPER = '019E226F-78D8-7892-8C91-79013E6905E2';
const BYTES = new Uint8Array([
  0x01, 0x9e, 0x22, 0x6f, 0x78, 0xd8, 0x78, 0x92, 0x8c, 0x91, 0x79, 0x01, 0x3e,
  0x69, 0x05, 0xe2,
]);

const cbor = new CBOR({ extensions: [uuid] });

describe("uuid — uuid'...'", () => {
  test('parses UUID app-string into a bare 16-byte string', () => {
    const value = cbor.fromEDN(`uuid'${TEXT}'`);

    expect(value).toBeInstanceOf(CborUuidExt);
    expect((value as CborUuidExt).value).toEqual(BYTES);
    expect(value.toJS()).toEqual(BYTES);
    expect(value.toEDN()).toBe(`uuid'${TEXT}'`);
  });

  test('parses raw app-string form', () => {
    const value = cbor.fromEDN(`uuid\`${TEXT}\``);

    expect(value).toBeInstanceOf(CborUuidExt);
    expect((value as CborUuidExt).value).toEqual(BYTES);
    expect(value.toEDN()).toBe(`uuid'${TEXT}'`);
  });

  test('normalizes uppercase hex to lowercase canonical EDN', () => {
    const value = cbor.fromEDN(`uuid'${TEXT_UPPER}'`);

    expect(value.toEDN()).toBe(`uuid'${TEXT}'`);
  });

  test('falls back to plain byte string when appStrings is false', () => {
    const value = cbor.fromEDN(`uuid'${TEXT}'`);

    expect(value.toEDN({ appStrings: false })).toBe(
      "h'019e226f78d878928c9179013e6905e2'"
    );
  });
});

describe("uuid — UUID'...'", () => {
  test('parses UUID app-string into tag 37 over a 16-byte string', () => {
    const value = cbor.fromEDN(`UUID'${TEXT}'`);

    expect(value).toBeInstanceOf(CborTaggedUuidExt);
    expect((value as CborTaggedUuidExt).tag).toBe(37n);
    expect((value as CborTaggedUuidExt).content).toBeInstanceOf(CborByteString);
    expect(
      ((value as CborTaggedUuidExt).content as CborByteString).value
    ).toEqual(BYTES);
    expect(value.toEDN()).toBe(`UUID'${TEXT}'`);
  });

  test('falls back to numeric tag notation when appStrings is false', () => {
    const value = cbor.fromEDN(`UUID'${TEXT}'`);

    expect(value.toEDN({ appStrings: false })).toBe(
      "37(h'019e226f78d878928c9179013e6905e2')"
    );
  });

  test('round-trips through CBOR decoding with the extension', () => {
    const encoded = cbor.fromEDN(`UUID'${TEXT}'`).toCBOR();
    const decoded = cbor.fromCBOR(encoded);

    expect(decoded).toBeInstanceOf(CborTaggedUuidExt);
    expect(decoded.toEDN()).toBe(`UUID'${TEXT}'`);
  });

  test('does not claim tag 37 values that are not 16-byte strings', () => {
    const decoded = cbor.fromEDN("37(h'00')");

    expect(decoded).toBeInstanceOf(CborTag);
    expect(decoded).not.toBeInstanceOf(CborTaggedUuidExt);
  });
});

describe('uuid — app-sequence form', () => {
  test("uuid<<'...'>> parses byte-string content as UTF-8 UUID text", () => {
    const value = cbor.fromEDN(`uuid<<'${TEXT}'>>`);

    expect(value).toBeInstanceOf(CborUuidExt);
    expect(value.toEDN()).toBe(`uuid'${TEXT}'`);
  });

  test('UUID<<"...">> parses text-string content as tagged UUID', () => {
    const value = cbor.fromEDN(`UUID<<"${TEXT}">>`);

    expect(value).toBeInstanceOf(CborTaggedUuidExt);
    expect(value.toEDN()).toBe(`UUID'${TEXT}'`);
  });
});

describe('uuid — invalid input', () => {
  test.each([
    '019e226f78d878928c9179013e6905e2',
    '019e226f-78d8-7892-8c91-79013e6905e',
    '019e226f-78d8-7892-8c91-79013e6905e22',
    '019e226f-78d8-7892-8c91-79013e6905eg',
  ])('rejects %s', (text) => {
    expect(() => cbor.fromEDN(`uuid'${text}'`)).toThrow(SyntaxError);
  });
});
