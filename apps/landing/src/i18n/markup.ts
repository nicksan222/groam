import { parseFragment, serialize, type DefaultTreeAdapterTypes } from 'parse5';
import { italianMessages, runtimeCommon } from '@/i18n/catalog';
import { formatMessage, isMessage, normalizeMessage, textAttributes } from '@/i18n/format';
import { localizedPath, type Locale } from '@/i18n/locale';
import { runtimeSourceMessages } from '@/i18n/runtime-sources';

type Node = DefaultTreeAdapterTypes.Node;

function skipNode(node: Node): boolean {
  if (!('tagName' in node)) return false;
  return (
    node.tagName === 'script' ||
    node.tagName === 'style' ||
    node.attrs.some((attribute) => attribute.name === 'translate' && attribute.value === 'no')
  );
}

function translateAttributes(node: Node, locale: Locale, translate: (text: string) => string) {
  if (!('attrs' in node)) return;
  const languageLink = node.attrs.some((attribute) => attribute.name === 'data-language-link');
  for (const attribute of node.attrs) {
    if (textAttributes.has(attribute.name)) attribute.value = translate(attribute.value);
    else if (attribute.name === 'href' && !languageLink)
      attribute.value = localizedPath(attribute.value, locale);
  }
}

/** Translate trusted, rendered marketing markup at build time, without changing behavior hooks. */
export function localizeMarkup(html: string, locale: Locale, path: string) {
  if (locale === 'en') return { html, messages: {} };
  const fragment = parseFragment(html);
  const used: Record<string, string> = { ...runtimeCommon };
  const missing = new Set<string>();
  const translate = (text: string) => {
    const key = normalizeMessage(text);
    if (!isMessage(key)) return text;
    const translated = formatMessage(key, italianMessages);
    if (!(key in italianMessages) && translated === key) missing.add(key);
    used[key] = translated;
    const before = text.match(/^\s*/u)?.[0] ?? '';
    const after = text.match(/\s*$/u)?.[0] ?? '';
    return before + translated + after;
  };
  const visit = (node: Node) => {
    if (skipNode(node)) return;
    if (node.nodeName === '#text' && 'value' in node) node.value = translate(node.value);
    translateAttributes(node, locale, translate);
    if ('childNodes' in node) node.childNodes.forEach(visit);
    if ('content' in node) visit(node.content);
  };
  fragment.childNodes.forEach(visit);
  for (const key of runtimeSourceMessages(path))
    if (key in italianMessages) used[key] = italianMessages[key] ?? key;
  if (missing.size)
    throw new Error(`Missing Italian messages on ${path}:\n${[...missing].join('\n')}`);
  return { html: serialize(fragment), messages: used };
}
