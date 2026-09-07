/**
 * Cleans raw markdown artifacts and converts informal prompt markers like "TL;DR"
 * into clean, professional, academic "Summary" headings.
 * Safely preserves content inside fenced code blocks.
 */
export function sanitizeMarkdownText(text) {
  if (!text || typeof text !== 'string') return text || '';

  // Split by fenced code blocks (```) so we never modify code snippets
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    // If inside a code block (odd index), leave untouched
    if (index % 2 === 1) return part;

    // Outside code blocks:
    // 1. If followed by dash on the same line: "TL;DR – Which one to pick?" -> "Summary: Which one to pick?"
    let cleaned = part.replace(/\bTL;?[ \t]*DR[ \t]*[–\-][ \t]*/gi, 'Summary: ');
    // 2. If followed by colon on the same line: "TL;DR: ..." -> "Summary: ..."
    cleaned = cleaned.replace(/\bTL;?[ \t]*DR[ \t]*:[ \t]*/gi, 'Summary: ');
    // 3. Standalone "TL;DR" or "TLDR" -> "Summary"
    cleaned = cleaned.replace(/\bTL;?[ \t]*DR\b/gi, 'Summary');
    return cleaned;
  }).join('');
}
