import sharp from "sharp";

// next/og (Satori) only decodes PNG/JPEG. Normalize every uploaded logo to PNG
// so both the browser <img> and the ImageResponse card can render it.
export async function transcodeToPng(input: ArrayBuffer | Uint8Array): Promise<Buffer> {
  // Narrow the union before handing it to sharp: Buffer.from has no single
  // overload for `ArrayBuffer | Uint8Array`, so resolve the ArrayBuffer case first.
  const bytes = input instanceof Uint8Array ? input : Buffer.from(input);
  return sharp(bytes).png().toBuffer();
}
