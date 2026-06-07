import {
  type CborExtension,
  type ToCDNOptions,
  type ToJSOptions,
  type FromJSOptions,
} from '@cbortech/cbor';
import {
  CborByteString,
  CborTag,
  CborTextString,
  type CborItem,
} from '@cbortech/cbor/ast';
import { UUID } from '@cbortech/uuid';

const PREFIX_UUID = 'uuid';
const PREFIX_UUID_TAGGED = 'UUID';
const TAG_UUID = 37n;
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function parseUuidString(str: string): Uint8Array {
  if (!UUID_RE.test(str)) {
    throw new SyntaxError(`uuid: invalid UUID: ${JSON.stringify(str)}`);
  }

  const hex = str.split('-').join('').toLowerCase();
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function formatUuidBytes(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new SyntaxError(`uuid: expected 16 bytes, got ${bytes.length}`);
  }

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    ''
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function stringFromAppSequence(prefix: string, items: CborItem[]): string {
  if (items.length !== 1) {
    throw new SyntaxError(`${prefix}<<...>>: expected exactly one item`);
  }

  const item = items[0];
  if (item instanceof CborTextString) return item.value;
  if (item instanceof CborByteString) {
    return new TextDecoder('utf-8', { fatal: true }).decode(item.value);
  }

  throw new SyntaxError(
    `${prefix}<<...>>: expected a text string or byte string`
  );
}

export class CborUuidExt extends CborByteString {
  override _toCDN(options: ToCDNOptions | undefined, depth: number): string {
    if (options?.appStrings === false) return super._toCDN(options, depth);
    return `${PREFIX_UUID}'${formatUuidBytes(this.value)}'`;
  }
}

export class CborTaggedUuidExt extends CborTag {
  constructor(content: CborByteString) {
    super(TAG_UUID, content);
  }

  override _toCDN(options: ToCDNOptions | undefined, depth: number): string {
    if (options?.appStrings === false) return super._toCDN(options, depth);
    if (this.content instanceof CborByteString) {
      return `${PREFIX_UUID_TAGGED}'${formatUuidBytes(this.content.value)}'`;
    }
    return super._toCDN(options, depth);
  }
}

export class CborTaggedUuidAsUUIDExt extends CborTaggedUuidExt {
  override _toJS(_options?: ToJSOptions): UUID {
    return new UUID((this.content as CborByteString).value);
  }
}

function buildUuidValue(
  prefix: string,
  content: string,
  useUUID: boolean
): CborItem {
  const bytes = parseUuidString(content);
  const byteString = new CborByteString(bytes);

  if (prefix === PREFIX_UUID_TAGGED) {
    return useUUID
      ? new CborTaggedUuidAsUUIDExt(byteString)
      : new CborTaggedUuidExt(byteString);
  }

  return new CborUuidExt(bytes);
}

export function createUuidExtension(options?: {
  jsUUID?: boolean;
}): CborExtension {
  const useUUID = options?.jsUUID ?? false;

  const ext: CborExtension = {
    appStringPrefixes: [PREFIX_UUID, PREFIX_UUID_TAGGED],
    tagNumbers: [TAG_UUID],

    parseAppString(prefix: string, content: string): CborItem {
      return buildUuidValue(prefix, content, useUUID);
    },

    parseAppSequence(prefix: string, items: CborItem[]): CborItem {
      return buildUuidValue(
        prefix,
        stringFromAppSequence(prefix, items),
        useUUID
      );
    },

    parseTag(tag: bigint, value: CborItem): CborItem | undefined {
      if (tag !== TAG_UUID) return undefined;
      if (value instanceof CborByteString && value.value.length === 16) {
        return useUUID
          ? new CborTaggedUuidAsUUIDExt(value)
          : new CborTaggedUuidExt(value);
      }
      return undefined;
    },
  };

  if (useUUID) {
    ext.fromJS = (
      value: unknown,
      _options: FromJSOptions
    ): CborItem | undefined => {
      if (value instanceof UUID)
        return new CborTaggedUuidAsUUIDExt(new CborByteString(value.toBytes()));
      return undefined;
    };
    ext.isJSType = (value: unknown): value is UUID => value instanceof UUID;
  }

  return ext;
}

export const uuid: CborExtension = createUuidExtension();

export const uuid_as_UUID: CborExtension = createUuidExtension({
  jsUUID: true,
});

export default uuid;
