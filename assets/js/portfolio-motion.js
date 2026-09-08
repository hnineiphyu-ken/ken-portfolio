// Content is visible by default; animation is progressive enhancement only.
(function () {
    'use strict';
    var preference = window.matchMedia('(prefers-reduced-motion: reduce)');

    // The theme's .navbar .nav-link selector does not match our custom menu.
    document.querySelectorAll('.custom-navbar a[href^="#"], .hero-actions a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            var hash = link.getAttribute('href');
            var target = document.getElementById(hash.slice(1) || 'home');
            if (!target) return;
            event.preventDefault();

            var menu = document.querySelector('.custom-navbar .nav');
            var toggle = document.getElementById('nav-toggle');
            if (menu) menu.classList.remove('show');
            if (toggle) toggle.classList.remove('is-active');

            // Keep the URL bookmarkable without triggering a second jump.
            if (window.location.hash !== hash) history.pushState(null, '', hash);
            target.scrollIntoView({
                behavior: preference.matches ? 'instant' : 'smooth',
                block: 'start'
            });
            // Move keyboard navigation to the destination without interrupting scrolling.
            var hadTabindex = target.hasAttribute('tabindex');
            if (!hadTabindex) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            if (!hadTabindex) target.addEventListener('blur', function () {
                target.removeAttribute('tabindex');
            }, { once: true });
        });
    });

    if (preference.matches || !('IntersectionObserver' in window)) return;
    var items = document.querySelectorAll('.about, .section-title, #experience article, #projects article, .portfolio-card, #skills .row > div, #education .container > .mb-4, .blog-card');
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });
    items.forEach(function (item) {
        // Never hide something already in view or above the scroll position.
        if (item.getBoundingClientRect().top < window.innerHeight) return;
        item.classList.add('reveal-ready');
        observer.observe(item);
    });
    preference.addEventListener('change', function () {
        if (!preference.matches) return;
        observer.disconnect();
        items.forEach(function (item) { item.classList.add('is-visible'); });
    });
})();
