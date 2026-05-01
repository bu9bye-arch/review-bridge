import { readFileSync } from "fs";

interface TranscriptEntry {
  role?: string;
  type?: string;
  content?: string | Array<{ type: string; text?: string }>;
  message?: string;
}

export function parseTranscript(
  transcriptPath: string,
  maxEntries: number = 20
): string {
  try {
    const raw = readFileSync(transcriptPath, "utf-8");
    const lines = raw.trim().split("\n");
    const recent = lines.slice(-maxEntries);

    const messages: string[] = [];
    for (const line of recent) {
      try {
        const entry: TranscriptEntry = JSON.parse(line);
        const role = entry.role || entry.type;

        if (role === "user" || role === "human") {
          const text = extractText(entry);
          if (text) messages.push(`[用户] ${text.slice(0, 500)}`);
        } else if (role === "assistant" || role === "ai") {
          const text = extractText(entry);
          if (text) messages.push(`[AI] ${text.slice(0, 500)}`);
        }
      } catch {
        continue;
      }
    }

    return messages.join("\n\n") || "(无法解析会话记录)";
  } catch {
    return "(会话记录文件不可用)";
  }
}

function extractText(entry: TranscriptEntry): string {
  if (typeof entry.content === "string") return entry.content;
  if (Array.isArray(entry.content)) {
    return entry.content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!)
      .join("\n");
  }
  if (entry.message) return entry.message;
  return "";
}
