/**
 * Shared SSE (Server-Sent Events) stream reader.
 *
 * Handles the transport-level concerns: TextDecoder, buffer accumulation,
 * newline splitting, and `data:` prefix stripping. Each consumer supplies
 * its own event-handling callback.
 */
export async function readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onLine: (payload: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(line.charAt(5) === " " ? 6 : 5).trim();
      if (!payload || payload === "[DONE]") continue;
      onLine(payload);
    }
  }
}
