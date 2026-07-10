import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { transcodeToPng } from "@/lib/case-study-lab/image";

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("transcodeToPng", () => {
  it("converts a webp buffer to PNG", async () => {
    const webp = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).webp().toBuffer();
    const out = await transcodeToPng(webp);
    expect(out.subarray(0, 8)).toEqual(PNG_SIG);
  });

  it("passes PNG through as valid PNG", async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 128, b: 255 } },
    }).png().toBuffer();
    const out = await transcodeToPng(png);
    expect(out.subarray(0, 8)).toEqual(PNG_SIG);
  });
});
