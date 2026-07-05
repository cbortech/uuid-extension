# uuid'...' と UUID'...' — CBOR UUID 値用の CDN 記法

このドキュメントは、[@cbortech/uuid-extension](../README.ja.md) が実装する
`uuid'...'` 記法と `UUID'...'` 記法を規定します。この記法は、
[draft-ietf-cbor-edn-literals](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)
が定めるアプリケーション拡張(application extension)の仕組みに沿って、
本パッケージが独自に定義したものです。

## 背景

CBOR タグ 37 は [IANA CBOR Tags レジストリ](https://www.iana.org/assignments/cbor-tags/cbor-tags.xhtml)
に "UUID" として登録されており、UUID 値を含む 16 バイトのバイト文字列を
識別します。

このパッケージは、UUID 形式の値をタグなしの 16 バイト文字列として表現するための
`uuid'...'` 記法も定義します。

## 構文

```
uuid'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
UUID'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
```

文字列の中身は、正規の 8-4-4-4-12 形式の 16 進数 UUID でなければなりません。
大文字の 16 進数入力も受け付け、シリアライズ時は小文字の正規テキストに変換されます。
`uuid` と `UUID` のマッチングは大文字小文字を区別します。

```
uuid'019e226f-78d8-7892-8c91-79013e6905e2'
UUID'019e226f-78d8-7892-8c91-79013e6905e2'
```

`uuid'...'` は生の 16 バイト文字列を生成します。`UUID'...'` は同じ 16 バイト文字列を
CBOR タグ 37 でラップした値を生成します。タグの内容がちょうど 16 バイトである場合、
`UUID'...'` と汎用タグ記法 `37(h'...')` は等価です。

生文字列(raw app-string)形式もサポートしています。

```
uuid`019e226f-78d8-7892-8c91-79013e6905e2`
UUID`019e226f-78d8-7892-8c91-79013e6905e2`
```

アプリシーケンス(app-sequence)形式も別表記として定義します。`<<...>>` の中身は
ちょうど 1 個の項目でなければならず、その項目は、デコード後のテキストが UUID である
テキスト文字列または UTF-8 バイト文字列でなければなりません。

```
uuid<<"019e226f-78d8-7892-8c91-79013e6905e2">>
UUID<<'019e226f-78d8-7892-8c91-79013e6905e2'>>
```

## CBOR エンコーディング

```
uuid'019e226f-78d8-7892-8c91-79013e6905e2'
  => 50 01 9e 22 6f 78 d8 78 92 8c 91 79 01 3e 69 05 e2
     │  └ 16-byte UUID value
     └ byte string, length 16

UUID'019e226f-78d8-7892-8c91-79013e6905e2'
  => d8 25 50 01 9e 22 6f 78 d8 78 92 8c 91 79 01 3e 69 05 e2
     │     └ 16-byte UUID value
     └ tag(37)
```
