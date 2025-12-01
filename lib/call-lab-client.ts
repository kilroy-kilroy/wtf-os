export async function runCallLabPro(transcript: string) {
  const res = await fetch("/api/call-lab/pro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error analyzing call");
  }

  return res.json();
}
