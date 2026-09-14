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
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '{' || ch === '[') {
      indent += 1;
      out += `${ch}\n${'  '.repeat(indent)}`;
      continue;
    }
    if (ch === '}' || ch === ']') {
      indent = Math.max(0, indent - 1);
      out += `\n${'  '.repeat(indent)}${ch}`;
      continue;
    }
    if (ch === ',') {
      out += `,\n${'  '.repeat(indent)}`;
      continue;
    }
    if (ch === ':') {
      out += ': ';
      continue;
    }
    out += ch;
  }
  return truncated ? `${out}…` : out;
}
