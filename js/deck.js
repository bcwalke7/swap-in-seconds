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
  const prevButton = document.querySelector('[data-deck-prev]');
  const nextButton = document.querySelector('[data-deck-next]');
  const announcer = document.querySelector('[data-deck-announcer]');

  let index = -1;
  let shown = 0; // how many of the active slide's steps are revealed

  // Steps: parts of a slide marked data-step, revealed one at a time before moving on.
  function stepsOf(slide) {
    return slide.querySelectorAll('[data-step]');
  }

  function updateButtons() {
    const total = stepsOf(slides[index]).length;
    prevButton.disabled = index === 0 && shown === 0;
    nextButton.disabled = index === slides.length - 1 && shown === total;
  }

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

    // Arriving forward starts with every step hidden; arriving backward shows them all.
    const steps = stepsOf(to);
    const showAll = direction < 0;
    steps.forEach((step) => step.classList.toggle('is-shown', showAll));
    shown = showAll ? steps.length : 0;

    index = target;
    document.documentElement.dataset.gel = to.dataset.gel || 'house';
    currentEl.textContent = index + 1;
    updateButtons();
    announcer.textContent = to.getAttribute('aria-label');
    history.replaceState(null, '', `#${to.id}`);

    document.dispatchEvent(
      new CustomEvent('deck:change', {detail: {from, to, direction}})
    );
  }

  function setStep(step, isShown) {
    step.classList.toggle('is-shown', isShown);
    if (isShown) announcer.textContent = step.textContent.replace(/\s+/g, ' ').trim();
    updateButtons();
    document.dispatchEvent(
      new CustomEvent('deck:step', {detail: {slide: slides[index], step, shown: isShown}})
    );
  }

  // Next reveals the slide's next step, or moves on once they're all showing.
  function next() {
    const steps = stepsOf(slides[index]);
    if (shown < steps.length) {
      shown += 1;
      setStep(steps[shown - 1], true);
    } else {
      goTo(index + 1);
    }
  }

  // Back hides the last revealed step, or goes to the previous slide.
  function prev() {
    if (shown > 0) {
      shown -= 1;
      setStep(stepsOf(slides[index])[shown], false);
    } else {
      goTo(index - 1);
    }
  }

  const KEYS_NEXT = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
  const KEYS_PREV = ['ArrowLeft', 'ArrowUp', 'PageUp'];

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // A focused button handles its own Space and Enter, so they don't fire twice.
    if (event.target.closest('button') && (event.key === ' ' || event.key === 'Enter')) return;

    if (KEYS_NEXT.includes(event.key)) {
      event.preventDefault();
      next();
    } else if (KEYS_PREV.includes(event.key)) {
      event.preventDefault();
      prev();
    } else if (event.key === 'Home') {
      goTo(0);
    } else if (event.key === 'End') {
      goTo(slides.length - 1);
    } else if (/^[1-9]$/.test(event.key)) {
      goTo(Number(event.key) - 1);
    }
  });

  prevButton.addEventListener('click', prev);
  nextButton.addEventListener('click', next);

  window.addEventListener('hashchange', () => goTo(indexFromHash()));

  goTo(indexFromHash());
})();
