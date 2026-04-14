import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export function estimateTokenCount(text: string) {
  if (!text.trim()) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateMessageTokens(messages: ChatCompletionMessageParam[]) {
  return messages.reduce((total, message) => {
    if (typeof message.content === "string") {
      return total + estimateTokenCount(message.content);
    }

    return total;
  }, 0);
}

export function joinPromptSections(sections: Array<string | null | undefined>) {
  return sections
    .map((section) => (typeof section === "string" ? section.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}
