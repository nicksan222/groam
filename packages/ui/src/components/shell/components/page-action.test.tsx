import { ArrowRight, MoreHorizontal, Plus } from '@groam/icons';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import Shell from '#tsx/components/shell/client';

test('a primary action is the filled button, named by its label, with a tooltip', async () => {
  const onClick = vi.fn();
  await render(<Shell.Action icon={Plus} label="Create trip" onClick={onClick} />);
  const button = page.getByRole('button', { name: 'Create trip' });
  await expect.element(button).toBeInTheDocument();
  const element = button.element();
  expect(element.getAttribute('title')).toBe('Create trip');
  expect(element.getAttribute('type')).toBe('button');
  expect(element.className).toContain('bg-primary');
  expect(element.className).toContain('max-md:size-12');
  expect(element.className).toContain('max-md:rounded-full');
  await userEvent.click(element);
  expect(onClick).toHaveBeenCalledOnce();
});

test('a secondary action is the 40px popover circle on phones', async () => {
  await render(<Shell.Action icon={Plus} label="Mark all read" tone="secondary" />);
  const className = page.getByRole('button', { name: 'Mark all read' }).element().className;
  expect(className).toContain('max-md:size-10');
  expect(className).toContain('max-md:bg-popover');
  expect(className).toContain('max-md:border-border');
  expect(className).toContain('border-input');
  expect(className).not.toContain('max-md:size-12');
});

test('the label is visible on desktop, with its icon before it', async () => {
  await useViewport(1280, 800);
  await render(<Shell.Action icon={Plus} label="Create trip" />);
  const button = page.getByRole('button', { name: 'Create trip' }).element();
  const label = button.querySelector('span') as HTMLElement;
  expect(label.textContent).toBe('Create trip');
  expect(getComputedStyle(label).position).toBe('static');
  expect(button.firstElementChild?.tagName.toLowerCase()).toBe('svg');
  expect(button.getBoundingClientRect().height).toBe(32);
  expect(button.getBoundingClientRect().width).toBeGreaterThan(80);
});

test('on a phone the action is a round icon with the label only for assistive technology', async () => {
  await useViewport(390, 844);
  await render(<Shell.Action icon={Plus} label="Create trip" />);
  const button = page.getByRole('button', { name: 'Create trip' }).element();
  const label = button.querySelector('span') as HTMLElement;
  expect(getComputedStyle(label).position).toBe('absolute');
  expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  expect(button.getBoundingClientRect().width).toBe(48);
  expect(button.getBoundingClientRect().height).toBe(48);
  expect(getComputedStyle(button).borderRadius).not.toBe('8px');
});

test('an icon-only secondary stays the 32px outline icon button on desktop', async () => {
  await useViewport(1280, 800);
  await render(
    <Shell.Action icon={MoreHorizontal} iconOnly label="Trip actions" tone="secondary" />
  );
  const button = page.getByRole('button', { name: 'Trip actions' }).element();
  expect(button.getBoundingClientRect().width).toBe(32);
  expect(button.getBoundingClientRect().height).toBe(32);
  expect(getComputedStyle(button.querySelector('span') as HTMLElement).position).toBe('absolute');
});

test('a desktop-only trailing icon follows the label and leaves the phone icon alone', async () => {
  await useViewport(1280, 800);
  await render(
    <Shell.Action desktopIcon={ArrowRight} desktopIconEnd icon={Plus} label="Suggest a change" />
  );
  const button = page.getByRole('button', { name: 'Suggest a change' }).element();
  const [phoneIcon, label, desktopIcon] = Array.from(button.children);
  expect(getComputedStyle(phoneIcon as Element).display).toBe('none');
  expect(label?.tagName.toLowerCase()).toBe('span');
  expect(getComputedStyle(desktopIcon as Element).display).not.toBe('none');
});

test('pending swaps the icon for a spinner and keeps the name', async () => {
  await render(<Shell.Action disabled icon={Plus} label="Send for review" pending />);
  const button = page.getByRole('button', { name: 'Send for review' });
  await expect.element(button).toBeDisabled();
  expect(button.element().querySelector('.animate-spin')).not.toBeNull();
});
