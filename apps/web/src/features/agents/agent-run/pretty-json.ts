export function prettyJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return prettyTruncatedJson(value);
  }
}

function prettyTruncatedJson(value: string): string {
  const truncated = value.endsWith('…');
  const source = truncated ? value.slice(0, -1) : value;
  let out = '';
  let indent = 0;
  let inString = false;
  let escaped = false;
  for (const ch of source) {
    const next = formatJsonCharacter({ ch, escaped, indent, inString });
    out += next.text;
    indent = next.indent;
    inString = next.inString;
    escaped = next.escaped;
  }
  return truncated ? `${out}…` : out;
}

function formatJsonCharacter({
  ch,
  escaped,
  indent,
  inString
}: {
  ch: string;
  escaped: boolean;
  indent: number;
  inString: boolean;
}) {
  if (inString) return formatStringCharacter(ch, escaped, indent);
  if (ch === '"') return { escaped: false, indent, inString: true, text: ch };
  if ('{['.includes(ch))
    return {
      escaped: false,
      indent: indent + 1,
      inString: false,
      text: `${ch}\n${'  '.repeat(indent + 1)}`
    };
  if ('}]'.includes(ch))
    return {
      escaped: false,
      indent: Math.max(0, indent - 1),
      inString: false,
      text: `\n${'  '.repeat(Math.max(0, indent - 1))}${ch}`
    };
  if (ch === ',')
    return { escaped: false, indent, inString: false, text: `,\n${'  '.repeat(indent)}` };
  return { escaped: false, indent, inString: false, text: ch === ':' ? ': ' : ch };
}

function formatStringCharacter(ch: string, escaped: boolean, indent: number) {
  return {
    escaped: !escaped && ch === '\\',
    indent,
    inString: escaped || ch !== '"',
    text: ch
  };
}
