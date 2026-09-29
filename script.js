/* ============================================================
   SC RECYCLING S.A. – scripts.js  v3
   Módulos: navbar, hamburger, particles, scroll-reveal,
            counters, gallery-carousel, marquee, form
   ============================================================ */

'use strict';

const qs  = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];

/* ════════════════════════════════════════════════════════════
   1. NAVBAR — sombra + scroll
   ════════════════════════════════════════════════════════════ */
(function initNavbar() {
  const navbar = qs('#navbar');
  if (!navbar) return;
  const fn = () => navbar.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', fn, { passive: true });
  fn();
})();

/* ════════════════════════════════════════════════════════════
   2. HAMBURGER
   ════════════════════════════════════════════════════════════ */
(function initHamburger() {
  const btn  = qs('#hamburger');
  const menu = qs('#nav-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('open');
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  });

  qsa('a.nav-link', menu).forEach(a =>
    a.addEventListener('click', () => {
      btn.classList.remove('open');
      menu.classList.remove('open');
    })
  );

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      btn.classList.remove('open');
      menu.classList.remove('open');
    }
  });
})();

/* ════════════════════════════════════════════════════════════
   3. SCROLL REVEAL
   ════════════════════════════════════════════════════════════ */
(function initScrollReveal() {
  const els = qsa('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
})();

/* ════════════════════════════════════════════════════════════
   4. COUNTERS
   ════════════════════════════════════════════════════════════ */
(function initCounters() {
  const items = qsa('.hstat__num, .counter');
  if (!items.length) return;

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function animate(el) {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    const dur = 1800;
    const t0  = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(easeOut(p) * target).toLocaleString('es-CO');
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString('es-CO');
    };
    requestAnimationFrame(tick);
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.5 });
  items.forEach(el => obs.observe(el));
})();

/* ════════════════════════════════════════════════════════════
   5. GALLERY CAROUSEL — centrado con slide activo más grande
   ════════════════════════════════════════════════════════════ */
(function initGalleryCarousel() {
  const slides    = qsa('.gc-slide');
  const dotsWrap  = qs('#gallery-dots');
  const labelEl   = qs('#gallery-label');
  const btnPrev   = qs('#gc-prev');
  const btnNext   = qs('#gc-next');
  const track     = qs('#gc-track');
  const modal     = qs('#photo-modal');
  const modalImg  = qs('#photo-modal-img');
  const modalTitle = qs('#photo-modal-title');
  const modalDesc = qs('#photo-modal-desc');
  const modalClose = modal ? qs('.photo-modal__close', modal) : null;

  if (!slides.length || !track) return;

  const total  = slides.length;
  let current  = 0;
  let autoTimer = null;

  /* Crear dots */
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap && dotsWrap.appendChild(dot);
  });

  slides.forEach((slide, i) => {
    slide.setAttribute('role', 'button');
    slide.setAttribute('tabindex', '0');
    slide.setAttribute('aria-label', `${slide.dataset.label || `Imagen ${i + 1}`}. Presiona para ver la foto completa`);
  });

  function updateClasses(idx) {
    slides.forEach((slide, i) => {
      slide.classList.remove('active', 'adjacent');
      const diff = Math.abs(i - idx);
      if (diff === 0) slide.classList.add('active');
      else if (diff === 1) slide.classList.add('adjacent');
    });
  }

  function updateDots(idx) {
    qsa('.gallery-dot', dotsWrap || document).forEach((d, i) =>
      d.classList.toggle('active', i === idx)
    );
  }

  function updateLabel(idx) {
    if (!labelEl) return;
    const label = slides[idx].dataset.label || '';
    labelEl.style.opacity = '0';
    setTimeout(() => {
      labelEl.textContent = label;
      labelEl.style.opacity = '1';
    }, 150);
  }

  /**
   * Centramos el slide activo dentro del contenedor.
   * Calculamos el offset para que el slide[current] quede 
   * en el centro exacto del track-wrap.
   */
  function centerSlide(idx) {
    const wrap = qs('.gc-track-wrap');
    if (!wrap) return;

    // Necesitamos el offsetLeft del slide activo
    // pero sus dimensiones cambian con CSS transitions.
    // Usamos getBoundingClientRect after next paint.
    requestAnimationFrame(() => {
      const wrapRect  = wrap.getBoundingClientRect();
      const slideRect = slides[idx].getBoundingClientRect();

      // Centro del contenedor relativo al track
      const wrapCenter = wrapRect.left + wrapRect.width / 2;
      const slideCenter = slideRect.left + slideRect.width / 2;
      const delta = slideCenter - wrapCenter;

      // Aplicamos transform al track para centrar
      const currentTranslate = getTranslateX(track);
      track.style.transform = `translateX(${currentTranslate - delta}px)`;
    });
  }

  function getTranslateX(el) {
    const style = window.getComputedStyle(el);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m41; // translateX value
  }

  function goTo(idx) {
    current = ((idx % total) + total) % total;
    updateClasses(current);
    updateDots(current);
    updateLabel(current);

    // Pequeño delay para que CSS aplique las clases primero
    setTimeout(() => centerSlide(current), 20);

    resetAuto();
  }

  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), 4500);
  }

  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  function openPhoto(slide) {
    if (!modal || !modalImg || !modalTitle || !modalDesc) return;
    const img = qs('img', slide);
    if (!img) return;

    clearInterval(autoTimer);
    modalImg.src = img.getAttribute('src');
    modalImg.alt = img.getAttribute('alt') || slide.dataset.title || 'Imagen de SC Recycling';
    modalTitle.textContent = slide.dataset.title || slide.dataset.label || 'Imagen de SC Recycling';
    modalDesc.textContent = slide.dataset.desc || 'Conoce más de nuestros procesos, equipo y material recuperado.';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => modalClose && modalClose.focus(), 80);
  }

  function closePhoto() {
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    modalImg && modalImg.removeAttribute('src');
    resetAuto();
    slides[current] && slides[current].focus();
  }

  /* Inicializar */
  updateClasses(0);
  updateLabel(0);
  // Initial center after layout
  setTimeout(() => centerSlide(0), 100);
  startAuto();

  if (btnPrev) btnPrev.addEventListener('click', () => goTo(current - 1));
  if (btnNext) btnNext.addEventListener('click', () => goTo(current + 1));

  /* Pausa al hover */
  const carousel = qs('#gallery-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => clearInterval(autoTimer));
    carousel.addEventListener('mouseleave', () => startAuto());
  }

  /* Touch / swipe */
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
  });

  /* Click en slide para navegar o abrir la foto activa */
  slides.forEach((slide, i) => {
    const openBtn = qs('.gc-slide__open', slide);

    if (openBtn) {
      openBtn.addEventListener('click', e => {
        e.stopPropagation();
        current = i;
        updateClasses(current);
        updateDots(current);
        updateLabel(current);
        setTimeout(() => centerSlide(current), 20);
        openPhoto(slide);
      });
    }

    slide.addEventListener('click', () => {
      if (i !== current) {
        goTo(i);
        return;
      }
      openPhoto(slide);
    });

    slide.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (i !== current) goTo(i);
      else openPhoto(slide);
    });
  });

  if (modal) {
    qsa('[data-photo-close]', modal).forEach(el => el.addEventListener('click', closePhoto));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePhoto();
    });
  }

  /* Recalcular en resize */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => centerSlide(current), 150);
  });
})();

/* ════════════════════════════════════════════════════════════
   6. MARQUEE — pausa hover
   ════════════════════════════════════════════════════════════ */
(function initMarquee() {
  const m = qs('.marquee');
  if (!m) return;
  m.addEventListener('mouseenter', () => m.style.animationPlayState = 'paused');
  m.addEventListener('mouseleave', () => m.style.animationPlayState = 'running');
})();

/* ════════════════════════════════════════════════════════════
   7. CONTACT FORM
   ════════════════════════════════════════════════════════════ */
(function initForm() {
  const form    = qs('#contact-form');
  const success = qs('#form-success');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const nombre = qs('#nombre', form);
    const email  = qs('#email', form);
    let valid = true;

    [nombre, email].forEach(f => {
      f.style.borderColor = '';
      if (!f.value.trim()) { f.style.borderColor = '#ef4444'; valid = false; }
    });
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.style.borderColor = '#ef4444'; valid = false;
    }
    if (!valid) return;

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    setTimeout(() => {
      form.reset();
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar mensaje`;
      success && success.classList.add('show');
      setTimeout(() => success && success.classList.remove('show'), 5000);
    }, 1200);
  });

  qsa('input, textarea, select', form).forEach(f =>
    f.addEventListener('input', () => f.style.borderColor = '')
  );
})();

/* ════════════════════════════════════════════════════════════
   8. SMOOTH SCROLL
   ════════════════════════════════════════════════════════════ */
(function initSmoothScroll() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' });
  });
})();

/* ════════════════════════════════════════════════════════════
   9. HERO BIG NUMBER — parallax suave
   ════════════════════════════════════════════════════════════ */
(function initHeroParallax() {
  const num = qs('.hero__bignumber');
  if (!num) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    num.style.transform = `translate(-50%, calc(-50% + ${y * 0.25}px))`;
  }, { passive: true });
})();
