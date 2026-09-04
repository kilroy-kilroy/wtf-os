# Firma anchor binding is broken — findings and workaround (2026-09-04)

## Symptom

Every `POST /signing-requests` carrying `anchor_tags` is rejected:

```
400 VALIDATION_ERROR
Anchor '{{sig_client}}': no glyph advances for font g_d17_f1
Anchor '{{date_client}}': no glyph advances for font g_d17_f1
```

All four templates in `contract_templates` fail: `msa`, `sow`,
`sow-agency-studio-plus`, `call-vault-nda`. The contract generator and Call
Vault are both affected — nothing can be sent for signature.

## It is not a regression in this repo

A PDF **Firma itself accepted on 2026-06-15** (pulled unmodified from the
`contracts` bucket, request created, envelope reached `completed`) is **rejected
today** with the identical error. Byte-identical file.

Font dictionaries of the accepted and the rejected documents match exactly:

```
<< /Type /Font /BaseFont /Times-Roman /Subtype /Type1 /Encoding /WinAnsiEncoding >>
```

Type1, WinAnsiEncoding, no `/Widths`, PDF 1.3 — which is correct: these are PDF
standard-14 fonts, whose metrics every conformant reader is required to know.
Firma's binder no longer derives them.

Likely window: their changelog entry **v1.32.0 (2026-07-22)** reworked field font
handling. The last contracts this repo sent successfully were June.

## Embedding a real font does NOT fix it

Tried embedding Tinos (metrically compatible with Times, SIL OFL) via
`Font.register`. The PDF then carries a properly subsetted TrueType font:

```
BaseFonts : ZQZJYP+Tinos-Regular, WWXTLB+Tinos-Bold
/FontFile2: 2          (embedded outlines)
/W        : present    (CID width array)
/ToUnicode: present
Subtype   : Type0 / Identity-H with a CIDFontType2 descendant
```

Firma still reports "no glyph advances". react-pdf always emits composite
Type0/Identity-H fonts for embedded faces, so there is no react-pdf
configuration that produces a simple font with a `/Widths` array. Anchor binding
cannot be rescued from our side.

## What does work: coordinate-placed fields

`fields` (percentage x/y placement) requires no text extraction and no font
metrics. Verified against the current API with a PDF from this renderer:

```
POST /signing-requests  with `fields` instead of `anchor_tags`  ->  HTTP 201
```

## Recommended shape

Place signature and date fields by coordinate on a signature page whose layout
is deterministic, rather than by searching for text:

1. Render the signature block on its own final page so its position does not
   drift with contract length.
2. Count pages from the rendered PDF (`/Type /Page` occurrences).
3. Send `fields` with fixed percentages on that page.

This removes the dependency on any provider's text-extraction quality
permanently, which is worth doing even if Firma restores standard-14 support.

## Report to Firma

The repro is unusually clean: their own previously-accepted artifact, unchanged,
now rejected. Ask whether v1.32.0 dropped standard-14 metric support, and
whether composite Type0/Identity-H fonts are expected to bind.
