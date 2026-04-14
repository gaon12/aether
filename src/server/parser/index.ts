import type {
  ParseCommandOptions,
  ParseFailure,
  ParseResult,
} from "@/types/parser";

const DEFAULT_MAX_SUMMARY_LENGTH = 5;
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,8}(?:-[a-z0-9]{2,8})?$/i;
const LEADING_MENTION_PATTERN = /^@[\p{L}\p{N}._]+$/u;

function buildFailure(
  raw: string,
  reason: ParseFailure["reason"],
): ParseFailure {
  return {
    valid: false,
    reason,
    raw,
  };
}

function normalizeBotHandle(botHandle?: string) {
  if (!botHandle) {
    return null;
  }

  const trimmed = botHandle.trim().toLowerCase();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function isLanguageCode(token: string) {
  return LANGUAGE_CODE_PATTERN.test(token);
}

function parseSummaryLength(token: string, maxSummaryLength: number) {
  if (!/^\d+$/.test(token)) {
    return null;
  }

  const numericValue = Number.parseInt(token, 10);
  if (numericValue < 1 || numericValue > maxSummaryLength) {
    return Number.NaN;
  }

  return numericValue;
}

function stripLeadingMention(
  tokens: string[],
  normalizedBotHandle: string | null,
): { remainingTokens: string[]; failure?: ParseFailure } {
  if (tokens.length === 0) {
    return { remainingTokens: [] };
  }

  const [firstToken, ...restTokens] = tokens;
  const normalizedFirstToken = firstToken.toLowerCase();

  if (normalizedBotHandle) {
    if (normalizedFirstToken !== normalizedBotHandle) {
      return {
        remainingTokens: tokens,
        failure: buildFailure(tokens.join(" "), "mention_mismatch"),
      };
    }

    return { remainingTokens: restTokens };
  }

  if (LEADING_MENTION_PATTERN.test(firstToken)) {
    return { remainingTokens: restTokens };
  }

  return { remainingTokens: tokens };
}

export function parseCommand(
  rawCommand: string,
  options: ParseCommandOptions = {},
): ParseResult {
  const normalizedRaw = rawCommand.trim().replace(/\s+/g, " ");
  const maxSummaryLength =
    options.maxSummaryLength ?? DEFAULT_MAX_SUMMARY_LENGTH;

  if (!normalizedRaw) {
    return buildFailure(rawCommand, "empty_command");
  }

  const { remainingTokens, failure } = stripLeadingMention(
    normalizedRaw.split(" "),
    normalizeBotHandle(options.botHandle),
  );

  if (failure) {
    return failure;
  }

  if (remainingTokens.length === 0) {
    return buildFailure(rawCommand, "empty_command");
  }

  const [commandToken, ...argumentTokens] = remainingTokens;
  const normalizedCommand = commandToken.toLowerCase();

  if (normalizedCommand === "translate") {
    if (argumentTokens.length === 0) {
      return buildFailure(rawCommand, "missing_target_language");
    }

    const [targetLanguage, secondToken, thirdToken] = argumentTokens;
    if (!isLanguageCode(targetLanguage)) {
      return buildFailure(rawCommand, "invalid_language");
    }

    if (argumentTokens.length === 1) {
      return {
        valid: true,
        command: "translate",
        targetLang: targetLanguage.toLowerCase(),
      };
    }

    if (secondToken?.toLowerCase() !== "summary") {
      return buildFailure(rawCommand, "unexpected_tokens");
    }

    if (argumentTokens.length === 2) {
      return {
        valid: true,
        command: "translate_summary",
        targetLang: targetLanguage.toLowerCase(),
      };
    }

    if (argumentTokens.length === 3) {
      const parsedLength = parseSummaryLength(thirdToken, maxSummaryLength);
      if (parsedLength === null || Number.isNaN(parsedLength)) {
        return buildFailure(rawCommand, "invalid_summary_length");
      }

      return {
        valid: true,
        command: "translate_summary",
        targetLang: targetLanguage.toLowerCase(),
        length: parsedLength,
      };
    }

    return buildFailure(rawCommand, "unexpected_tokens");
  }

  if (normalizedCommand === "summary") {
    if (argumentTokens.length === 0) {
      return {
        valid: true,
        command: "summary",
      };
    }

    if (argumentTokens.length === 1) {
      const [firstArgument] = argumentTokens;
      const parsedLength = parseSummaryLength(firstArgument, maxSummaryLength);
      if (parsedLength !== null) {
        if (Number.isNaN(parsedLength)) {
          return buildFailure(rawCommand, "invalid_summary_length");
        }

        return {
          valid: true,
          command: "summary",
          length: parsedLength,
        };
      }

      if (!isLanguageCode(firstArgument)) {
        return buildFailure(rawCommand, "invalid_language");
      }

      return {
        valid: true,
        command: "summary",
        lang: firstArgument.toLowerCase(),
      };
    }

    if (argumentTokens.length === 2) {
      const [languageToken, lengthToken] = argumentTokens;
      if (!isLanguageCode(languageToken)) {
        return buildFailure(rawCommand, "invalid_language");
      }

      const parsedLength = parseSummaryLength(lengthToken, maxSummaryLength);
      if (parsedLength === null || Number.isNaN(parsedLength)) {
        return buildFailure(rawCommand, "invalid_summary_length");
      }

      return {
        valid: true,
        command: "summary",
        lang: languageToken.toLowerCase(),
        length: parsedLength,
      };
    }

    return buildFailure(rawCommand, "unexpected_tokens");
  }

  return buildFailure(rawCommand, "unsupported_command");
}
