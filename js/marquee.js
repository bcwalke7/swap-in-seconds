/**
 * Marquee signs: draws an SVG board with a bulb border behind each .marquee.
 *
 * The text stays real HTML, so it sizes itself and stays readable to screen
 * readers. This script only measures it and draws the board to fit. It runs
 * without GSAP, so the signs still appear if the motion layer fails.
 */
(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const BULB_GAP = 18; // target px between bulbs
  const BULB_INSET = 9; // px from the board edge to the bulb centers
  const BULB_RADIUS = 3;

  // Evenly spaced points around a rectangle, each corner used once.
  function bulbPoints(width, height) {
    const left = BULB_INSET;
    const top = BULB_INSET;
    const right = width - BULB_INSET;
    const bottom = height - BULB_INSET;
    const across = Math.max(1, Math.round((right - left) / BULB_GAP));
    const down = Math.max(1, Math.round((bottom - top) / BULB_GAP));
    const points = [];

    for (let i = 0; i < across; i++) points.push([left + ((right - left) * i) / across, top]);
    for (let i = 0; i < down; i++) points.push([right, top + ((bottom - top) * i) / down]);
    for (let i = 0; i < across; i++) points.push([right - ((right - left) * i) / across, bottom]);
    for (let i = 0; i < down; i++) points.push([left, bottom - ((bottom - top) * i) / down]);

    return points;
  }

  function drawBoard(sign) {
    const width = sign.offsetWidth;
    const height = sign.offsetHeight;
    if (!width || !height) return;

    let board = sign.querySelector('.marquee__board');
    if (!board) {
      board = document.createElementNS(SVG_NS, 'svg');
      board.classList.add('marquee__board');
      board.setAttribute('aria-hidden', 'true');
      sign.prepend(board);
    }

    const bulbs = bulbPoints(width, height)
      .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${BULB_RADIUS}"/>`)
      .join('');

    board.setAttribute('viewBox', `0 0 ${width} ${height}`);
    board.innerHTML =
      `<rect class="marquee__panel" x="1" y="1" width="${width - 2}" height="${height - 2}" rx="6"/>` +
      `<g class="marquee__bulbs">${bulbs}</g>`;
  }

  // Redraw whenever a sign changes size: on load, when fonts arrive, on resize.
  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => drawBoard(entry.target));
  });

  document.querySelectorAll('.marquee').forEach((sign) => {
    drawBoard(sign);
    observer.observe(sign);
  });
})();
