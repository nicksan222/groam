import { createContext } from 'react';

/** How fields inside a Form lay out, so call sites never restyle fields one by one. */
export type FormLayout = {
  fieldLayout: 'split' | 'stack';
};

export const FormLayoutContext = createContext<FormLayout>({ fieldLayout: 'stack' });

/** How deep a FormSection sits; a section inside another reads as a quieter sub-group. */
export const FormSectionDepthContext = createContext(0);
