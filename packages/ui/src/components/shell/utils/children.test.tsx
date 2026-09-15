import { expect, test } from 'vitest';
import Footer from '#tsx/components/shell/components/footer';
import Header from '#tsx/components/shell/components/header';
import { extractChildrenNotOfType, extractChildrenOfType } from './children';

test('extractChildrenOfType returns only matching elements', () => {
  const children = [
    <Header key="one">Header one</Header>,
    <Footer key="footer">Footer</Footer>,
    <Header key="two">Header two</Header>
  ];

  const headers = extractChildrenOfType(children, Header);
  expect(headers).toHaveLength(2);
  expect(headers[0].props.children).toBe('Header one');
  expect(headers[1].props.children).toBe('Header two');
});

test('extractChildrenNotOfType excludes matching elements', () => {
  const children = [
    <Header key="header">Header</Header>,
    <Footer key="footer">Footer</Footer>,
    <span key="other">Other</span>
  ];

  const withoutHeaders = extractChildrenNotOfType(children, Header);
  expect(withoutHeaders).toHaveLength(2);
});
