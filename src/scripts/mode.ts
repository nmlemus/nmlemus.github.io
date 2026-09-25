/** Reader-mode toggle. The initial mode is applied by an inline script in <head> to avoid a flash. */
export function initModeToggle(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-mode-toggle]');
  const label = button?.querySelector('[data-label]');
  if (!button || !label) return;
  const root = document.documentElement;
  const sync = () => {
    const reader = root.dataset.mode === 'reader';
    button.setAttribute('aria-pressed', String(reader));
    label.textContent = (reader ? button.dataset.terminal : button.dataset.reader) ?? '';
  };
  button.addEventListener('click', () => {
    if (root.dataset.mode === 'reader') delete root.dataset.mode;
    else root.dataset.mode = 'reader';
    try {
      localStorage.setItem('mode', root.dataset.mode ?? 'terminal');
    } catch {
      // Storage blocked (private mode): the choice lasts for this page only.
    }
    sync();
  });
  sync();
}
