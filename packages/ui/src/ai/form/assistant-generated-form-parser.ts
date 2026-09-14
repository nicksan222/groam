import { assistantFormComponentIds } from '@groam/ai-contracts/agents/registry';
import { applySpecPatch, parseSpecStreamLine, type Spec, validateSpec } from '@json-render/core';

const MAX_FORM_PATCHES = 80;
const MAX_FORM_SOURCE_LENGTH = 30_000;
const MAX_FORM_ELEMENTS = 30;
const FORBIDDEN_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_COMPONENTS = new Set<string>(assistantFormComponentIds);

export type ParsedAssistantForm = {
  hasFormSource: boolean;
  prose: string;
  spec: Spec | null;
};

export function parseAssistantGeneratedForm(text: string): ParsedAssistantForm {
  const opening = /```spec(?:\r?\n)?/u.exec(text);
  if (opening?.index === undefined) return { hasFormSource: false, prose: text, spec: null };

  const sourceStart = opening.index + opening[0].length;
  const closingIndex = text.indexOf('```', sourceStart);
  const sourceEnd = closingIndex === -1 ? text.length : closingIndex;
  const before = text.slice(0, opening.index).trimEnd();
  const after = closingIndex === -1 ? '' : text.slice(closingIndex + 3).trimStart();
  const prose = [before, after].filter(Boolean).join('\n\n');

  return {
    hasFormSource: true,
    prose,
    spec: compileAssistantForm(text.slice(sourceStart, sourceEnd))
  };
}

function compileAssistantForm(source: string): Spec | null {
  if (source.length === 0 || source.length > MAX_FORM_SOURCE_LENGTH) return null;
  const spec: Spec = { elements: {}, root: '' };
  const lines = source.split(/\r?\n/u).slice(0, MAX_FORM_PATCHES);

  try {
    for (const line of lines) {
      const patch = parseSpecStreamLine(line);
      if (patch && isSafeFormPatch(patch)) applySpecPatch(spec, patch);
    }
  } catch {
    return null;
  }

  if (!isSafeFormSpec(spec)) return null;
  return validateSpec(spec).valid ? spec : null;
}

function isSafeFormPatch(patch: { op: string; path: string }): boolean {
  if (patch.op !== 'add' && patch.op !== 'replace') return false;
  const segments = patch.path
    .split('/')
    .slice(1)
    .map((segment) => segment.replace(/~1/gu, '/').replace(/~0/gu, '~'));
  if (segments.some((segment) => FORBIDDEN_PATH_SEGMENTS.has(segment))) return false;
  return segments[0] === 'root' || segments[0] === 'elements' || segments[0] === 'state';
}

function isSafeFormSpec(spec: Spec): boolean {
  if (!spec.root || !isRecord(spec.elements)) return false;
  const entries = Object.entries(spec.elements);
  if (entries.length === 0 || entries.length > MAX_FORM_ELEMENTS) return false;

  return entries.every(([, element]) => {
    if (!isRecord(element) || typeof element.type !== 'string') return false;
    if (!ALLOWED_COMPONENTS.has(element.type) || !isRecord(element.props)) return false;
    return (
      Array.isArray(element.children) &&
      element.children.length <= MAX_FORM_ELEMENTS &&
      element.children.every((child) => typeof child === 'string')
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
