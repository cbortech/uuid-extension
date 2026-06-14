# @cbortech/uuid-extension

UUID application-string extension for [@cbortech/cbor](https://www.npmjs.com/package/@cbortech/cbor).

[@cbortech/cbor](https://www.npmjs.com/package/@cbortech/cbor) is a TypeScript library for converting between [CBOR](https://www.rfc-editor.org/rfc/rfc8949.html), [CDN](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/), and JavaScript values.

The playground is published at https://cbor.tech/cbor/.

This extension uses the CBOR UUID tag number 37.

## Installation

```bash
npm install @cbortech/cbor @cbortech/uuid-extension
```

## Usage

### uuid extension

```ts
import { CBOR } from '@cbortech/cbor';
import { uuid } from '@cbortech/uuid-extension';

const cbor = new CBOR({ extensions: [uuid] });

// Parse CDN containing UUID values.
const document = cbor.parse(`{
  "id": uuid'019e226f-78d8-7892-8c91-79013e6905e2',
  "taggedId": UUID'019e312c-ec71-76f6-a959-fa3acc220b55'
}`);
// document.id is a bare Uint8Array.
// document.taggedId is tag 37 over a Uint8Array.

// Convert CDN containing a UUID value into CBOR.
const tagged = cbor
  .fromCDN("UUID'019e226f-78d8-7892-8c91-79013e6905e2'")
  .toCBOR();
// tagged is CBOR binary data stored as a Uint8Array.
// Inspect the encoded CBOR value with toHexDump():
console.log(CBOR.fromCBOR(tagged).toHexDump());
// D8 25                                                  -- Tag 37
//    50 01 9E 22 6F 78 D8 78 92 8C 91 79 01 3E 69 05 E2  -- h'019e226f78d878928c9179013e6905e2'

// Format CDN with tag 37 as UUID'...'.
console.log(cbor.format("37(h'019e226f78d878928c9179013e6905e2')"));
// UUID'019e226f-78d8-7892-8c91-79013e6905e2'
```

### uuid_as_UUID extension

The `uuid_as_UUID` extension converts `UUID'...'` and `37(h'...')` to `UUID` objects from [@cbortech/uuid](https://www.npmjs.com/package/@cbortech/uuid).

```ts
import { CBOR } from '@cbortech/cbor';
import { uuid_as_UUID } from '@cbortech/uuid-extension';
import { UUID } from '@cbortech/uuid';

const cbor = new CBOR({ extensions: [uuid_as_UUID] });

// UUID'...' values become UUID objects via toJS().
const item = cbor.fromCDN("UUID'019e226f-78d8-7892-8c91-79013e6905e2'");
const value = item.toJS();
console.log(value instanceof UUID); // true
if (value instanceof UUID) console.log(value.parse());
// { ver: 7, unix_ts_ms: 1778694191320, rand_a: 2194, var: 'RFC4122', rand_b: ...n }

// toCDN() still emits UUID'...' notation.
console.log(item.toCDN()); // UUID'019e226f-78d8-7892-8c91-79013e6905e2'

// 37(h'...') notation is also converted to a UUID object.
const item2 = cbor.fromCDN("37(h'019e226f78d878928c9179013e6905e2')");
console.log(item2.toCDN()); // UUID'019e226f-78d8-7892-8c91-79013e6905e2'

// UUID objects are encoded as tag 37 over a 16-byte string.
const encoded = cbor
  .fromJS(new UUID('019e226f-78d8-7892-8c91-79013e6905e2'))
  .toCBOR();
console.log(cbor.fromCBOR(encoded).toCDN()); // UUID'019e226f-78d8-7892-8c91-79013e6905e2'

// Untagged uuid'...' values still produce Uint8Array via toJS().
const bare = cbor.fromCDN("uuid'019e226f-78d8-7892-8c91-79013e6905e2'");
console.log(bare.toJS()); // Uint8Array
```

## CDN Forms

- `uuid'019e226f-78d8-7892-8c91-79013e6905e2'` produces a bare 16-byte string.
- `UUID'019e226f-78d8-7892-8c91-79013e6905e2'` produces tag 37 over the 16-byte string.
- Raw string forms such as ``uuid`019e226f-78d8-7892-8c91-79013e6905e2` `` are also supported.
- App-sequence forms such as `uuid<<"019e226f-78d8-7892-8c91-79013e6905e2">>` are also supported.

UUID text is validated as the canonical 8-4-4-4-12 hexadecimal form. Uppercase hexadecimal input is accepted and serialized back as lowercase canonical text.

## License

Apache-2.0
