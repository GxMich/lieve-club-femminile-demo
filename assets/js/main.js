(() => {
  // Demo: nessun link verso app di messaggistica. I pulsanti mostrano il messaggio che verrebbe preparato.
  const waLink = (text) => `#demo-wa?text=${encodeURIComponent(text)}`;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = !reduce && window.gsap && window.ScrollTrigger;
  if (!motion) document.documentElement.classList.add('no-motion');

  // ---------- Scroll morbido ----------
  let lenis = null;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    // la barra degli indirizzi su mobile non deve ricalcolare tutto a ogni scroll
    ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,resize' });
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  const scrollToY = (y) => {
    if (lenis) {
      // Focus, ancore e gesti nativi possono spostare la pagina prima che
      // Lenis riceva lo scroll: riallineare posizione e limiti prima del salto.
      lenis.resize();
      lenis.scrollTo(y, { duration: 1.4 });
    } else {
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  };
  const scrollToEl = (el) => scrollToY(el.getBoundingClientRect().top + window.scrollY);

  // ---------- Preloader: lettere vettoriali, foto decodificata, apertura automatica ----------
  const intro = $('[data-intro]');
  const heroContent = $('[data-hero-content]');
  let introTimeline = null;
  let introAnimations = [];
  const finishIntro = () => {
    clearTimeout(window.lieveIntroFailsafe);
    introTimeline?.kill();
    introAnimations.forEach((animation) => animation.cancel());
    document.documentElement.classList.remove('intro-pending');
    $$('[data-intro-inert]').forEach((el) => { el.inert = false; el.removeAttribute('data-intro-inert'); });
    heroContent.style.removeProperty('opacity');
    heroContent.style.removeProperty('transform');
    $('[data-hero-media] img').style.removeProperty('transform');
    const skipHadFocus = intro?.contains(document.activeElement);
    intro?.remove();
    lenis?.start();
    if (skipHadFocus) $('.hero-ctas a').focus({ preventScroll: true });
    try { sessionStorage.setItem('lieve-intro-seen', '1'); } catch (_) { /* Storage facoltativo. */ }
  };

  const startIntro = async () => {
    if (!intro || !motion || !document.documentElement.classList.contains('intro-pending') || window.scrollY > 0) {
      finishIntro();
      return;
    }
    lenis?.stop();
    const setupStarted = performance.now();
    $$('main, .site-header, .dock, .footer, .skip').forEach((el) => {
      el.inert = true;
      el.setAttribute('data-intro-inert', '');
    });
    $('[data-intro-skip]').addEventListener('click', finishIntro, { once: true });
    // Il fallback resta attivo anche se una risorsa o il motore di animazione fallisce.
    clearTimeout(window.lieveIntroFailsafe);
    window.lieveIntroFailsafe = setTimeout(finishIntro, 5000);
    const svg = $('[data-intro-svg]');
    const letters = $$('.intro-letter');
    const scales = $$('[data-intro-scale]');
    const wordmark = $('[data-intro-wordmark]');
    const image = $('[data-hero-media] img');
    const width = window.innerWidth;
    const height = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const initialScale = Math.min(width * 0.86, 1080) / 1000;
    const position = (scale, center = 500) => `translate(${width / 2} ${height * 0.44}) scale(${scale}) translate(${-center} -110)`;
    scales.forEach((el) => el.setAttribute('transform', position(initialScale)));
    // Ogni lettera visibile ha una piccola superficie SVG propria: transform e
    // opacity vengono composti senza ridisegnare la maschera a schermo intero.
    const glyphs = letters.map((letter) => {
      const bounds = letter.getBBox();
      const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      glyph.classList.add('intro-glyph');
      glyph.setAttribute('viewBox', `${bounds.x} -5 ${bounds.width} 230`);
      glyph.style.left = `${bounds.x / 10}%`;
      glyph.style.width = `${bounds.width / 10}%`;
      const path = letter.cloneNode(true);
      path.removeAttribute('class');
      path.removeAttribute('data-letter');
      glyph.appendChild(path);
      wordmark.appendChild(glyph);
      return glyph;
    });
    gsap.set(heroContent, { opacity: 0, y: 28 });
    try {
      // I ricalcoli di font, pin e immagini si completano prima di muovere le lettere.
      await Promise.all([
        image.decode(),
        document.fonts.ready,
        document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => window.addEventListener('load', resolve, { once: true })),
      ]);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!document.documentElement.classList.contains('intro-pending')) return;
      const lightweight = performance.now() - setupStarted > 900 || performance.now() > 1800;
      intro.dataset.quality = lightweight ? 'light' : 'full';
      intro.dataset.phase = 'forming';
      introAnimations = glyphs.map((glyph, i) => glyph.animate([
        { opacity: 0.18, transform: 'translateY(24px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 620, delay: i * 75, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' }));
      await Promise.all(introAnimations.map((animation) => animation.finished));
      if (!document.documentElement.classList.contains('intro-pending')) return;
      // Si muove il tracciato dentro una maschera limitata al viewport,
      // senza ingrandire la superficie SVG o creare texture da decine di migliaia di pixel.
      const iBounds = letters.find((el) => el.dataset.letter === 'I').getBBox();
      const center = iBounds.x + iBounds.width / 2;
      const endScale = Math.max(width / iBounds.width, height / iBounds.height) * 1.15;
      intro.dataset.phase = 'opening';
      intro.classList.add('is-opening');
      if (lightweight) {
        // Su preparazioni lente, la stessa scritta rivela la foto con una
        // dissolvenza sul compositor, senza ridisegnare una maschera a ogni frame.
        const animate = (element, frames, duration, delay = 0) => {
          const animation = element.animate(frames, { duration, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' });
          introAnimations.push(animation);
          return animation.finished;
        };
        await Promise.all([
          animate(wordmark, [{ opacity: 1 }, { opacity: 0 }], 220),
          animate($('[data-intro-caption]'), [{ opacity: 1 }, { opacity: 0 }], 180),
          animate($('[data-intro-skip]'), [{ opacity: 1 }, { opacity: 0 }], 180),
          animate(intro, [{ opacity: 1 }, { opacity: 0 }], 650, 150),
          animate(heroContent, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }], 600, 300),
          animate(image, [{ transform: 'scale(1.025)' }, { transform: 'scale(1)' }], 850),
        ]);
        finishIntro();
        return;
      }
      introTimeline = gsap.timeline({ onComplete: finishIntro });
      introTimeline
        .to(wordmark, { opacity: 0, duration: 0.24 }, 0)
        .to('[data-intro-caption], [data-intro-skip]', { opacity: 0, duration: 0.2 }, 0.12)
        .to(scales, { attr: { transform: position(endScale, center) }, duration: 0.95, ease: 'power3.in' }, 0.14)
        .fromTo(image, { scale: 1.045 }, { scale: 1, duration: 1.1, ease: 'power2.out' }, 0.25)
        .to(intro, { opacity: 0, duration: 0.18 }, 0.96)
        .to(heroContent, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }, 0.88);
    } catch (_) {
      finishIntro();
    }
  };
  window.addEventListener('pageshow', (event) => { if (event.persisted) finishIntro(); });
  const introViewport = { width: window.innerWidth, height: window.innerHeight };
  window.addEventListener('resize', () => {
    const changed = Math.abs(window.innerWidth - introViewport.width) > 2 || Math.abs(window.innerHeight - introViewport.height) > 160;
    if (changed && document.documentElement.classList.contains('intro-pending')) finishIntro();
  }, { passive: true });

  // ---------- Menu a schermo intero ----------
  const menu = $('[data-menu]');
  const menuBtn = $('[data-menu-btn]');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    $('.menu-btn-label', menuBtn).textContent = open ? 'Chiudi' : 'Menu';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      lenis?.stop();
      document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('is-open');
      lenis?.start();
      document.body.style.overflow = '';
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduce ? 0 : 700);
    }
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });

  // Link interni: scorrimento morbido, anche dal menu
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id === 'top' ? document.body : document.getElementById(id);
    if (!target || !id) return;
    e.preventDefault();
    const inMenu = a.closest('[data-menu]');
    if (inMenu) setMenu(false);
    setTimeout(() => (id === 'top' ? scrollToY(0) : scrollToEl(target)), inMenu ? 350 : 0);
  });

  // ---------- Animazioni ----------
  if (motion) {
    // Nastro: scorre sempre, accelera con lo scroll
    const ribbonLoop = gsap.to('[data-ribbon]', { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 5);
        gsap.to(ribbonLoop, { timeScale: boost, duration: 0.2, overwrite: true });
        gsap.to(ribbonLoop, { timeScale: 1, duration: 1.2, delay: 0.25, ease: 'power2.out', overwrite: 'auto' });
      },
    });

    // Manifesto: le parole si accendono leggendo
    const mtext = $('[data-words]');
    mtext.innerHTML = mtext.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.to($$('.w', mtext), {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: mtext, start: 'top 78%', end: 'bottom 45%', scrub: true },
    });

    // Parallasse foto (manifesto e galleria)
    $$('[data-speed]').forEach((el) => {
      const s = parseFloat(el.dataset.speed);
      gsap.fromTo(el, { y: () => -s * 260 }, {
        y: () => s * 260, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
    });
    gsap.from('.facts li', {
      y: 40, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: '.facts', start: 'top 85%' },
    });

    // METODO: 30 minuti che scorrono
    const ring = $('[data-ring]');
    const clock = $('[data-clock]');
    const clockLabel = $('[data-clock-label]');
    const steps = $$('[data-step]');
    const marks = [0, 0.22, 0.5, 0.82];
    const state = { p: 0 };
    const renderClock = () => {
      const p = state.p;
      const secs = Math.round(p * 30 * 60);
      clock.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
      ring.style.strokeDashoffset = String(100 - p * 100);
      steps.forEach((li, i) => li.classList.toggle('is-on', p >= marks[i]));
      clockLabel.textContent = p >= 0.995 ? 'fatto. Brava!' : "la tua mezz'ora";
    };
    gsap.to(state, {
      p: 1, ease: 'none', onUpdate: renderClock,
      scrollTrigger: { trigger: '[data-method-scroll]', start: 'top top', end: 'bottom bottom', scrub: isTouch ? true : 0.6 },
    });
    renderClock();

    // CORSI: scorrimento orizzontale su desktop
    const track = $('[data-courses-track]');
    const bar = $('[data-courses-bar]');
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '[data-courses]', start: 'top top', end: () => `+=${dist()}`,
          pin: true, scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
        },
      });
      $$('.course', track).forEach((c) => {
        gsap.from($('.course-name', c), {
          xPercent: 18, ease: 'none',
          scrollTrigger: { containerAnimation: tween, trigger: c, start: 'left right', end: 'left 20%', scrub: true },
        });
        gsap.from($('.course-photo img', c), {
          scale: 1.25, ease: 'none',
          scrollTrigger: { containerAnimation: tween, trigger: c, start: 'left right', end: 'right left', scrub: true },
        });
      });
    });

    // FONDATRICE: la foto si apre
    gsap.fromTo('[data-reveal-clip]', { clipPath: 'inset(16% 14% 16% 14% round 28px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none',
      scrollTrigger: { trigger: '[data-reveal-clip]', start: 'top 90%', end: 'center 50%', scrub: true },
    });
    gsap.fromTo('[data-reveal-clip] img', { scale: 1.3 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: '[data-reveal-clip]', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.fromTo('[data-team] img', { scale: 1.25, yPercent: -6 }, {
      scale: 1, yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '[data-team]', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.from('.team-title', {
      yPercent: 60, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: '[data-team]', start: 'center 75%' },
    });

    // Titoli grandi che entrano dal basso, una riga alla volta
    $$('.courses-intro h2, .voices-head h2, .inside-title, .pass h2, .faq h2, .visit h2, .founder-copy h2').forEach((h) => {
      gsap.from(h, {
        y: 70, opacity: 0, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: h, start: 'top 88%' },
      });
    });

    // Parola gigante nel footer
    gsap.from('.footer-word', {
      letterSpacing: '0.5em', opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'top 30%', scrub: true },
    });

    // Barra in basso: compare dopo l'hero, si nasconde sul PASS
    const dock = $('[data-dock]');
    let pastHero = false;
    let onPass = false;
    const syncDock = () => dock.classList.toggle('is-on', pastHero && !onPass);
    ScrollTrigger.create({ trigger: '.ribbon', start: 'top 80%', onEnter: () => { pastHero = true; syncDock(); }, onLeaveBack: () => { pastHero = false; syncDock(); } });
    ScrollTrigger.create({ trigger: '#pass', start: 'top 70%', end: 'bottom 30%', onToggle: (s) => { onPass = s.isActive; syncDock(); } });

    // Un solo ricalcolo iniziale, dopo font e immagini, invece di ricalcoli
    // sovrapposti su DOMContentLoaded, load e fonts.ready durante l'intro.
    Promise.all([
      document.fonts.ready,
      document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => window.addEventListener('load', resolve, { once: true })),
    ]).then(() => ScrollTrigger.refresh());
  } else {
    $$('[data-step]').forEach((li) => li.classList.add('is-on'));
    const clock = $('[data-clock]');
    if (clock) clock.textContent = '30:00';
  }

  // ---------- Recensioni: duplica le righe per il loop continuo ----------
  if (motion) {
    $$('.voices-row').forEach((row) => {
      [...row.children].forEach((c) => {
        const clone = c.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        row.appendChild(clone);
      });
    });
  }

  // ---------- Quiz corsi ----------
  $$('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-goto]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const panel = document.getElementById(btn.dataset.goto);
      const track = $('[data-courses-track]');
      const st = coursesTrigger();
      if (st) {
        const dist = Math.max(1, track.scrollWidth - window.innerWidth);
        const f = Math.min(1, panel.offsetLeft / dist);
        scrollToY(st.start + f * (st.end - st.start));
      } else {
        scrollToEl(panel);
      }
    });
  });
  // il trigger orizzontale dei corsi esiste solo su desktop con animazioni attive
  function coursesTrigger() {
    return motion ? ScrollTrigger.getAll().find((t) => t.trigger === $('[data-courses]') && t.pin) : null;
  }

  // ---------- Turni da 30 minuti ----------
  const slots = $('[data-slots]');
  if (slots) {
    const days = [
      { id: 'lun', label: 'Lunedì', from: '08:30', to: '20:00' },
      { id: 'mar', label: 'Martedì', from: '08:30', to: '20:00' },
      { id: 'mer', label: 'Mercoledì', from: '08:30', to: '20:00' },
      { id: 'gio', label: 'Giovedì', from: '08:30', to: '20:00' },
      { id: 'ven', label: 'Venerdì', from: '08:30', to: '20:00' },
      { id: 'sab', label: 'Sabato', from: '09:00', to: '12:30' },
    ];
    const daysEl = $('[data-days]', slots);
    const timesEl = $('[data-times]', slots);
    const pickEl = $('[data-pick]', slots);
    const cta = $('[data-slot-cta]', slots);
    const st = { day: days[0], time: null };
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

    const group = (container, items, isSel, onSel) => {
      container.innerHTML = '';
      items.forEach((it, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.setAttribute('role', 'radio');
        b.textContent = it.text;
        if (it.aria) b.setAttribute('aria-label', it.aria);
        const sel = isSel(it);
        b.setAttribute('aria-checked', String(sel));
        b.tabIndex = sel || (i === 0 && !items.some(isSel)) ? 0 : -1;
        b.addEventListener('click', () => onSel(it));
        container.appendChild(b);
      });
      container.onkeydown = (e) => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const btns = $$('.chip', container);
        let i = btns.indexOf(document.activeElement);
        if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = btns.length - 1;
        else i = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length;
        btns.forEach((b) => (b.tabIndex = -1));
        btns[i].tabIndex = 0;
        btns[i].focus();
      };
    };

    const render = () => {
      group(daysEl, days.map((d) => ({ ...d, text: d.label })), (d) => d.id === st.day.id, (d) => {
        st.day = days.find((x) => x.id === d.id); st.time = null; render();
        $('[aria-checked="true"]', daysEl).focus();
      });
      const times = [];
      for (let m = toMin(st.day.from); m + 30 <= toMin(st.day.to); m += 30) times.push(m);
      group(timesEl, times.map((m) => ({ m, text: fmt(m), aria: `dalle ${fmt(m)} alle ${fmt(m + 30)}` })), (t) => t.m === st.time, (t) => {
        st.time = t.m; render();
        $('[aria-checked="true"]', timesEl).focus();
      });
      if (st.time === null) {
        pickEl.textContent = `${st.day.label}: scegli un orario.`;
        cta.setAttribute('aria-disabled', 'true');
        cta.href = waLink('Ciao LIEVE! Vorrei prenotare una prova.');
      } else {
        pickEl.textContent = `${st.day.label}, ${fmt(st.time)}–${fmt(st.time + 30)}`;
        cta.removeAttribute('aria-disabled');
        cta.href = waLink(`Ciao LIEVE! Vorrei provare il Metodo LIEVE ${st.day.label.toLowerCase()} alle ${fmt(st.time)}. È disponibile?`);
      }
    };
    render();
  }

  // ---------- Carta Prova: si personalizza e si inclina ----------
  const card = $('[data-card]');
  const cardName = $('[data-card-name]');
  const cardDates = $('[data-card-dates]');
  const nameInput = $('[data-name-input]');
  const dateInput = $('[data-date-input]');
  const dfmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
  const today = new Date();
  dateInput.min = today.toISOString().slice(0, 10);

  const pulse = (el) => { if (motion) gsap.fromTo(el, { scale: 1.06 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }); };
  nameInput.addEventListener('input', () => {
    cardName.textContent = nameInput.value.trim() || 'Il tuo nome';
    pulse(cardName);
  });
  const datesText = () => {
    if (!dateInput.value) return null;
    const start = new Date(`${dateInput.value}T12:00:00`);
    const end = new Date(start); end.setDate(start.getDate() + 13);
    return `dal ${dfmt.format(start)} al ${dfmt.format(end)}`;
  };
  dateInput.addEventListener('change', () => {
    cardDates.textContent = datesText() || '14 giorni dal primo ingresso';
    pulse(cardDates);
  });

  const tiltWrap = $('[data-tilt]');
  if (motion && window.matchMedia('(hover: hover)').matches) {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    tiltWrap.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      rx((0.5 - y) * 16);
      ry((x - 0.5) * 22);
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
    });
    tiltWrap.addEventListener('pointerleave', () => { rx(0); ry(0); });
  } else if (motion) {
    gsap.fromTo(card, { rotationY: -10, rotationX: 4 }, { rotationY: 10, rotationX: -3, duration: 3.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  // ---------- Modulo Carta Prova: invio simulato ----------
  const form = $('[data-pass-form]');
  const err = $('[data-form-error]', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const tel = form.telefono.value.trim();
    const telOk = /^[+\d\s().-]{6,}$/.test(tel);
    form.nome.setAttribute('aria-invalid', String(!nome));
    form.telefono.setAttribute('aria-invalid', String(!telOk));
    const missing = [];
    if (!nome) missing.push('il tuo nome');
    if (!telOk) missing.push('un numero di telefono valido');
    if (!form.privacy.checked) missing.push("il consenso all'informativa privacy");
    if (missing.length) {
      err.textContent = `Per inviare la richiesta manca ${missing.join(', ')}.`;
      err.hidden = false;
      (form.querySelector('[aria-invalid="true"]') || form.privacy).focus();
      return;
    }
    err.hidden = true;
    const lines = [`Ciao LIEVE! Sono ${nome} e vorrei la Carta Prova (14 giorni a 24 €).`, `Telefono: ${tel}`];
    if (dateInput.value) lines.push(`Vorrei iniziare il ${dfmt.format(new Date(`${dateInput.value}T12:00:00`))}.`);
    const msg = form.messaggio.value.trim();
    if (msg) lines.push(`Note: ${msg}`);
    showDemo(lines.join('\n'));
  });

  // ---------- Finestra demo: mostra il messaggio, non invia niente ----------
  const demo = $('[data-demo]');
  function showDemo(text) {
    $('[data-demo-text]', demo).textContent = text;
    if (typeof demo.showModal === 'function') demo.showModal(); else demo.setAttribute('open', '');
  }
  $('[data-demo-close]', demo).addEventListener('click', () => demo.close ? demo.close() : demo.removeAttribute('open'));
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#demo-wa"]');
    if (!link) return;
    e.preventDefault();
    const text = new URLSearchParams(link.getAttribute('href').split('?')[1] || '').get('text') || 'Ciao LIEVE! Vorrei qualche informazione.';
    showDemo(text);
  });

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  startIntro();
})();
