export type ParserFailureReason =
  | "empty_command"
  | "mention_mismatch"
  | "unsupported_command"
  | "missing_target_language"
  | "invalid_language"
  | "invalid_summary_length"
  | "unexpected_tokens";

export type SupportedCommandType =
  | "translate"
  | "summary"
  | "translate_summary";

export type ParseSuccess =
  | {
      valid: true;
      command: "translate";
      targetLang: string;
    }
  | {
      valid: true;
      command: "summary";
      lang?: string;
      length?: number;
    }
  | {
      valid: true;
      command: "translate_summary";
      targetLang: string;
      length?: number;
    };

export type ParseFailure = {
  valid: false;
  reason: ParserFailureReason;
  raw: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

export interface ParseCommandOptions {
  botHandle?: string;
  maxSummaryLength?: number;
}
