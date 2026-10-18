import { formatMessage, type Values } from '@/i18n/format';
import type { Locale } from '@/i18n/locale';
import ai, { aiRuntimeKeys } from '@/i18n/messages/it-ai';
import common from '@/i18n/messages/it-common';
import home from '@/i18n/messages/it-home-features';
import interactions, { interactionRuntimeKeys } from '@/i18n/messages/it-interactions';
import pricingLegal, { pricingRuntimeKeys } from '@/i18n/messages/it-pricing-legal';
import review from '@/i18n/messages/it-review';

/** Shared source phrases must have one translation across all sections. */
export const italianMessages: Record<string, string> = {};
for (const catalog of [home, ai, review, pricingLegal, interactions, common]) {
  for (const [source, translation] of Object.entries(catalog)) {
    const previous = italianMessages[source];
    if (previous !== undefined && previous !== translation)
      throw new Error(`Conflicting Italian translations for: ${source}`);
    italianMessages[source] = translation;
  }
}

export function translate(locale: Locale, text: string, values?: Values): string {
  return formatMessage(text, locale === 'it' ? italianMessages : {}, values);
}

const runtimeKeys = new Set<string>([
  ...aiRuntimeKeys,
  ...pricingRuntimeKeys,
  ...interactionRuntimeKeys
]);
export const runtimeCommon = Object.fromEntries(
  Object.entries(italianMessages).filter(
    ([key]) => key in common || runtimeKeys.has(key) || /\{\w+\}/u.test(key)
  )
);
