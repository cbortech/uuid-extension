# uuid'...' and UUID'...' — CDN notation for CBOR UUID values

This document specifies the `uuid'...'` and `UUID'...'` notations implemented
by [@cbortech/uuid-extension](../README.md). The notation is defined
independently by this package, following the application-extension mechanism of
[draft-ietf-cbor-edn-literals](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/).

## Background

CBOR tag 37 is registered in the
[IANA CBOR Tags registry](https://www.iana.org/assignments/cbor-tags/cbor-tags.xhtml)
as "UUID" and identifies a 16-byte byte string containing the UUID value.

This package also defines the untagged `uuid'...'` notation for cases where a
UUID-shaped value should be represented as a bare 16-byte byte string.

## Syntax

```
uuid'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
UUID'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
```

The string content must be a UUID in the canonical 8-4-4-4-12 hexadecimal form.
Uppercase hexadecimal input is accepted and serialized back as lowercase
canonical text. Matching on `uuid` and `UUID` is case-sensitive.

```
uuid'019e226f-78d8-7892-8c91-79013e6905e2'
UUID'019e226f-78d8-7892-8c91-79013e6905e2'
```

`uuid'...'` produces a bare 16-byte byte string. `UUID'...'` produces CBOR tag
37 over the same 16-byte byte string. `UUID'...'` and the generic tag notation
`37(h'...')` are equivalent when the tag content is exactly 16 bytes.

Raw app-string forms are also accepted:

```
uuid`019e226f-78d8-7892-8c91-79013e6905e2`
UUID`019e226f-78d8-7892-8c91-79013e6905e2`
```

App-sequence forms are defined as an alternate spelling. `<<...>>` must contain
exactly one item, and that item must be a text string or a UTF-8 byte string
whose decoded text is a UUID.

```
uuid<<"019e226f-78d8-7892-8c91-79013e6905e2">>
UUID<<'019e226f-78d8-7892-8c91-79013e6905e2'>>
```

## CBOR encoding

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
