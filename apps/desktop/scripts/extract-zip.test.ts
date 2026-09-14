import { describe, expect, test } from 'bun:test';
import { extractZipArgs, windowsTarPath } from './extract-zip';

describe('windowsTarPath', () => {
  test('points at System32 tar so Git Bash GNU tar is not used', () => {
    expect(windowsTarPath('C:\\Windows')).toBe('C:\\Windows\\System32\\tar.exe');
  });
});

describe('extractZipArgs', () => {
  test('uses Windows bsdtar on win32', () => {
    expect(extractZipArgs('win32', 'C:\\tmp\\bun.zip', 'C:\\tmp\\extract', 'C:\\Windows')).toEqual([
      'C:\\Windows\\System32\\tar.exe',
      ['-xf', 'C:\\tmp\\bun.zip', '-C', 'C:\\tmp\\extract']
    ]);
  });

  test('uses unzip on Unix', () => {
    expect(extractZipArgs('linux', '/tmp/bun.zip', '/tmp/extract')).toEqual([
      'unzip',
      ['-o', '/tmp/bun.zip', '-d', '/tmp/extract']
    ]);
  });
});
