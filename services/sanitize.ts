export const Sanitize = {
  text(input: unknown): string {
    if (input === null || input === undefined) return '';
    const value = String(input);
    const div = document.createElement('div');
    div.textContent = value;
    return div.textContent || '';
  },
};