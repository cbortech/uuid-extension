import {
  type CborExtension,
  type ToCDNOptions,
  type ToJSOptions,
  type FromJSOptions,
} from '@cbortech/cbor';
import {
  CborByteString,
  CborSimple,
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

type EncodingWidth = Exclude<CborByteString['encodingWidth'], undefined>;

function resolveEiSuffix(
  options: ToCDNOptions | undefined,
  encodingWidth: CborByteString['encodingWidth'],
  canonicalWidth: EncodingWidth
): string {
  const mode = options?.encodingIndicators ?? 'auto';
  if (mode === 'never') return '';
  if (mode === 'always') return `_${encodingWidth ?? canonicalWidth}`;
  return encodingWidth !== undefined ? `_${encodingWidth}` : '';
}

function parseUuidString(
  str: string,
  onError?: (msg: string) => void
): Uint8Array {
  if (!UUID_RE.test(str)) {
    let parsed: UUID;
    try {
      parsed = new UUID(str);
    } catch {
      throw new SyntaxError(`uuid: invalid UUID: ${JSON.stringify(str)}`);
    }
    if (onError) {
      onError(`uuid: non-standard UUID format: ${JSON.stringify(str)}`);
      return parsed.toBytes();
    }
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

export class CborUuidExt extends CborByteString {
  override _toCDN(options: ToCDNOptions | undefined, depth: number): string {
    if (options?.appStrings === false) return super._toCDN(options, depth);
    // A bare uuid literal represents a 16-byte string (canonical AI is inline).
    const eiSuffix = resolveEiSuffix(options, this.encodingWidth, 'i');
    return `${PREFIX_UUID}'${formatUuidBytes(this.value)}'${eiSuffix}`;
  }
}

export class CborTaggedUuidExt extends CborTag {
  constructor(
    content: CborByteString,
    options?: { encodingWidth?: EncodingWidth }
  ) {
    super(TAG_UUID, content, options);
  }

  override _toCDN(options: ToCDNOptions | undefined, depth: number): string {
    if (options?.appStrings === false) return super._toCDN(options, depth);
    if (this.content instanceof CborByteString) {
      // UUID'...'_N controls tag 37. If the inner byte string itself has a
      // non-canonical head, app-string notation cannot express both widths;
      // use generic tag notation so the inner indicator remains visible.
      if (this.content.encodingWidth !== undefined)
        return super._toCDN({ ...options, appStrings: false }, depth);
      // Tag 37 canonically uses one additional byte (AI=24, `_0`).
      const eiSuffix = resolveEiSuffix(options, this.encodingWidth, 0);
      return `${PREFIX_UUID_TAGGED}'${formatUuidBytes(this.content.value)}'${eiSuffix}`;
    }
    return super._toCDN(options, depth);
  }
}

export class CborTaggedUuidAsUUIDExt extends CborTaggedUuidExt {
  override _toJS(_options?: ToJSOptions): UUID {
    return new UUID((this.content as CborByteString).value);
  }
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

function uuidBytesToCborItem(
  prefix: string,
  bytes: Uint8Array,
  useUUID: boolean
): CborItem {
  const byteString = new CborByteString(bytes);
  if (prefix === PREFIX_UUID_TAGGED) {
    return useUUID
      ? new CborTaggedUuidAsUUIDExt(byteString)
      : new CborTaggedUuidExt(byteString);
  }
  return new CborUuidExt(bytes);
}

function buildUuidValue(
  prefix: string,
  content: string,
  useUUID: boolean,
  onError?: (msg: string) => void
): CborItem {
  return uuidBytesToCborItem(
    prefix,
    parseUuidString(content, onError),
    useUUID
  );
}

export function createUuidExtension(options?: {
  jsUUID?: boolean;
}): CborExtension {
  const useUUID = options?.jsUUID ?? false;

  const ext: CborExtension = {
    appStringPrefixes: [PREFIX_UUID, PREFIX_UUID_TAGGED],
    tagNumbers: [TAG_UUID],

    parseAppString(
      prefix: string,
      content: string,
      onError?: (msg: string) => void
    ): CborItem {
      return buildUuidValue(prefix, content, useUUID, onError);
    },

    parseAppSequence(
      prefix: string,
      items: CborItem[],
      onError?: (msg: string) => void
    ): CborItem {
      // Path A: string extraction succeeded → pass onError so non-standard
      // UUID strings (e.g. no-dash) are also recovered in non-strict mode
      let stringExtractError: unknown;
      let extractedStr: string | undefined;
      try {
        extractedStr = stringFromAppSequence(prefix, items);
      } catch (e) {
        stringExtractError = e;
      }

      if (extractedStr !== undefined) {
        return buildUuidValue(prefix, extractedStr, useUUID, onError);
      }

      // Path B: string extraction failed (non-UTF-8 bytes, null, unsupported type)
      // Try new UUID() with the appropriate UUIDInput for the item type
      if (items.length === 1) {
        const item = items[0];
        let uuidInput: Uint8Array | null | undefined;
        if (item instanceof CborByteString) uuidInput = item.value;
        else if (item instanceof CborSimple && item.value === 22)
          uuidInput = null;

        if (uuidInput !== undefined) {
          let parsed: UUID | undefined;
          try {
            parsed = new UUID(uuidInput);
          } catch {
            // new UUID() also rejected this input
          }

          if (parsed !== undefined) {
            const msg =
              item instanceof CborSimple
                ? `${prefix}<<null>>: expected a text string or byte string`
                : `${prefix}<<bytes>>: byte string is not a valid UTF-8 UUID string`;
            if (onError) {
              onError(msg);
              return uuidBytesToCborItem(prefix, parsed.toBytes(), useUUID);
            }
          }
        }
      }

      if (stringExtractError instanceof Error) throw stringExtractError;
      throw new SyntaxError(`${prefix}<<...>>: invalid UUID`);
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
