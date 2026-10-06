/**
 * Deck controller: keyboard navigation between slides.
 *
 * It owns which slide is active. Animation hooks in later by listening
 * for the "deck:change" event, so motion never controls navigation.
 */
(() => {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const currentEl = document.querySelector('[data-deck-current]');
  const totalEl = document.querySelector('[data-deck-total]');
  const announcer = document.querySelector('[data-deck-announcer]');

  let index = -1;

  totalEl.textContent = slides.length;

  function indexFromHash() {
    const id = location.hash.slice(1);
    const found = slides.findIndex((slide) => slide.id === id);
    return found === -1 ? 0 : found;
  }

  function goTo(nextIndex) {
    const target = Math.max(0, Math.min(nextIndex, slides.length - 1));
    if (target === index) return;

    const from = slides[index] || null;
    const to = slides[target];
    const direction = target > index ? 1 : -1;

    slides.forEach((slide, i) => {
      const isActive = i === target;
      slide.classList.toggle('is-active', isActive);
      slide.inert = !isActive;
    });

    index = target;
    document.documentElement.dataset.gel = to.dataset.gel || 'house';
    currentEl.textContent = index + 1;
    announcer.textContent = to.getAttribute('aria-label');
    history.replaceState(null, '', `#${to.id}`);

    document.dispatchEvent(
      new CustomEvent('deck:change', {detail: {from, to, direction}})
    );
  }

  const KEYS_NEXT = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
  const KEYS_PREV = ['ArrowLeft', 'ArrowUp', 'PageUp'];

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (KEYS_NEXT.includes(event.key)) {
      event.preventDefault();
      goTo(index + 1);
    } else if (KEYS_PREV.includes(event.key)) {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === 'Home') {
      goTo(0);
    } else if (event.key === 'End') {
      goTo(slides.length - 1);
    } else if (/^[1-9]$/.test(event.key)) {
      goTo(Number(event.key) - 1);
    }
  });

  window.addEventListener('hashchange', () => goTo(indexFromHash()));

  goTo(indexFromHash());
})();
