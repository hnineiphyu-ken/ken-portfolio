/*!
=========================================================
* Meyawo Landing page
=========================================================

* Copyright: 2019 DevCRUD (https://devcrud.com)
* Licensed: (https://devcrud.com/licenses)
* Coded by www.devcrud.com

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// smooth scroll
$(document).ready(function(){
    $(".navbar .nav-link").on('click', function(event) {

        if (this.hash !== "") {

            event.preventDefault();

            var hash = this.hash;

            $('html, body').animate({
                scrollTop: $(hash).offset().top
            }, 700, function(){
                window.location.hash = hash;
            });
        } 
    });
});

// navbar toggle
$('#nav-toggle').click(function(){
    $(this).toggleClass('is-active')
    $('ul.nav').toggleClass('show');
});

// A restrained, pointer-driven portrait tilt. Touch and reduced-motion stay still.
(function () {
    var motion = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    document.querySelectorAll('.profile-portrait').forEach(function (portrait) {
        var bounds;
        function reset() {
            portrait.style.removeProperty('--portrait-x');
            portrait.style.removeProperty('--portrait-y');
            bounds = null;
        }
        portrait.addEventListener('pointerenter', function () {
            bounds = portrait.getBoundingClientRect();
        });
        portrait.addEventListener('pointermove', function (event) {
            if (!motion.matches || event.pointerType === 'touch') return;
            if (!bounds) bounds = portrait.getBoundingClientRect();
            var x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
            var y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
            portrait.style.setProperty('--portrait-x', (-y * 8).toFixed(2) + 'deg');
            portrait.style.setProperty('--portrait-y', (x * 8).toFixed(2) + 'deg');
        });
        portrait.addEventListener('pointerleave', reset);
        portrait.addEventListener('pointercancel', reset);
        window.addEventListener('blur', reset);
        window.addEventListener('resize', reset);
        motion.addEventListener('change', reset);
    });
})();
