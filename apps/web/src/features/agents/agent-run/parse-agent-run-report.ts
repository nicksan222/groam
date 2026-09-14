import type {
  AgentRunReportField,
  AgentRunReportItem,
  AgentRunReportSection,
  AgentRunReportSegment,
  AgentRunReportTone,
  ParsedAgentRunReport
} from '@/types/agents';

const FIELD_RE =
  /\b([A-Za-z][\w]*Ids?|cost|price|amount)\s*[:=]\s*(\[[^\]]*\]|"[^"]*"|'[^']*'|[$€£]?\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:USD|EUR|GBP|CAD))?|[A-Za-z0-9_-]+)/gi;
const CONVEX_ID_RE = /\b[a-z][a-z0-9]{31}\b/g;
const MONEY_RE = /[$€£]\s?\d[\d,]*(?:\.\d{1,2})?|\b\d+(?:\.\d{1,2})?\s?(?:USD|EUR|GBP|CAD)\b/gi;
const BULLET_RE = /^(?:[-*•]|\d+[.)])\s+/u;
const MD_HEADING_RE = /^#{1,6}\s+/;
const BOLD_HEADING_RE = /^\*\*(.+?)\*\*:?\s*$/;

export function parseAgentRunReport(report: string): ParsedAgentRunReport {
  const lines = report.replaceAll('\r\n', '\n').split('\n');
  const lead: AgentRunReportItem[] = [];
  const sections: AgentRunReportSection[] = [];
  let current: AgentRunReportSection | null = null;
  let buffer: string[] = [];

  const flushBuffer = () => {
    const items = linesToItems(buffer);
    buffer = [];
    if (items.length === 0) {
      return;
    }
    if (current) {
      current.items.push(...items);
      return;
    }
    lead.push(...items);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const heading = headingFromLine(line, lines[index + 1]);
    if (heading) {
      flushBuffer();
      current = { items: [], title: heading.title, tone: heading.tone };
      sections.push(current);
      continue;
    }
    buffer.push(line);
  }
  flushBuffer();

  if (sections.length === 0 && lead.length === 0 && report.trim()) {
    lead.push(itemFromText(report.trim()));
  }

  return { lead, sections };
}

function headingFromLine(
  line: string,
  nextLine: string | undefined
): { title: string; tone: AgentRunReportTone } | null {
  const trimmed = line.trim();
  if (!trimmed || BULLET_RE.test(trimmed)) {
    return null;
  }

  let title: string | null = null;
  if (MD_HEADING_RE.test(trimmed)) {
    title = trimmed.replace(MD_HEADING_RE, '').replace(/\*+/g, '').trim();
  } else {
    const bold = trimmed.match(BOLD_HEADING_RE);
    if (bold?.[1]) {
      title = bold[1].trim();
    } else if (isPlainHeading(trimmed, nextLine)) {
      title = trimmed.replace(/:$/, '').replace(/\*+/g, '').trim();
    }
  }

  if (!title) {
    return null;
  }
  return { title, tone: toneFromTitle(title) };
}

function isKnownSectionTitle(title: string): boolean {
  return /^(changes made|attempted but not applied|not applied)\b/i.test(title);
}

function isPlainHeading(trimmed: string, nextLine: string | undefined): boolean {
  const title = trimmed.replace(/:$/, '');
  if (isKnownSectionTitle(title)) {
    return true;
  }
  if (!trimmed.endsWith(':') || trimmed.length > 72) {
    return false;
  }
  const next = nextLine?.trim() ?? '';
  return next === '' || BULLET_RE.test(next);
}

function toneFromTitle(title: string): AgentRunReportTone {
  if (/not applied|attempted|could not apply|did not apply|held back|skipped/i.test(title)) {
    return 'attempted';
  }
  if (/change|applied|updated the draft|draft itinerary|what (i|we) (did|changed)/i.test(title)) {
    return 'applied';
  }
  return 'neutral';
}

function linesToItems(lines: string[]): AgentRunReportItem[] {
  const items: AgentRunReportItem[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim();
    paragraph = [];
    if (text) {
      items.push(itemFromText(text));
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    if (BULLET_RE.test(trimmed)) {
      flushParagraph();
      items.push(itemFromText(trimmed.replace(BULLET_RE, '')));
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return items;
}

function itemFromText(text: string): AgentRunReportItem {
  const fields: AgentRunReportField[] = [];
  const withoutFields = text.replace(FIELD_RE, (match, key: string, raw: string) => {
    fields.push({
      ids: extractIds(raw),
      label: humanizeField(key),
      raw: raw.trim()
    });
    return match.endsWith(' ') ? ' ' : '';
  });
  const cleaned = collapseSpaces(withoutFields.replace(/\(\s*\)/g, '').replace(/:\s*$/g, ''));
  return {
    fields,
    segments: segmentsFromText(cleaned || text.trim())
  };
}

function humanizeField(key: string): string {
  const idSuffix = /Ids$/i.test(key) ? 's' : '';
  const base = key.replace(/Ids?$/i, '');
  const spaced = base.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  const label = spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  if (/^(cost|price|amount)$/i.test(key)) {
    return label;
  }
  return `${label}${idSuffix}`;
}

function extractIds(raw: string): string[] {
  const quoted = [...raw.matchAll(/["']([^"']+)["']/g)].map((match) => match[1] ?? '');
  if (quoted.length > 0) {
    return unique(quoted);
  }
  const convex = [...raw.matchAll(CONVEX_ID_RE)].map((match) => match[0]);
  CONVEX_ID_RE.lastIndex = 0;
  if (convex.length > 0) {
    return unique(convex);
  }
  const token = raw.trim().replace(/^\[|\]$/g, '');
  if (/^[A-Za-z][A-Za-z0-9_-]{7,}$/.test(token)) {
    return [token];
  }
  return [];
}

function segmentsFromText(text: string): AgentRunReportSegment[] {
  const pieces = splitByMarkdownEmphasis(text);
  const segments: AgentRunReportSegment[] = [];
  for (const piece of pieces) {
    if (piece.type === 'emphasis') {
      segments.push(piece);
      continue;
    }
    segments.push(...splitIdsAndMoney(piece.value));
  }
  return mergeTextSegments(segments);
}

function splitByMarkdownEmphasis(text: string): AgentRunReportSegment[] {
  const segments: AgentRunReportSegment[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, index) });
    }
    segments.push({ type: 'emphasis', value: match[1] ?? match[2] ?? match[3] ?? '' });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }
  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}

function splitIdsAndMoney(text: string): AgentRunReportSegment[] {
  const marks: { end: number; start: number; type: 'id' | 'money'; value: string }[] = [];
  for (const match of text.matchAll(CONVEX_ID_RE)) {
    const start = match.index ?? 0;
    marks.push({ end: start + match[0].length, start, type: 'id', value: match[0] });
  }
  for (const match of text.matchAll(MONEY_RE)) {
    const start = match.index ?? 0;
    marks.push({ end: start + match[0].length, start, type: 'money', value: match[0] });
  }
  marks.sort((a, b) => a.start - b.start);
  const segments: AgentRunReportSegment[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start < cursor) {
      continue;
    }
    if (mark.start > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, mark.start) });
    }
    segments.push({ type: mark.type, value: mark.value });
    cursor = mark.end;
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }
  return segments;
}

function mergeTextSegments(segments: AgentRunReportSegment[]): AgentRunReportSegment[] {
  const merged: AgentRunReportSegment[] = [];
  for (const segment of segments) {
    const last = merged.at(-1);
    if (segment.type === 'text' && last?.type === 'text') {
      last.value += segment.value;
      continue;
    }
    if (segment.type === 'text' && segment.value === '') {
      continue;
    }
    merged.push({ ...segment });
  }
  return merged;
}

function collapseSpaces(value: string): string {
  return value
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
