/* Dalton Lab · motor de movimento do protótipo (Cinema e Claro).
   Depende de GSAP 3.12.5 + ScrollTrigger (cdnjs) e, se carregar, Lenis (rolagem suave).
   Tudo tem fallback: sem bibliotecas ou com movimento reduzido, a página fica estática e completa. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Diagnóstico: com ?diag na URL, mostra no canto da tela o que aconteceu com os vídeos ---------- */
  var diagBox = null;
  function diag(msg) {
    return; // painel de diagnóstico desligado em produção
    if (!diagBox) {
      diagBox = document.createElement('pre');
      diagBox.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;margin:0;padding:10px;font:12px/1.4 monospace;white-space:pre-wrap;background:rgba(0,0,0,.85);color:#7f7;border-radius:8px';
      document.body.appendChild(diagBox);
    }
    diagBox.textContent += msg + '\n';
  }
  diag('movimento reduzido: ' + (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'SIM' : 'não'));
  diag('largura: ' + window.innerWidth + ' · navegador: ' + navigator.userAgent.replace(/^.*?\) /, '').slice(0, 90));

  /* ---------- Vídeos: carregam o arquivo só se existir data-src ---------- */
  var mobileVideo = window.innerWidth <= 760;
  var backgroundObserver = !reduce && 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      loadBackgroundVideo(entry.target);
      backgroundObserver.unobserve(entry.target);
    });
  }, { rootMargin: '300px' }) : null;

  /* iPhone em Modo Pouca Energia (e navegadores de app, como Telegram e WhatsApp) bloqueiam vídeo automático.
     O vídeo bloqueado fica na lista e volta a tocar no próximo toque na tela, se estiver visível. */
  var blocked = [];
  function tryPlay(v) {
    v.play().then(function () {
      blocked = blocked.filter(function (x) { return x !== v; });
    }).catch(function (err) {
      diag('play bloqueado: ' + (err && err.name) + ' · ' + (v.currentSrc || v.src).split('/').pop());
      if (blocked.indexOf(v) < 0) blocked.push(v);
    });
  }
  function retryBlocked() {
    blocked.slice().forEach(function (v) {
      var r = v.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) tryPlay(v);
    });
  }
  document.addEventListener('touchend', retryBlocked, { passive: true });
  document.addEventListener('click', retryBlocked);

  function loadBackgroundVideo(v) {
    var src = mobileVideo ? v.getAttribute('data-src-mobile') || v.getAttribute('data-src') : v.getAttribute('data-src');
    if (!src) return;
    v.addEventListener('playing', function () { v.classList.add('is-ready'); }, { once: true });
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.src = src;
    v.load();
    tryPlay(v);
    v.addEventListener('playing', function () { diag('tocando: ' + v.currentSrc.split('/').pop()); }, { once: true });
    v.addEventListener('error', function () { diag('erro no arquivo: ' + (v.error && v.error.code)); }, { once: true });
    /* Fora da tela, o vídeo pausa; ao voltar, retoma. Poupa bateria e processamento. */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { tryPlay(v); } else { v.pause(); } });
      }, { threshold: 0.01 }).observe(v);
    }
  }

  $$('video[data-background-loop]').forEach(function (v) {
    if (reduce) return;
    if (backgroundObserver) backgroundObserver.observe(v);
    else loadBackgroundVideo(v);
  });

  $$('video[data-src]:not([data-background-loop])').forEach(function (v) {
    var src = v.getAttribute('data-src');
    if (!src) return;
    v.muted = true; v.playsInline = true;
    v.src = src;
    v.addEventListener('canplay', function () { v.classList.add('is-ready'); tryPlay(v); }, { once: true });
  });

  /* ---------- Letreiro ---------- */
  $$('[data-rotator]').forEach(function (box) {
    var items = $$('.rot-item', box);
    if (!items.length) return;
    var anchor = items.length - 1;
    if (reduce || !hasGsap) {
      items.forEach(function (it, i) { it.style.opacity = i === anchor ? 1 : 0; it.style.transform = 'none'; });
      return;
    }
    var i = 0, iv = parseInt(box.getAttribute('data-interval'), 10) || 2600;
    items.forEach(function (it, k) { gsap.set(it, { yPercent: k === 0 ? 0 : 110, opacity: k === 0 ? 1 : 0 }); });
    function next() {
      var cur = items[i], n = (i + 1) % items.length;
      var nxt = items[n];
      gsap.to(cur, { yPercent: -110, opacity: 0, duration: 0.55, ease: 'power3.in' });
      gsap.fromTo(nxt, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.18 });
      i = n;
      setTimeout(next, n === anchor ? iv * 2.2 : iv);
    }
    setTimeout(next, iv);
  });

  /* ---------- Contadores ---------- */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = (el.getAttribute('data-count').split('.')[1] || '').length;
    if (reduce || !hasGsap) { el.textContent = target.toFixed(dec); return; }
    var o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = o.v.toFixed(dec); } });
  }

  /* ---------- Grade de 100 pontos ---------- */
  $$('[data-dots]').forEach(function (grid) {
    var win = +grid.getAttribute('data-win'), use = +grid.getAttribute('data-use');
    for (var k = 0; k < 100; k++) {
      var d = document.createElement('span');
      d.className = 'dot ' + (k < win ? 'dot-win' : k < win + use ? 'dot-use' : 'dot-none');
      grid.appendChild(d);
    }
  });

  /* ---------- Abas (empresas / pessoas) ---------- */
  $$('[data-tabs]').forEach(function (wrap) {
    var tabs = $$('[role="tab"]', wrap);
    var pill = $('.tab-pill', wrap);
    function select(t) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', on ? 'true' : 'false');
        x.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(x.getAttribute('aria-controls'));
        if (panel) {
          panel.hidden = !on;
          if (on && hasGsap && !reduce) {
            gsap.fromTo($$('.reveal-in', panel), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: 'power3.out' });
            gsap.fromTo($$('.bar-fill', panel), { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out', transformOrigin: 'left center' });
          }
        }
      });
      if (pill) { pill.style.width = t.offsetWidth + 'px'; pill.style.transform = 'translateX(' + t.offsetLeft + 'px)'; }
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = tabs.indexOf(t);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          var n = tabs[(k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          n.focus(); select(n);
        }
      });
    });
    var start = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    requestAnimationFrame(function () { select(start); });
    window.addEventListener('resize', function () { var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]; if (cur && pill) { pill.style.width = cur.offsetWidth + 'px'; pill.style.transform = 'translateX(' + cur.offsetLeft + 'px)'; } });
  });

  /* ---------- Saiba mais (cartões expansíveis) ---------- */
  $$('[data-expand]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (panel) panel.hidden = open;
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ---------- Navegação: fica sólida ao rolar ---------- */
  var nav = $('.nav');
  function navState() { if (nav) nav.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', navState, { passive: true });
  navState();

  if (reduce || !hasGsap) {
    $$('[data-count]').forEach(runCounter);
    $$('.word').forEach(function (w) { w.style.opacity = 1; });
    $$('[data-strike], [data-on]').forEach(function (el) { el.classList.add('is-on'); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* Rolagem suave, se a Lenis carregou */
  if (window.Lenis) {
    var lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* Entrada da primeira dobra */
  gsap.from('.hero [data-in]', { y: 36, opacity: 0, duration: 1.1, stagger: 0.09, ease: 'power3.out', delay: 0.15 });

  /* Mídia do hero: escala ou recolhe conforme a direção define (data-hero-media="shrink" | "grow") */
  $$('[data-hero-media]').forEach(function (m) {
    var mode = m.getAttribute('data-hero-media');
    var trig = m.closest('section');
    if (mode === 'shrink') {
      gsap.to(m, { scale: 0.88, borderRadius: 28, ease: 'none', scrollTrigger: { trigger: trig, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-copy', { yPercent: -18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: trig, start: 'top top', end: 'bottom top', scrub: true } });
    } else if (mode === 'grow') {
      gsap.fromTo(m, { clipPath: 'inset(0% 6% 0% 6% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: m, start: 'top 85%', end: 'top 15%', scrub: true } });
    }
  });

  /* Parallax nas mídias */
  $$('[data-parallax]').forEach(function (el) {
    var amt = parseFloat(el.getAttribute('data-parallax')) || 12;
    gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* Card único que se redesenha: pessoa -> agente, etapa por etapa, conforme a rolagem */
  $$('[data-morph]').forEach(function (m) {
    m.classList.add('is-anim');
    var chips = $$('.mchip:not(.stay)', m);
    var tl = gsap.timeline({ scrollTrigger: { trigger: m, start: 'top 22%', end: '+=1300', scrub: 0.6, pin: true, pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true } });
    tl.to(m, { '--m': 1, duration: 1, ease: 'none' }, 0);
    chips.forEach(function (c, i) { tl.to(c, { '--c': 1, duration: 0.22, ease: 'power1.inOut' }, 0.12 + i * 0.2); });
  });

  /* Cena do cenário: pontos -> card de etapas -> 1,7x, tudo amarrado à rolagem */
  $$('[data-scene]').forEach(function (sc) {
    sc.classList.add('is-anim');
    var chips = $$('.mchip:not(.stay)', sc);
    var tl = gsap.timeline({ scrollTrigger: { trigger: sc, start: 'top top', end: '+=2600', scrub: 0.7, pin: true, pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true } });
    tl.to(sc, { '--d': 1, duration: 0.16, ease: 'power1.inOut' }, 0.08)
      .to(sc, { '--k': 1, duration: 0.1, ease: 'power1.out' }, 0.24)
      .to(sc, { '--m': 1, duration: 0.3, ease: 'none' }, 0.48)
      .to(sc, { '--s': 1, duration: 0.12, ease: 'power2.out' }, 0.84)
      .to({}, { duration: 0.04 }, 0.96);
    chips.forEach(function (c, i) { tl.to(c, { '--c': 1, duration: 0.06, ease: 'power1.inOut' }, 0.54 + i * 0.06); });
  });

  /* Risco que atravessa a palavra quando ela entra na tela */
  $$('[data-strike]').forEach(function (el) {
    ScrollTrigger.create({ trigger: el, start: 'top 75%', onEnter: function () { el.classList.add('is-on'); }, onLeaveBack: function () { el.classList.remove('is-on'); } });
  });

  /* Elementos que ligam ao entrar na tela (gráfico que se desenha) */
  $$('[data-on]').forEach(function (el) {
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: function () { el.classList.add('is-on'); } });
  });

  /* Carrossel de vídeos: movimento constante, sentido por linha, pausa no hover */
  $$('[data-reel]').forEach(function (track) {
    var dir = track.getAttribute('data-reel') === 'right' ? 1 : -1;
    var tween = dir < 0
      ? gsap.fromTo(track, { xPercent: 0 }, { xPercent: -50, duration: 70, ease: 'none', repeat: -1 })
      : gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration: 70, ease: 'none', repeat: -1 });
    track.addEventListener('mouseenter', function () { gsap.to(tween, { timeScale: 0, duration: 0.6 }); });
    track.addEventListener('mouseleave', function () { gsap.to(tween, { timeScale: 1, duration: 0.6 }); });
    track.addEventListener('focusin', function () { tween.pause(); });
    track.addEventListener('focusout', function () { tween.resume(); });
  });

  /* Revelação de blocos */
  $$('[data-reveal]').forEach(function (el) {
    gsap.from(el, { y: 48, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
  });
  $$('[data-stagger]').forEach(function (wrap) {
    gsap.from(wrap.children, { y: 40, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: wrap, start: 'top 84%' } });
  });

  /* Frase que acende palavra a palavra conforme a rolagem */
  $$('[data-words]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) { return '<span class="word">' + w + '</span>'; }).join(' ');
    gsap.fromTo($$('.word', el), { opacity: 0.16 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  });

  /* Grade de pontos acende ao entrar */
  $$('[data-dots]').forEach(function (grid) {
    if (grid.closest('[data-scene]')) return;
    gsap.from($$('.dot', grid), { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(2)', stagger: { each: 0.012, from: 'start' }, scrollTrigger: { trigger: grid, start: 'top 80%' } });
  });

  /* Contadores ao entrar */
  $$('[data-count]').forEach(function (el) {
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { runCounter(el); } });
  });

  /* Faixa de logos: deslize contínuo, mais rápido quando a página rola */
  $$('[data-marquee]').forEach(function (track) {
    var tween = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    ScrollTrigger.create({ trigger: track, start: 'top bottom', end: 'bottom top', onUpdate: function (s) { tween.timeScale(1 + Math.min(Math.abs(s.getVelocity()) / 400, 4)); gsap.to(tween, { timeScale: 1, duration: 0.8, overwrite: true }); } });
  });

  /* Número gigante desliza na horizontal com a rolagem */
  $$('[data-drift]').forEach(function (el) {
    var amt = parseFloat(el.getAttribute('data-drift')) || 20;
    gsap.fromTo(el, { xPercent: amt }, { xPercent: -amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
})();

/* ---------- Menu do celular: abaixo de 1000px os links somem, e este botão abre o menu em tela cheia ---------- */
(function () {
  var nav = document.querySelector('.nav-in'), links = document.querySelector('.nav-links');
  if (!nav || !links || document.querySelector('.nav-burger')) return;
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'nav-burger'; b.setAttribute('aria-label', 'Abrir menu'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'menu-m');
  b.innerHTML = '<span></span><span></span>';
  nav.appendChild(b);
  var m = document.createElement('div');
  m.className = 'menu-m'; m.id = 'menu-m'; m.hidden = true;
  var cta = document.querySelector('.nav .btn');
  m.innerHTML = '<nav aria-label="Menu">' + links.innerHTML + '</nav>' + (cta ? '<a class="btn btn-primary" href="' + cta.getAttribute('href') + '">' + cta.textContent + '</a>' : '');
  document.body.appendChild(m);
  function set(open) {
    m.hidden = !open; b.setAttribute('aria-expanded', open); b.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.documentElement.classList.toggle('menu-open', open);
  }
  b.addEventListener('click', function () { set(m.hidden); });
  m.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) { set(false); b.focus(); } });
})();
