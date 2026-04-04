/** Wire #btn-fullscreen on demo pages (browser Fullscreen API). */
const btn = document.getElementById('btn-fullscreen') as HTMLButtonElement | null;
if (btn) {
  const sync = () => {
    btn.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
  };
  document.addEventListener('fullscreenchange', sync);
  btn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  });
  sync();
}
