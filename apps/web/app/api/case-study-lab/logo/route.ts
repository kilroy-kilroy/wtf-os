import { uploadClientLogo, getReport } from "@/lib/case-study-lab/db";

export const maxDuration = 30;

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export async function POST(req: Request): Promise<Response> {
  try {
    const form = await req.formData();
    const id = String(form.get("id") ?? "").trim();
    const file = form.get("file");
    if (!id || !(file instanceof File)) {
      return Response.json({ error: "Missing id or file" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return Response.json({ error: "Use a PNG, JPG, SVG, or WebP" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Logo must be under 2 MB" }, { status: 400 });
    }
    if (!(await getReport(id))) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const url = await uploadClientLogo(id, await file.arrayBuffer(), file.type);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 502 });
  }
}
