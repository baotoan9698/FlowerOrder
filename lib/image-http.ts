import "server-only";
export const imageHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
export function sameOrigin(request: Request) {
  const target = new URL(request.url);
  // Next's local server may normalize request.url to localhost even when the
  // browser uses 127.0.0.1. Host is the actual HTTP authority of this request.
  target.host = request.headers.get("host") || target.host;
  if (request.headers.get("x-forwarded-proto") === "https")
    target.protocol = "https:";
  return request.headers.get("origin") === target.origin;
}
export async function boundedForm(request: Request) {
  const max = 3 * 1024 * 1024 + 64 * 1024;
  if (Number(request.headers.get("content-length")) > max || !request.body)
    throw new Error("SIZE");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error("SIZE");
    }
    chunks.push(value);
  }
  return new Response(new Uint8Array(Buffer.concat(chunks)), {
    headers: { "Content-Type": request.headers.get("content-type") || "" },
  }).formData();
}
