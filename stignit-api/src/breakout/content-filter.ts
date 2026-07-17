/**
 * Lightweight content filter (PRD 6.6.5). FLAGS profanity / clearly off-topic
 * content; it does not auto-delete (messages are immutable). A moderator acts on
 * flags. Deliberately conservative to avoid suppressing urgent language.
 */
const PROFANITY = /\b(fuck|shit|bastard|asshole|bitch)\b/i;

export function isFlaggable(content: string): boolean {
  return PROFANITY.test(content);
}
