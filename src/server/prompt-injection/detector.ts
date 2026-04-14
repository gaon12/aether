/**
 * Prompt Injection Detector
 *
 * Scores untrusted source text for common injection patterns.
 * Each rule carries a base score; multiple matching patterns within a rule
 * accumulate score (capped at 1.0 overall) to reflect stronger signals.
 *
 * Detected events are persisted to prompt_injection_events and rolled into
 * metrics_hourly.prompt_injection_count by the worker pipeline.
 */

const DETECTION_RULES = [
  // ── Ignore / forget previous instructions ──────────────────────────────
  {
    reason: "ignore_previous_instructions",
    score: 0.45,
    patterns: [
      /ignore (all )?(previous|prior|earlier|above|preceding) instructions/iu,
      /disregard (all )?(previous|prior|earlier|above|preceding) instructions/iu,
      /forget (all )?(previous|prior|earlier|above) instructions/iu,
      /override (all )?(previous|prior|earlier) instructions/iu,
      /이전 지시(사항)?를 무시(?:해|해라|하세요|하라)?/u,
      /앞선 규칙을 무시(?:해|해라|하세요)?/u,
      /모든 지시(사항)?를 무시(?:해|해라|하세요|하라)?/u,
      /이전 내용을 (?:모두 )?잊어(?:버려)?/u,
      /지금까지의 지시를 무시/u,
    ],
  },

  // ── System prompt / instruction exfiltration ───────────────────────────
  {
    reason: "reveal_system_prompt",
    score: 0.4,
    patterns: [
      /show (me )?(the |your )?(full |entire |exact |original )?(system prompt|system message|instructions|rules|guidelines)/iu,
      /print (the |your )?(system prompt|developer message|instructions)/iu,
      /what (is|are) (your |the )?(system prompt|instructions|rules|constraints|guidelines)/iu,
      /tell me (your |the )?(system prompt|instructions|rules|guidelines)/iu,
      /repeat (your |the |these )?(system prompt|instructions) (back|verbatim|exactly|word for word)/iu,
      /output (your |the |these )?(system prompt|instructions|rules)/iu,
      /reveal (your |the )?(system prompt|instructions|hidden prompt)/iu,
      /display (your |the )?(system prompt|instructions)/iu,
      /시스템 프롬프트(를| 가)? (?:보여|알려|출력|반복|복사)/iu,
      /개발자 메시지를 출력/u,
      /지시(사항)?를 (?:보여줘|알려줘|출력해|그대로 반복)/u,
      /네 규칙(을)? (?:알려줘|보여줘|출력해)/u,
      /숨겨진 프롬프트를/u,
      /원래 지시(사항)?를 (?:알려줘|보여줘)/u,
    ],
  },

  // ── Role override / persona injection ──────────────────────────────────
  {
    reason: "role_override_attempt",
    score: 0.3,
    patterns: [
      /you are now (?:a |an )?(?:different|new|unrestricted|jailbroken|free|uncensored|evil|rogue)/iu,
      /act as (?:a |an )?(?:different|uncensored|unrestricted|jailbroken|evil|dan|ai without|model without)/iu,
      /pretend (you are|to be) (?:a |an )?(?:different|uncensored|unrestricted|jailbroken)/iu,
      /you should now (?:act|behave|respond) as/iu,
      /from this (?:point|moment) on(?:,| ) you are/iu,
      /DAN\b/iu,
      /do anything now/iu,
      /developer mode (?:enabled|activated|on)/iu,
      /jailbreak/iu,
      /너는 이제 (?:다른|새로운|제한 없는|자유로운|검열 없는)/u,
      /이제부터 .{0,20} 역할(을)?(?:\s*해줘|\s*해라|\s*하라)?/u,
      /개발자 모드/u,
      /탈옥/u,
      /검열 없이/u,
      /제한 없이 대답/u,
    ],
  },

  // ── Internal policy / constraint exfiltration ──────────────────────────
  {
    reason: "policy_exfiltration_attempt",
    score: 0.3,
    patterns: [
      /explain (your|the) internal (rules|policies|guidelines|constraints)/iu,
      /list (your |the |all |hidden )?(instructions|rules|constraints|policies|guidelines)/iu,
      /what (constraints|restrictions|limits|policies|rules) (do you have|are you under|apply to you)/iu,
      /how (are you|were you) (configured|programmed|instructed|set up)/iu,
      /내부 규칙(을)? (?:설명|알려)/u,
      /숨겨진 지시(사항)?를 알려/u,
      /제약(사항)?을 (?:알려줘|보여줘)/u,
      /어떻게 설정(되어|되었)?(?:있어|있나요|있습니까)/u,
    ],
  },

  // ── "From now on" wholesale rule replacement ───────────────────────────
  {
    reason: "ignore_all_rules_after_this",
    score: 0.4,
    patterns: [
      /from now on[,.]?\s+(?:ignore|disregard|forget) (all |any |the |your )?(rules|instructions|guidelines|restrictions)/iu,
      /after this[,.]?\s+(?:ignore|disregard) (all |the |any )?(instructions|rules)/iu,
      /hereafter[,.]?\s+disregard/iu,
      /이후 모든 응답은 규칙을 무시/u,
      /이제부터 지시(사항)?를 무시/u,
      /앞으로는 (?:규칙|지시|제약) 없이/u,
    ],
  },

  // ── Task hijacking (redirect to a different job) ───────────────────────
  {
    reason: "task_hijacking",
    score: 0.35,
    patterns: [
      /instead of (translating|summarizing|your (current )?task)/iu,
      /don't (translate|summarize)[,.]?\s+(instead|but rather|just)/iu,
      /stop (translating|summarizing)[,.]?\s+(and|instead)/iu,
      /your (new |actual |real )task is/iu,
      /new (task|instruction|directive|command)\s*:/iu,
      /additional instructions?\s*:/iu,
      /번역(?:하지 말고|말고)\s*(?:대신|그냥|그대신)/u,
      /요약(?:하지 말고|말고)\s*(?:대신|그냥|그대신)/u,
      /새로운 (?:지시|임무|작업|명령)/u,
      /대신 다음(?:을|을 해줘)/u,
    ],
  },

  // ── Delimiter / fake system-message injection ──────────────────────────
  {
    reason: "delimiter_injection",
    score: 0.35,
    patterns: [
      /\[SYSTEM\]/iu,
      /<system>/iu,
      /\[INST\]/iu,
      /<<SYS>>/iu,
      /\[\/INST\]/iu,
      /###\s*(?:system|instruction|prompt|override)/iu,
      /---\s*(?:system|instruction|prompt|override)/iu,
      /"""?\s*(?:system|instruction|new prompt)/iu,
      /\bSYSTEM\s*:\s*(?:you are|ignore|from now)/iu,
      /\bASSISTANT\s*:\s*(?:ok|sure|yes|understood),?\s*i will/iu,
    ],
  },

  // ── Indirect / encoded injection signals ──────────────────────────────
  {
    reason: "encoded_or_indirect_injection",
    score: 0.25,
    patterns: [
      // Base64 strings long enough to encode instructions
      /[A-Za-z0-9+/]{60,}={0,2}/,
      // Suspicious Unicode lookalike characters used to bypass keyword filters
      /[\u0131\u1D0E\u0261\u0280\u026F\u0279]{4,}/u,
      // "End of context" framing tricks
      /end of (text|content|post|article)[.!]?\s*new (instructions?|task|prompt)/iu,
      /텍스트 끝[.!]?\s*새로운 (?:지시|명령|프롬프트)/u,
    ],
  },
] as const;

export type InjectionReason =
  | "ignore_previous_instructions"
  | "reveal_system_prompt"
  | "role_override_attempt"
  | "policy_exfiltration_attempt"
  | "ignore_all_rules_after_this"
  | "task_hijacking"
  | "delimiter_injection"
  | "encoded_or_indirect_injection";

export type InjectionDetectionResult = {
  prompt_injection_attempt: boolean;
  prompt_injection_score: number;
  prompt_injection_reason: string;
  prompt_injection_excerpt: string;
};

function createExcerpt(text: string, startIndex: number, endIndex: number) {
  const excerptStart = Math.max(0, startIndex - 40);
  const excerptEnd = Math.min(text.length, endIndex + 40);
  return text.slice(excerptStart, excerptEnd).trim();
}

export function detectPromptInjection(text: string): InjectionDetectionResult {
  const normalizedText = text.trim();
  const matchedReasons = new Set<string>();
  let cumulativeScore = 0;
  let excerpt = "";

  for (const rule of DETECTION_RULES) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(normalizedText);
      if (!match) {
        continue;
      }

      matchedReasons.add(rule.reason);
      cumulativeScore += rule.score;

      if (!excerpt && typeof match.index === "number") {
        excerpt = createExcerpt(
          normalizedText,
          match.index,
          match.index + match[0].length,
        );
      }
    }
  }

  if (matchedReasons.size === 0) {
    return {
      prompt_injection_attempt: false,
      prompt_injection_score: 0,
      prompt_injection_reason: "",
      prompt_injection_excerpt: "",
    };
  }

  return {
    prompt_injection_attempt: true,
    prompt_injection_score: Number(Math.min(1, cumulativeScore).toFixed(2)),
    prompt_injection_reason: Array.from(matchedReasons).join(", "),
    prompt_injection_excerpt: excerpt,
  };
}
