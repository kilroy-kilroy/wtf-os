import sharp from "sharp";

// next/og (Satori) only decodes PNG/JPEG. Normalize every uploaded logo to PNG
// so both the browser <img> and the ImageResponse card can render it.
export async function transcodeToPng(input: ArrayBuffer | Uint8Array): Promise<Buffer> {
  return sharp(Buffer.from(input)).png().toBuffer();
}
