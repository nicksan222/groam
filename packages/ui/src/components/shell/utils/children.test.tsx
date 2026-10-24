import { expect, test } from 'vite-plus/test';
import Footer from '#tsx/components/shell/components/footer';
import Header from '#tsx/components/shell/components/header';
import { extractChildrenNotOfType, extractChildrenOfType } from './children';

test('extractChildrenOfType returns only matching elements', () => {
  const children = [
    <Header key="one" title="Header one" />,
    <Footer key="footer">Footer</Footer>,
    <Header key="two" title="Header two" />
  ];

  const headers = extractChildrenOfType(children, Header);
  expect(headers).toHaveLength(2);
  expect(headers[0].props.title).toBe('Header one');
  expect(headers[1].props.title).toBe('Header two');
});

test('extractChildrenNotOfType excludes matching elements', () => {
  const children = [
    <Header key="header" title="Header" />,
    <Footer key="footer">Footer</Footer>,
    <span key="other">Other</span>
  ];

  const withoutHeaders = extractChildrenNotOfType(children, Header);
  expect(withoutHeaders).toHaveLength(2);
});
