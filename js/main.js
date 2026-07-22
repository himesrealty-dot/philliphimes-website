/* =========================================
   PHILLIP HIMES REAL ESTATE — MAIN JS
   philliphimes.com
   ========================================= */

document.addEventListener('DOMContentLoaded', function () {

  // ── Mobile Nav Toggle ──────────────────────────────────
  const hamburger = document.querySelector('.nav__hamburger');
  const navLinks = document.querySelector('.nav__links');

  if (hamburger && navLinks) {
    const mobileCta = navLinks.querySelector('.nav__mobile-cta');

    hamburger.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('nav__links--open');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      hamburger.classList.toggle('open', isOpen);
      if (mobileCta) mobileCta.style.display = isOpen ? 'block' : 'none';
    });

    // Mobile dropdown toggles (Cities, Tools)
    document.querySelectorAll('.nav__item--dropdown > .nav__link').forEach(link => {
      link.addEventListener('click', function (e) {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          this.closest('.nav__item--dropdown').classList.toggle('open');
        }
      });
    });

    // Close on link click
    navLinks.querySelectorAll('a:not(.nav__item--dropdown > .nav__link)').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('nav__links--open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.classList.remove('open');
        document.body.style.overflow = '';
        if (mobileCta) mobileCta.style.display = 'none';
      });
    });
  }

  // ── Sticky Nav Shadow ──────────────────────────────────
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.style.boxShadow = window.scrollY > 10
        ? '0 4px 16px rgba(0,0,0,0.12)'
        : '0 1px 3px rgba(0,0,0,0.08)';
    }, { passive: true });
  }

  // ── Active Nav Link ────────────────────────────────────
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('nav__link--active');
    }
  });

  // ── Smooth Scroll for anchor links ─────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Animate on Scroll ──────────────────────────────────
  const animateEls = document.querySelectorAll('.life-card, .card, .tool-card, .neighborhood-card, .testimonial, .stat__number, .portal-card, .guide-card');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = entry.target.classList.contains('stat__number')
          ? 'none'
          : 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  animateEls.forEach(el => {
    el.style.opacity = '0';
    if (!el.classList.contains('stat__number')) {
      el.style.transform = 'translateY(20px)';
    }
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    observer.observe(el);
  });

  // ── Stat Counter Animation ─────────────────────────────
  function animateCounter(el) {
    const text = el.textContent;
    const numMatch = text.match(/[\d,]+/);
    if (!numMatch) return;
    const target = parseInt(numMatch[0].replace(/,/g, ''));
    const prefix = text.slice(0, text.indexOf(numMatch[0]));
    const suffix = text.slice(text.indexOf(numMatch[0]) + numMatch[0].length);
    const duration = 1500;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = prefix + current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat__number').forEach(el => statObserver.observe(el));

  // Tagged lead-capture → FastAPI /lead (offer engine + speed-to-lead). A form opts
  // in with data-lead-tag="<offer-tag>" (+ optional data-source); the contact form
  // routes its tag off the subject dropdown. Non-tagged forms keep Netlify Forms.
  const LEAD_API = 'https://real-estate-agentic-os-production.up.railway.app';
  const CONTACT_SUBJECT_TAGS = {
    "I'm ready to buy a home": "home-finder",
    "I want to sell my home": "home-valuation",
    "I want my TruMarket Home Report": "home-valuation",
    "I'm interested in Rebalance": "rebalance",
    "I'm interested in Amplify": "amplify",
    "I'm interested in Renew": "renew",
    "I'm interested in new construction": "builder-incentives",
    "I'm relocating to Houston": "relo-guide",
    "General question": "website-contact"
  };
  function resolveLeadTag(defaultTag, subject) {
    if (defaultTag === 'contact') return (subject && CONTACT_SUBJECT_TAGS[subject]) || 'website-contact';
    return defaultTag;
  }

  // ── Form Validation & Submission ───────────────────────
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : '';
      if (btn) {
        btn.textContent = 'Sending...';
        btn.disabled = true;
      }

      // Validate SMS consent if present
      const smsConsent = form.querySelector('[name="sms_consent"]');
      if (smsConsent && !smsConsent.checked) {
        alert('Please agree to the terms to continue.');
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        return;
      }

      // Gather form data
      const data = Object.fromEntries(new FormData(form));
      data.page = window.location.pathname;
      data.timestamp = new Date().toISOString();

      // Tagged forms → FastAPI /lead (offer engine + speed-to-lead), not Netlify.
      const leadTag = form.getAttribute('data-lead-tag');
      if (leadTag) {
        if ((data['bot-field'] || data.company || '').trim()) {
          showSuccessMessage(form);
          if (btn) { btn.textContent = originalText; btn.disabled = false; }
          return;
        }
        const leadName = (data.name || [data.first_name || data['first-name'], data.last_name || data['last-name']].filter(Boolean).join(' ')).trim();
        const payload = {
          name: leadName,
          email: (data.email || '').trim(),
          phone: (data.phone || '').trim(),
          message: (data.message || data.subject || '').trim(),
          consent: smsConsent ? smsConsent.checked : true,
          source: form.getAttribute('data-source') || ('web:' + location.pathname),
          tag: resolveLeadTag(leadTag, data.subject)
        };
        try {
          const r = await fetch(LEAD_API + '/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!r.ok) throw new Error('http ' + r.status);
          showSuccessMessage(form);
        } catch (err) {
          window.location.href = 'mailto:phil@philliphimes.com?subject='
            + encodeURIComponent('Website Inquiry') + '&body='
            + encodeURIComponent(JSON.stringify(payload, null, 2));
        }
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        return;
      }

      try {
        // Netlify Forms built-in handling
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data).toString()
        });

        if (response.ok) {
          showSuccessMessage(form);
        } else {
          throw new Error('Network response was not ok');
        }
      } catch (err) {
        // Fallback: show mailto link
        const email = 'phil@philliphimes.com';
        const subject = encodeURIComponent(data.subject || 'Website Inquiry');
        const body = encodeURIComponent(JSON.stringify(data, null, 2));
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      }

      if (btn) { btn.textContent = originalText; btn.disabled = false; }
    });
  });

  function showSuccessMessage(form) {
    const msg = document.createElement('div');
    msg.className = 'form-success';
    msg.style.cssText = `
      background: #d4edda; color: #155724; border: 1px solid #c3e6cb;
      border-radius: 8px; padding: 1rem 1.5rem; margin-top: 1rem;
      font-family: 'Open Sans', sans-serif; font-size: 0.95rem;
      animation: fadeIn 0.3s ease;
    `;
    msg.textContent = "✓ Thank you! I'll be in touch within 24 hours. — Phillip";
    form.parentNode.insertBefore(msg, form.nextSibling);
    form.reset();
    setTimeout(() => msg.remove(), 8000);
  }

  // ── Hero Search Box ────────────────────────────────────
  const heroSearch = document.querySelector('.hero__search');
  if (heroSearch) {
    const input = heroSearch.querySelector('.hero__search-input');
    const btn = heroSearch.querySelector('.btn');

    if (input && btn) {
      function handleSearch() {
        const query = input.value.trim();
        if (!query) {
          input.focus();
          return;
        }
        // In production: redirect to IDX Broker search with query
        // For now: redirect to contact page with pre-filled message
        const encoded = encodeURIComponent(query);
        window.location.href = `contact.html?search=${encoded}`;
      }

      btn.addEventListener('click', handleSearch);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSearch();
      });
    }
  }

  // ── Pre-fill contact form from URL params ──────────────
  const params = new URLSearchParams(window.location.search);
  if (params.get('search')) {
    const msgField = document.querySelector('[name="message"]');
    if (msgField) {
      msgField.value = `I'm looking for: ${params.get('search')}`;
    }
  }
  if (params.get('topic')) {
    const subjectField = document.querySelector('[name="subject"]');
    if (subjectField) {
      const topics = {
        'buy': "I'm ready to buy a home",
        'sell': "I want to sell my home",
        'trumarket': "I want my TruMarket Home Report",
        'rebalance': "I'm interested in Rebalance",
        'amplify': "I'm interested in Amplify",
        'renew': "I'm interested in Renew",
        'newbuild': "I'm interested in new construction"
      };
      subjectField.value = topics[params.get('topic')] || params.get('topic');
    }
  }

});

/* ── CSS Animation ─────────────────────────────────────── */
const style = document.createElement('style');
style.textContent = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
document.head.appendChild(style);
