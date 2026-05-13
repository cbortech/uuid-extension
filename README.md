# @cbortech/uuid-extension

UUID application-string extension for [`@cbortech/cbor`](https://www.npmjs.com/package/@cbortech/cbor).

This extension uses the CBOR UUID tag number 37.

## Installation

```bash
npm install @cbortech/cbor @cbortech/uuid-extension
```

## Usage

```ts
import { CBOR } from '@cbortech/cbor';
import { uuid } from '@cbortech/uuid-extension';

const cbor = new CBOR({ extensions: [uuid] });

const bare = cbor.parse("uuid'019e226f-78d8-7892-8c91-79013e6905e2'");
// Uint8Array([0x01, 0x9e, ...])

const tagged = cbor
  .fromEDN("UUID'019e226f-78d8-7892-8c91-79013e6905e2'")
  .toCBOR();
console.log(CBOR.fromCBOR(tagged).toHexDump());
// D8 25                                                  -- Tag 37
//    50 01 9E 22 6F 78 D8 78 92 8C 91 79 01 3E 69 05 E2  -- h'019e226f78d878928c9179013e6905e2'

console.log(cbor.format("37(h'019e226f78d878928c9179013e6905e2')"));
// UUID'019e226f-78d8-7892-8c91-79013e6905e2'
```

## EDN Forms

- `uuid'019e226f-78d8-7892-8c91-79013e6905e2'` produces a bare 16-byte string.
- `UUID'019e226f-78d8-7892-8c91-79013e6905e2'` produces tag 37 over the 16-byte string.
- Raw string forms such as ``uuid`019e226f-78d8-7892-8c91-79013e6905e2` `` are also supported.
- App-sequence forms such as `uuid<<"019e226f-78d8-7892-8c91-79013e6905e2">>` are also supported.

UUID text is validated as the canonical 8-4-4-4-12 hexadecimal form. Uppercase hexadecimal input is accepted and serialized back as lowercase canonical text.

## License

Apache-2.0
