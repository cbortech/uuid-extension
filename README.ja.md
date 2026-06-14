# @cbortech/uuid-extension

[@cbortech/cbor](https://www.npmjs.com/package/@cbortech/cbor) 向け UUID アプリケーション文字列拡張。

[@cbortech/cbor](https://www.npmjs.com/package/@cbortech/cbor) は [CBOR](https://www.rfc-editor.org/rfc/rfc8949.html)・[CDN](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)・JavaScript 値を相互変換する TypeScript ライブラリです。

プレイグラウンドを https://cbor.tech/cbor/ で公開しています。

この拡張は CBOR UUID タグ番号 37 を使用します。

## インストール

```bash
npm install @cbortech/cbor @cbortech/uuid-extension
```

## 使い方

### uuid extension

```ts
import { CBOR } from '@cbortech/cbor';
import { uuid } from '@cbortech/uuid-extension';

const cbor = new CBOR({ extensions: [uuid] });

// UUID 値を含む CDN をパースする。
const document = cbor.parse(`{
  "id": uuid'019e226f-78d8-7892-8c91-79013e6905e2',
  "taggedId": UUID'019e312c-ec71-76f6-a959-fa3acc220b55'
}`);
// document.id は生の Uint8Array。
// document.taggedId はタグ 37 でラップされた Uint8Array。

// UUID 値を含む CDN を CBOR に変換する。
const tagged = cbor
  .fromCDN("UUID'019e226f-78d8-7892-8c91-79013e6905e2'")
  .toCBOR();
// tagged は Uint8Array として格納された CBOR バイナリデータ。
// toHexDump() でエンコード結果を確認できる。
console.log(CBOR.fromCBOR(tagged).toHexDump());
// D8 25                                                  -- Tag 37
//    50 01 9E 22 6F 78 D8 78 92 8C 91 79 01 3E 69 05 E2  -- h'019e226f78d878928c9179013e6905e2'

// タグ 37 の CDN を UUID'...' 形式に変換する。
console.log(cbor.format("37(h'019e226f78d878928c9179013e6905e2')"));
// UUID'019e226f-78d8-7892-8c91-79013e6905e2'
```

### uuid_as_UUID extension

`uuid_as_UUID` extension を使うと、`UUID'...'` や `37(h'...')` を [@cbortech/uuid](https://www.npmjs.com/package/@cbortech/uuid) の `UUID` オブジェクトに変換します。

```ts
import { CBOR } from '@cbortech/cbor';
import { uuid_as_UUID } from '@cbortech/uuid-extension';
import { UUID } from '@cbortech/uuid';

const cbor = new CBOR({ extensions: [uuid_as_UUID] });

// UUID'...' 値は toJS() で UUID オブジェクトになる。
const item = cbor.fromCDN("UUID'019e226f-78d8-7892-8c91-79013e6905e2'");
const value = item.toJS();
console.log(value instanceof UUID); // true
if (value instanceof UUID) console.log(value.parse());
// { ver: 7, unix_ts_ms: 1778694191320, rand_a: 2194, var: 'RFC4122', rand_b: ...n }

// toCDN() は引き続き UUID'...' 形式を出力する。
console.log(item.toCDN()); // UUID'019e226f-78d8-7892-8c91-79013e6905e2'

// 37(h'...') 形式でも同様に UUID オブジェクトに変換される。
const item2 = cbor.fromCDN("37(h'019e226f78d878928c9179013e6905e2')");
console.log(item2.toCDN()); // UUID'019e226f-78d8-7892-8c91-79013e6905e2'

// UUID オブジェクトはタグ 37 付きの 16 バイト文字列としてエンコードされる。
const encoded = cbor
  .fromJS(new UUID('019e226f-78d8-7892-8c91-79013e6905e2'))
  .toCBOR();
console.log(cbor.fromCBOR(encoded).toCDN()); // UUID'019e226f-78d8-7892-8c91-79013e6905e2'

// タグなしの uuid'...' 値の toJS() は引き続き Uint8Array を返す。
const bare = cbor.fromCDN("uuid'019e226f-78d8-7892-8c91-79013e6905e2'");
console.log(bare.toJS()); // Uint8Array
```

## CDN 形式

- `uuid'019e226f-78d8-7892-8c91-79013e6905e2'` — 生の 16 バイト文字列を生成する。
- `UUID'019e226f-78d8-7892-8c91-79013e6905e2'` — タグ 37 でラップされた 16 バイト文字列を生成する。
- `` uuid`019e226f-78d8-7892-8c91-79013e6905e2` `` のような生文字列形式もサポートしている。
- `uuid<<"019e226f-78d8-7892-8c91-79013e6905e2">>` のようなアプリシーケンス形式もサポートしている。

UUID テキストは正規の 8-4-4-4-12 16 進数形式で検証されます。大文字の 16 進数入力も受け付け、シリアライズ時は小文字の正規テキストに変換されます。

## ライセンス

Apache-2.0
