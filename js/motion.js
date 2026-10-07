/**
 * Motion layer: animates each slide change.
 *
 * It only listens for "deck:change", so navigation never waits on animation.
 * If GSAP fails to load, the deck still works with instant changes.
 */
(() => {
  if (!window.gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);

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

  // tilt 0 = hanging straight down, 1 = aimed at the spotlight. The intro animates it.
  const rigState = {tilt: 1};

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

    gsap.set(can, {rotation: angle * rigState.tilt});
  }

  aim();
  window.addEventListener('resize', aim);

  let current = null;
  let leavingSign = null;

  // How far a sign has to rise to sit fully above the top of the screen.
  function dropDistance(sign) {
    return sign.offsetTop + sign.offsetHeight + 40;
  }

  // Intro: the page opens on an empty stage with the light off and pointing down.
  // Scrolling brings everything on stage. Only runs when the deck opens on the title.
  const titleSlide = document.querySelector('#title');
  const deckNav = document.querySelector('.deck-nav');
  const lens = rig.querySelector('.rig__lens');
  const INTRO_KEYS_NEXT = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
  const INTRO_KEYS_PREV = ['ArrowLeft', 'ArrowUp', 'PageUp'];
  let intro = null;
  let motionAllowed = false;
  const prevButton = document.querySelector('[data-deck-prev]');

  // On the title, the back arrow returns to the preshow instead of being disabled.
  function preshowAvailable() {
    return motionAllowed && window.ScrollTrigger && !intro && titleSlide.classList.contains('is-active');
  }

  function updatePrevButton() {
    if (preshowAvailable()) prevButton.disabled = false;
  }

  prevButton.addEventListener(
    'click',
    (event) => {
      if (!preshowAvailable()) return;
      event.stopImmediatePropagation();
      startIntro({fromEnd: true});
    },
    true
  );

  function onIntroKey(event) {
    const step = INTRO_KEYS_NEXT.includes(event.key) ? 1 : INTRO_KEYS_PREV.includes(event.key) ? -1 : 0;
    if (!step) return;
    // Keys scroll the intro instead of changing slides until it's finished.
    event.preventDefault();
    event.stopImmediatePropagation();
    window.scrollBy({top: step * window.innerHeight, behavior: 'smooth'});
  }

  // fromEnd: start fully lit at the bottom of the runway and scroll back up to the preshow.
  function startIntro({fromEnd = false} = {}) {
    const name = titleSlide.querySelector('.marquee');
    const heading = titleSlide.querySelector('h1');
    const rest = titleSlide.querySelectorAll(':scope > :not(.marquee, h1)');
    const runway = document.createElement('div');

    runway.className = 'intro-runway';
    runway.setAttribute('aria-hidden', 'true');
    document.body.append(runway);
    root.classList.add('is-intro');
    history.scrollRestoration = 'manual';
    window.scrollTo(0, fromEnd ? document.documentElement.scrollHeight - window.innerHeight : 0);
    window.addEventListener('keydown', onIntroKey, true);

    gsap.set(heading, {clearProps: 'fontVariationSettings'});
    const headingWidth = getComputedStyle(heading).fontVariationSettings;

    // Starting from the end counts as "leaving" right away, so only finish
    // once the scroll has come back up into the intro and down again.
    let armed = !fromEnd;

    const timeline = gsap.timeline({
      defaults: {ease: 'none'},
      scrollTrigger: {
        start: 0,
        end: 'max',
        scrub: 1,
        onEnterBack: () => {
          armed = true;
        },
        onLeave: () => {
          if (armed) finishIntro();
        },
      },
    })
      // Power on: the lens warms up and the beam hits the floor.
      .fromTo(lens, {opacity: 0.15}, {opacity: 1, duration: 1, ease: 'power2.in'}, 0)
      .fromTo(beam, {autoAlpha: 0}, {autoAlpha: 1, duration: 1, ease: 'power2.in'}, 0.2)
      // Tilt up to find the mark, and the gel pool fades up where it lands.
      .fromTo(rigState, {tilt: 0}, {tilt: 1, duration: 1.6, ease: 'power2.inOut'}, 1.2)
      .fromTo(spotlight, {autoAlpha: 0}, {autoAlpha: 1, duration: 1.2}, 1.9)
      // The sign drops in, then the title and role.
      .fromTo(
        name,
        {y: () => -dropDistance(name)},
        {y: 0, duration: 1.2, ease: 'back.out(1.4)'},
        2.8
      )
      .fromTo(
        heading,
        {autoAlpha: 0, y: 40, fontVariationSettings: '"wdth" 75'},
        {autoAlpha: 1, y: 0, fontVariationSettings: headingWidth, duration: 1.2, ease: 'power3.out'},
        3.6
      )
      .fromTo(rest, {autoAlpha: 0, y: 30}, {autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out'}, 4.4)
      .fromTo(deckNav, {autoAlpha: 0}, {autoAlpha: 1, duration: 0.6}, 5);

    intro = {timeline, runway};

    if (fromEnd) {
      timeline.progress(1);
      requestAnimationFrame(() => window.scrollTo({top: 0, behavior: 'smooth'}));
    }
  }

  // Ends the intro: snaps or eases to the final frame, then removes the scroll runway.
  function finishIntro(instant = false) {
    if (!intro) return;
    const {timeline, runway} = intro;
    intro = null;

    window.removeEventListener('keydown', onIntroKey, true);
    // kill(revert, allowAnimation): keep the timeline where it is instead of resetting it.
    timeline.scrollTrigger.kill(false, true);

    function cleanUp() {
      runway.remove();
      root.classList.remove('is-intro');
      window.scrollTo(0, 0);
      updatePrevButton();
    }

    if (instant) {
      timeline.progress(1);
      cleanUp();
    } else {
      gsap.to(timeline, {progress: 1, duration: 0.4, ease: 'power1.out', onComplete: cleanUp});
    }
  }

  // Lock heading line breaks at their resting width. The width animation starts
  // narrower, and without this a heading can fit on one line, then re-wrap to two.
  let headingSplits = [];

  function lockHeadingLines() {
    if (!window.SplitText) return;
    headingSplits.forEach((split) => split.revert());
    headingSplits = Array.from(document.querySelectorAll('.slide :is(h1, h2)'), (heading) => {
      // Measure at rest: set aside any in-progress width, split, then put it back.
      const inline = heading.style.fontVariationSettings;
      heading.style.fontVariationSettings = '';
      const split = SplitText.create(heading, {type: 'lines', linesClass: 'heading-line'});
      heading.style.fontVariationSettings = inline;
      return split;
    });
  }

  let resizeTimer;
  document.fonts.ready.then(lockHeadingLines);
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(lockHeadingLines, 200);
  });

  // Final state of the roadmap, for reduced motion.
  function showRoadmap(slide) {
    gsap.set(slide.querySelectorAll('.roadmap__road'), {clearProps: 'clipPath'});
    gsap.set(slide.querySelectorAll('.roadmap__stop, .roadmap__label'), {clearProps: 'transform,opacity,visibility'});
  }

  const mm = gsap.matchMedia();

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const {reduce} = context.conditions;
      motionAllowed = !reduce;

      function onChange(event) {
        const {from, to, direction} = event.detail;
        const gel = to.dataset.gel || 'house';
        const parts = to.querySelectorAll(':scope > *');
        const enterParts = to.querySelectorAll(':scope > :not(.marquee, .roadmap, .roadmap__road)');
        const signIn = to.querySelector('.marquee');
        const signOut = from?.querySelector('.marquee');
        const sameSign = signIn && signOut && signIn.textContent === signOut.textContent;
        const headings = to.querySelectorAll('h1, h2');

        // During the intro the title belongs to the scroll timeline.
        if (intro && to === titleSlide) return;
        if (intro) finishIntro(true);
        updatePrevButton();

        if (current) current.kill();
        if (leavingSign) gsap.set(leavingSign, {clearProps: 'visibility'});
        leavingSign = null;

        gsap.set(headings, {clearProps: 'fontVariationSettings'});
        const restingWidths = Array.from(headings, (heading) => {
          const value = getComputedStyle(heading).fontVariationSettings;
          return value === 'normal' ? '"wdth" 100' : value;
        });

        if (reduce) {
          gsap.set(root, gelColors(gel));
          gsap.set(spotlight, spotPosition(gel));
          gsap.set(parts, {autoAlpha: 1, y: 0});
          showRoadmap(to);
          aim();
          return;
        }

        current = gsap.timeline({defaults: {ease: 'power3.out'}});

        // Marquee: the old sign flies up and the new one drops in on its cables.
        // Consecutive slides with the same sign (Test Spin) keep it hanging still.
        if (sameSign) {
          gsap.set(signIn, {autoAlpha: 1, y: 0, rotation: 0});
        } else {
          if (signOut) {
            leavingSign = signOut;
            current
              .set(signOut, {visibility: 'visible'}, 0)
              .to(signOut, {y: () => -dropDistance(signOut), duration: 0.45, ease: 'power2.in'}, 0)
              .set(signOut, {clearProps: 'visibility'});
          }
          if (signIn) {
            current
              .fromTo(
                signIn,
                {autoAlpha: 1, y: () => -dropDistance(signIn)},
                {y: 0, duration: 0.9, ease: 'back.out(1.4)'},
                signOut ? 0.35 : 0.15
              )
              .fromTo(
                signIn,
                {rotation: -4, transformOrigin: '50% 0'},
                {rotation: 0, duration: 1.4, ease: 'elastic.out(1, 0.4)'},
                '<0.5'
              );
          }
        }

        animateRoadmap(current, to);

        current
          .to(root, {...gelColors(gel), duration: 0.8, ease: 'power2.inOut'}, 0)
          .to(spotlight, {...spotPosition(gel), duration: 1.1, ease: 'power2.inOut'}, 0)
          .fromTo(
            enterParts,
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

      const opensOnTitle = !location.hash || location.hash === '#title';
      if (!reduce && window.ScrollTrigger && opensOnTitle && !intro) startIntro();

      // About: the road grows from left to right and each stop pops up as the road reaches it.
      // The road only ever moves rightward, so a stop's x position is how far along it is.
      function animateRoadmap(timeline, slide) {
        const road = slide.querySelector('.roadmap__road');
        if (!road) return;
        const START = 0.3;
        const DRAW = 2.4;

        timeline
          .set(slide.querySelector('.roadmap'), {autoAlpha: 1, y: 0}, 0)
          .fromTo(
            road,
            {autoAlpha: 1, y: 0, clipPath: 'inset(0% 100% 0% 0%)'},
            {clipPath: 'inset(0% 0% 0% 0%)', duration: DRAW, ease: 'none'},
            START
          );

        slide.querySelectorAll('.roadmap__stop').forEach((stop) => {
          const along = Number(stop.style.getPropertyValue('--x')) / 100;
          const at = START + DRAW * along;
          const label = stop.querySelector('.roadmap__label');
          const rise = stop.classList.contains('roadmap__stop--below') ? -12 : 12;
          timeline
            .fromTo(
              stop,
              {scale: 0, transformOrigin: '0 0'},
              {scale: 1, duration: 0.5, ease: 'back.out(2.5)'},
              at
            )
            .fromTo(label, {autoAlpha: 0, y: rise}, {autoAlpha: 1, y: 0, duration: 0.4}, at + 0.1);
        });
      }

      document.addEventListener('deck:change', onChange);
      if (!reduce) gsap.ticker.add(aim);

      return () => {
        document.removeEventListener('deck:change', onChange);
        gsap.ticker.remove(aim);
        finishIntro(true);
      };
    }
  );
})();
