const answerHeadings = new Set(['answer', 'recommendation', 'summary']);

/**
 * The answer and caveat a reader needs first. Reports are Markdown; the researcher leads with an
 * optional blockquote caveat and uses a Recommendation (or Answer/Summary) section.
 */
export function researchReportSummary(report: null | string): {
  answer: null | string;
  caveat: null | string;
} {
  if (!report) return { answer: null, caveat: null };
  const parts = report.split(/^#{1,4}[ \t]+(.+)$/m);
  const caveat =
    (parts[0] ?? '')
      .split('\n')
      .filter((line) => line.startsWith('>'))
      .map((line) => line.replace(/^>\s?/, ''))
      .join(' ')
      .trim() || null;
  for (let index = 1; index < parts.length; index += 2) {
    const heading = parts[index]?.trim().toLowerCase();
    if (!heading || !answerHeadings.has(heading)) continue;
    const answer = (parts[index + 1] ?? '')
      .trim()
      .split(/\n\s*\n/)[0]
      ?.trim();
    if (answer) return { answer, caveat };
  }
  return { answer: null, caveat };
}
