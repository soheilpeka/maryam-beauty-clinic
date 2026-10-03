/** Bound JSON decoding before allocation/validation, including chunked requests. */
export const MAX_JSON_BODY_BYTES = 64 * 1024;

export async function readJsonBody(request: Request): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_JSON_BODY_BYTES)) {
    throw new SyntaxError("Invalid JSON body");
  }
  if (!request.body) throw new SyntaxError("Invalid JSON body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        throw new SyntaxError("Invalid JSON body");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
}
