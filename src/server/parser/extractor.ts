export type ExtractionIgnoredReason =
  | "unsupported_image_only"
  | "text_too_short";

export type ExtractionFailureReason =
  | "source_unavailable"
  | "missing_source_text";

export interface ExtractableAttachment {
  type: "image" | "video" | "text" | "link" | "unknown";
  text?: string | null;
}

export interface ExtractableThreadsPost {
  sourceMediaId: string;
  text?: string | null;
  quotedText?: string | null;
  parentText?: string | null;
  mediaType?: string | null;
  attachments?: ExtractableAttachment[];
  isDeleted?: boolean;
  isPrivate?: boolean;
}

export type ExtractedTextResult =
  | {
      status: "ready";
      sourceText: string;
      selectedSource: "text" | "quotedText" | "parentText" | "combined";
      characterCount: number;
    }
  | {
      status: "ignored";
      reason: ExtractionIgnoredReason;
      detail: string;
    }
  | {
      status: "failed";
      reason: ExtractionFailureReason;
      detail: string;
    };

export interface ExtractionOptions {
  aggregationMode?: "combined" | "primary_only";
  minCharacters?: number;
}

const DEFAULT_MIN_CHARACTERS = 24;

function normalizeText(text?: string | null) {
  return (
    text
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n\n") ?? ""
  );
}

function collectPostTextBlocks(post: ExtractableThreadsPost) {
  const blocks = [normalizeText(post.text)];

  for (const attachment of post.attachments ?? []) {
    if (attachment.type !== "text") {
      continue;
    }

    blocks.push(normalizeText(attachment.text));
  }

  return blocks.filter(Boolean);
}

function hasOnlyVisualAttachments(post: ExtractableThreadsPost) {
  return (
    (post.attachments?.length ?? 0) > 0 &&
    post.attachments?.every((attachment) => attachment.type === "image") ===
      true
  );
}

export function extractProcessableText(
  post: ExtractableThreadsPost,
  options: ExtractionOptions = {},
): ExtractedTextResult {
  if (post.isDeleted || post.isPrivate) {
    return {
      status: "failed",
      reason: "source_unavailable",
      detail: "Source post is deleted, private, or otherwise unavailable.",
    };
  }

  const minCharacters = options.minCharacters ?? DEFAULT_MIN_CHARACTERS;
  const ownTextBlocks = collectPostTextBlocks(post);
  const aggregationMode = options.aggregationMode ?? "combined";
  const combinedOwnText =
    aggregationMode === "primary_only"
      ? (ownTextBlocks[0] ?? "")
      : ownTextBlocks.join("\n\n");

  const candidates = [
    {
      key:
        aggregationMode === "combined" && ownTextBlocks.length > 1
          ? ("combined" as const)
          : ("text" as const),
      value: combinedOwnText,
    },
    { key: "quotedText" as const, value: normalizeText(post.quotedText) },
    { key: "parentText" as const, value: normalizeText(post.parentText) },
  ];

  const firstAvailableCandidate = candidates.find(
    (candidate) => candidate.value.length > 0,
  );

  if (!firstAvailableCandidate) {
    if (
      post.mediaType?.toLowerCase() === "image" ||
      hasOnlyVisualAttachments(post)
    ) {
      return {
        status: "ignored",
        reason: "unsupported_image_only",
        detail: "Image-only or visual-only posts are not supported in v1.",
      };
    }

    return {
      status: "failed",
      reason: "missing_source_text",
      detail: "No processable text was available from the source post context.",
    };
  }

  if (firstAvailableCandidate.value.length < minCharacters) {
    return {
      status: "ignored",
      reason: "text_too_short",
      detail: `Source text is shorter than the ${minCharacters}-character threshold.`,
    };
  }

  return {
    status: "ready",
    sourceText: firstAvailableCandidate.value,
    selectedSource: firstAvailableCandidate.key,
    characterCount: firstAvailableCandidate.value.length,
  };
}
