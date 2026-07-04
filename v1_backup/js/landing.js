/* ============================================================
   landing.js — Landing Page Interactions
   Handles scroll animations, smooth scrolling, mobile menu,
   auth-state CTA swap, and mobile testimonial auto-rotation.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------------
     1. SCROLL-TRIGGERED ENTRANCE ANIMATIONS
     Uses IntersectionObserver to add the "visible" class when
     elements with ".animate-on-scroll" enter the viewport.
     ---------------------------------------------------------- */
  const animatedElements = document.querySelectorAll('.animate-on-scroll');

  if ('IntersectionObserver' in window) {
    const observerOptions = {
      root: null,          // viewport
      threshold: 0.15,     // trigger when 15 % visible
      rootMargin: '0px 0px -40px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // animate only once
        }
      });
    }, observerOptions);

    animatedElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback: show everything immediately for older browsers
    animatedElements.forEach((el) => el.classList.add('visible'));
  }

  /* ----------------------------------------------------------
     2. SMOOTH SCROLLING FOR ANCHOR LINKS
     Intercepts clicks on links that start with "#" and scrolls
     the target element into view smoothly.
     ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return; // skip bare hashes

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Close mobile menu if open
        closeMobileMenu();
      }
    });
  });

  /* ----------------------------------------------------------
     3. MOBILE HAMBURGER MENU TOGGLE
     Toggles the "open" class on the nav links panel and the
     "active" class on the hamburger icon to animate its bars.
     ---------------------------------------------------------- */
  const hamburger = document.getElementById('hamburger-toggle');
  const navLinks  = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });
  }

  /** Helper: close the mobile menu programmatically */
  function closeMobileMenu() {
    if (navLinks && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  }

  // Close menu when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (
      navLinks &&
      navLinks.classList.contains('open') &&
      !navLinks.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      closeMobileMenu();
    }
  });

  /* ----------------------------------------------------------
     4. AUTH STATE CHECK
     If the user is already logged in (session exists), swap the
     "Get Started" CTA button to "Dashboard" and point it to
     dashboard.html.
     ---------------------------------------------------------- */
  async function checkAuthState() {
    try {
      // Ensure Supabase helpers are loaded (defined in supabase-client.js)
      if (typeof getCurrentUser === 'function') {
        const user = await getCurrentUser();
        if (user) {
          const navCta  = document.getElementById('nav-cta');
          const heroCta = document.getElementById('hero-cta');

          if (navCta) {
            navCta.textContent = 'Dashboard';
            navCta.href = 'dashboard.html';
          }
          if (heroCta) {
            heroCta.textContent = 'Go to Dashboard →';
            heroCta.href = 'dashboard.html';
          }
        }
      }
    } catch (err) {
      // Silently ignore — user is simply not logged in
      console.info('Auth check skipped:', err.message);
    }
  }

  checkAuthState();

  /* ----------------------------------------------------------
     5. MOBILE TESTIMONIAL AUTO-ROTATION
     On screens ≤ 768 px the testimonials grid becomes a
     horizontal carousel. This auto-rotates through the cards
     every 5 seconds.
     ---------------------------------------------------------- */
  function initTestimonialCarousel() {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) {
      grid.classList.remove('mobile-carousel');
      return;
    }

    grid.classList.add('mobile-carousel');

    const cards = grid.querySelectorAll('.testimonial-card');
    if (cards.length <= 1) return;

    let current = 0;

    // Show a specific card by scrolling the grid
    function showCard(index) {
      cards[index].scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }

    // Auto-rotate every 5 seconds
    setInterval(() => {
      current = (current + 1) % cards.length;
      showCard(current);
    }, 5000);
  }

  initTestimonialCarousel();

  // Re-evaluate on resize (in case user rotates device)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initTestimonialCarousel, 300);
  });

});
