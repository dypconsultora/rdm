/* RDM Turbo — interacciones */
(function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Header: sombra al scrollear ── */
    var header = document.getElementById('header');
    function onScroll() {
        header.classList.toggle('is-scrolled', window.scrollY > 10);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ── Modo día / noche (noche por defecto) ── */
    var themeToggle = document.getElementById('themeToggle');
    var rootEl = document.documentElement;
    function applyThemeLabel() {
        var isLight = rootEl.getAttribute('data-theme') === 'light';
        themeToggle.setAttribute('aria-label', isLight ? 'Cambiar a modo noche' : 'Cambiar a modo día');
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', isLight ? '#f4f1ec' : '#0c0a0a');
    }
    themeToggle.addEventListener('click', function () {
        var next = rootEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        rootEl.setAttribute('data-theme', next);
        try { localStorage.setItem('rdm-theme', next); } catch (e) {}
        applyThemeLabel();
    });
    applyThemeLabel();

    /* ── Menú móvil ── */
    var navToggle = document.getElementById('navToggle');
    var nav = document.getElementById('nav');
    navToggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    nav.addEventListener('click', function (e) {
        if (e.target.classList.contains('nav__link')) {
            nav.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });

    /* ── Reveal on scroll ── */
    var revealEls = document.querySelectorAll('.reveal, .dyno');
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.18 });
        revealEls.forEach(function (el) { io.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ── Contadores del panel dyno ── */
    var counters = document.querySelectorAll('[data-count]');
    function animateCounter(el) {
        var target = parseInt(el.getAttribute('data-count'), 10);
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';
        if (prefersReducedMotion) {
            el.textContent = prefix + target + suffix;
            return;
        }
        var start = null;
        var duration = 1400;
        function tick(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + Math.round(eased * target) + suffix;
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) {
        var counterIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterIO.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(function (el) { counterIO.observe(el); });
    } else {
        counters.forEach(animateCounter);
    }

    /* ── Carrusel de opiniones ── */
    var track = document.getElementById('carouselTrack');
    var viewport = document.getElementById('carouselViewport');
    var prevBtn = document.getElementById('carouselPrev');
    var nextBtn = document.getElementById('carouselNext');
    var dotsWrap = document.getElementById('carouselDots');
    var slides = track.children;
    var page = 0;

    function perView() {
        var w = window.innerWidth;
        if (w <= 768) return 1;
        if (w <= 1024) return 2;
        return 3;
    }
    function pageCount() {
        return Math.ceil(slides.length / perView());
    }
    function buildDots() {
        dotsWrap.innerHTML = '';
        for (var i = 0; i < pageCount(); i++) {
            var dot = document.createElement('button');
            dot.className = 'carousel__dot' + (i === page ? ' is-active' : '');
            dot.setAttribute('aria-label', 'Ir a la página ' + (i + 1) + ' de opiniones');
            (function (idx) {
                dot.addEventListener('click', function () { goTo(idx); });
            })(i);
            dotsWrap.appendChild(dot);
        }
    }
    function goTo(idx) {
        var total = pageCount();
        page = (idx + total) % total;
        var pv = perView();
        var gap = 20;
        var slideW = (viewport.offsetWidth - gap * (pv - 1)) / pv;
        var offset = page * pv * (slideW + gap);
        // última página: no dejar hueco
        var maxOffset = slides.length * (slideW + gap) - gap - viewport.offsetWidth;
        track.style.transform = 'translateX(-' + Math.min(offset, Math.max(maxOffset, 0)) + 'px)';
        var dots = dotsWrap.children;
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('is-active', i === page);
        }
    }
    prevBtn.addEventListener('click', function () { stopAuto(); goTo(page - 1); });
    nextBtn.addEventListener('click', function () { stopAuto(); goTo(page + 1); });

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (page >= pageCount()) page = pageCount() - 1;
            buildDots();
            goTo(page);
        }, 150);
    });

    /* auto-avance suave, se corta al interactuar */
    var autoTimer = null;
    function startAuto() {
        if (prefersReducedMotion) return;
        autoTimer = setInterval(function () { goTo(page + 1); }, 6500);
    }
    function stopAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }
    viewport.addEventListener('touchstart', stopAuto, { passive: true });
    viewport.addEventListener('mouseenter', stopAuto);

    /* swipe táctil */
    var touchX = null;
    viewport.addEventListener('touchstart', function (e) {
        touchX = e.touches[0].clientX;
    }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
        if (touchX === null) return;
        var dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 45) goTo(page + (dx < 0 ? 1 : -1));
        touchX = null;
    }, { passive: true });

    buildDots();
    goTo(0);
    startAuto();

    /* ── FAQ: cerrar los demás al abrir uno ── */
    var faqItems = document.querySelectorAll('.faq__item');
    faqItems.forEach(function (item) {
        item.addEventListener('toggle', function () {
            if (item.open) {
                faqItems.forEach(function (other) {
                    if (other !== item) other.open = false;
                });
            }
        });
    });

    /* ── Año del footer ── */
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
