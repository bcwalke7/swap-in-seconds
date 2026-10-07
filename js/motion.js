/**
 * Motion layer: animates each slide change.
 *
 * It only listens for "deck:change", so navigation never waits on animation.
 * If GSAP fails to load, the deck still works with instant changes.
 */
(() => {
  if (!window.gsap) return;

  const root = document.documentElement;
  const spotlight = document.querySelector('.spotlight');
  const rootStyles = getComputedStyle(root);

  // Where the spotlight rests for each gel, as % of the viewport [x, y].
  const SPOT_POSITIONS = {
    house: [30, 35],
    magenta: [24, 30],
    amber: [62, 28],
    teal: [40, 62],
    violet: [70, 55],
    lime: [28, 40],
  };

  function gelColors(name) {
    return {
      '--gel': rootStyles.getPropertyValue(`--gel-${name}`).trim(),
      '--stage': rootStyles.getPropertyValue(`--stage-${name}`).trim(),
    };
  }

  function spotPosition(name) {
    const [x, y] = SPOT_POSITIONS[name] || SPOT_POSITIONS.house;
    return {
      x: (window.innerWidth * x) / 100,
      y: (window.innerHeight * y) / 100,
    };
  }

  gsap.set(spotlight, {xPercent: -50, yPercent: -50, ...spotPosition('house')});

  // Stage rig: the can rotates around its yoke bolt to aim at the spotlight.
  const rig = document.querySelector('.rig');
  const can = rig.querySelector('.rig__can');
  const beam = rig.querySelector('.rig__beam');
  const PIVOT = {x: 0, y: 74}; // yoke bolt, in the SVG's own units
  const LENS_Y = 118; // where the beam leaves the lens

  gsap.set(can, {svgOrigin: `${PIVOT.x} ${PIVOT.y}`});

  function aim() {
    const box = rig.getBoundingClientRect();
    const unit = box.width / 120; // screen px per SVG unit
    const pivotX = box.left + box.width / 2;
    const pivotY = box.top + PIVOT.y * unit;
    const dx = gsap.getProperty(spotlight, 'x') - pivotX;
    const dy = gsap.getProperty(spotlight, 'y') - pivotY;

    // The can is drawn pointing straight down, which is 90 degrees.
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI - 90;
    const reach = Math.hypot(dx, dy) / unit - (LENS_Y - PIVOT.y);
    const spread = reach * 0.28;
    beam.setAttribute(
      'points',
      `-16,${LENS_Y} 16,${LENS_Y} ${spread},${LENS_Y + reach} ${-spread},${LENS_Y + reach}`
    );

    gsap.set(can, {rotation: angle});
  }

  aim();
  window.addEventListener('resize', aim);

  let current = null;
  const mm = gsap.matchMedia();

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const {reduce} = context.conditions;

      function onChange(event) {
        const {to, direction} = event.detail;
        const gel = to.dataset.gel || 'house';
        const parts = to.querySelectorAll(':scope > *');
        const headings = to.querySelectorAll('h1, h2');

        if (current) current.kill();

        gsap.set(headings, {clearProps: 'fontVariationSettings'});
        const restingWidths = Array.from(headings, (heading) => {
          const value = getComputedStyle(heading).fontVariationSettings;
          return value === 'normal' ? '"wdth" 100' : value;
        });

        if (reduce) {
          gsap.set(root, gelColors(gel));
          gsap.set(spotlight, spotPosition(gel));
          gsap.set(parts, {autoAlpha: 1, y: 0});
          aim();
          return;
        }

        current = gsap.timeline({defaults: {ease: 'power3.out'}})
          .to(root, {...gelColors(gel), duration: 0.8, ease: 'power2.inOut'}, 0)
          .to(spotlight, {...spotPosition(gel), duration: 1.1, ease: 'power2.inOut'}, 0)
          .fromTo(
            parts,
            {autoAlpha: 0, y: 40 * direction},
            {autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08},
            0.15
          )
          .fromTo(
            headings,
            {fontVariationSettings: '"wdth" 75'},
            {
              fontVariationSettings: (i) => restingWidths[i],
              duration: 1,
              ease: 'power2.out',
            },
            0.15
          );
      }

      document.addEventListener('deck:change', onChange);
      if (!reduce) gsap.ticker.add(aim);

      return () => {
        document.removeEventListener('deck:change', onChange);
        gsap.ticker.remove(aim);
      };
    }
  );
})();
