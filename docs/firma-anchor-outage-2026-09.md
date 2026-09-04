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


---

## Resolution (2026-09-04)

Both paths now use coordinate placement and are verified against the live test
API — 4 of 4 templates accepted, up from 0 of 4:

```
PASS  msa                     signers=2  pages=6
PASS  sow                     signers=2  pages=2
PASS  sow-agency-studio-plus  signers=2  pages=3
PASS  call-vault-nda          signers=1  pages=6
```

Two things had to change, and only the first was predictable:

1. **Coordinate fields instead of anchors.** A dedicated final signature page
   carries absolutely positioned slots; `SIGNATURE_LAYOUT` in
   `packages/pdf/contract-report.tsx` drives both what is drawn and what Firma is
   told, so the two cannot drift.

2. **`create-and-send`, not a draft.** A draft's signing link is dead —
   app.firma.dev shows "Invalid Signing Link" and `status.sent` stays false. The
   embeddable-signing guide implies no `/send` is needed; the API disagrees. This
   only surfaced by driving the real iframe. `settings.send_signing_email`
   decides whether the signer is also emailed:
   - `false` for the embedded NDA — they are already looking at the document
   - `true` for contracts — the client should receive it by email

   Activation is the billable event, not the notification, so both consume a
   credit on live keys.

### Known loss

Per-page `{{init_*}}` initials are gone. They were anchor-bound and therefore
already broken; restoring them under coordinate placement needs one slot per
page. Nothing depends on them today.

### Still worth reporting

The underlying anchor bug is unfixed on Firma's side. The repro above stands.


## Delivering the executed document (2026-09-04)

Firma sends a completion email carrying the executed PDF **by default**, even
with `settings.send_signing_email: false`. That setting suppresses only the
signing INVITATION. Confirmed by signing a test envelope end to end and
receiving the executed copy.

So the contributor's copy is delivered by Firma, not by us. The in-app download
button and `/api/call-vault/nda/file` were removed: `/download` refuses
create-and-send envelopes (see above), so that button could only ever answer
"still being prepared".

If Firma later fixes `/download`, restoring it is a revert — `syncStatus` still
attempts `getSignedPdf` on completion, so `contracts.signed_pdf_path` will start
populating on its own and the admin link will work without further changes.

Note for anyone probing the API: **unknown `settings` keys are silently accepted**.
`send_completion_email`, `send_completed_email`, `notify_on_completion` and
`allow_presigning_download` all returned 201. Acceptance proves nothing about
whether a field is real.
