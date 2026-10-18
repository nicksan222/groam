import {
  formatMessage,
  normalizeMessage,
  textAttributes,
  type Messages,
  type Values
} from '@/i18n/format';

const dictionaries = new WeakMap<Document, Messages>();
const currentDocument = () => (typeof document === 'undefined' ? undefined : document);

function messagesFor(doc: Document): Messages {
  let messages = dictionaries.get(doc);
  if (!messages) {
    const source = doc.getElementById('landing-translations')?.textContent;
    messages = source ? (JSON.parse(source) as Messages) : {};
    dictionaries.set(doc, messages);
  }
  return messages;
}

export function translateText(text: string, values?: Values): string {
  const doc = currentDocument();
  return formatMessage(text, doc?.documentElement.lang === 'it' ? messagesFor(doc) : {}, values);
}

function translateAttributes(element: Element) {
  for (const attribute of element.attributes) {
    if (!textAttributes.has(attribute.name)) continue;
    element.setAttribute(attribute.name, translateText(attribute.value));
  }
}

function translateNodeText(node: Node) {
  const source = node.textContent ?? '';
  if (!source.trim()) return;
  node.textContent = source.replace(
    /^(\s*)([\s\S]*?)(\s*)$/u,
    (_, before: string, text: string, after: string) =>
      before + translateText(normalizeMessage(text)) + after
  );
}

/** Localize generated markup while detached, before inserting it into the live example. */
export function translateHtml(html: string): string {
  const doc = currentDocument();
  if (doc?.documentElement.lang !== 'it') return html;
  const template = doc.createElement('template');
  template.innerHTML = html;
  const walk = (node: Node) => {
    if (node.nodeType === 3) translateNodeText(node);
    if (node instanceof Element) {
      if (node.matches('script, style, [translate="no"]')) return;
      translateAttributes(node);
    }
    for (const child of node.childNodes) walk(child);
    if (node instanceof HTMLTemplateElement) walk(node.content);
  };
  walk(template.content);
  return template.innerHTML;
}
