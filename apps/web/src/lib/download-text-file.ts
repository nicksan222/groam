export function downloadTextFile(filename: string, contents: string): void {
  const href = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(href);
  }
}
