/* Exxat Form Configuration Guide
 * Routing by URL hash, topic navigation, lightbox, code panels, the
 * Feature ID checker and the intro splash. The page works without this
 * file (see the :target rules in css/styles.css); it only adds polish.
 */
(function () {
  'use strict';

  var SITE_TITLE = 'Exxat Form Configuration Guide';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var home = $('#home');
  var view = $('#view');
  var topics = $$('.topic');

  /* ---------- Routing: #topic or #part-inside-a-topic ---------- */
  var homeScrollY = 0;
  var currentTopic = null;
  var onHome = true;

  function showTopic(section, target) {
    if (onHome) homeScrollY = window.scrollY;
    topics.forEach(function (s) { s.hidden = s !== section; });

    var k = topics.indexOf(section);
    setStep($('#prev'), $('#prevT'), topics[k - 1]);
    setStep($('#next'), $('#nextT'), topics[k + 1]);

    home.hidden = true;
    view.hidden = false;
    onHome = false;
    buildRail(section);

    // Jump when the topic changes (it animates in); glide when moving within it.
    var sameTopic = currentTopic === section;
    currentTopic = section;
    if (target === section) window.scrollTo({ top: 0, behavior: sameTopic ? 'smooth' : 'auto' });
    else target.scrollIntoView({ behavior: sameTopic ? 'smooth' : 'auto', block: 'start' });
    setTimeout(function () { updateProgress(); spyRail(); }, 0);

    var colour = getComputedStyle(section).getPropertyValue('--tc');
    var deco = $('.deco');
    if (colour && deco) deco.style.setProperty('--deco-c', colour.trim());
    document.title = section.dataset.title + ' · ' + SITE_TITLE;
  }

  function setStep(link, label, section) {
    if (!link) return;
    link.hidden = !section;
    if (section) {
      link.href = '#' + section.id;
      label.textContent = section.dataset.title;
    }
  }

  function showHome(toTopics) {
    view.hidden = true;
    home.hidden = false;
    currentTopic = null;
    var grid = toTopics && document.getElementById('topics');
    if (grid) window.scrollTo(0, grid.getBoundingClientRect().top + window.scrollY - 8);
    else if (!onHome) window.scrollTo(0, homeScrollY);
    onHome = true;
    document.title = SITE_TITLE;
  }

  function route() {
    var id = location.hash.slice(1);
    var target = id && document.getElementById(id);
    var section = target && target.closest('.topic');
    if (section) showTopic(section, target);
    else showHome(id === 'topics');
  }

  window.addEventListener('hashchange', route);

  /* ---------- Rail: the open topic's parts as a timeline ----------
   * Lists the topic's parts, or its section headings when it has no parts,
   * and highlights the one that has most recently scrolled past the top. */
  var rail = document.createElement('nav');
  rail.className = 'rail';
  rail.setAttribute('aria-label', 'In this topic');
  rail.innerHTML = '<p class="railh">In this topic</p><ol class="railsteps"></ol>';
  var railList = $('.railsteps', rail);
  var railItems = [];   // [{ el, link }]

  function buildRail(section) {
    railItems = [];
    if (!rail) return;
    var targets = $$('.part', section);
    var useHeadings = !targets.length;
    if (useHeadings) targets = $$('.tcol > h3, .tcol > .glance', section);
    targets.forEach(function (el, i) {
      if (!el.id) el.id = section.id + '-h' + (i + 1);
    });
    railList.innerHTML = targets.map(function (el) {
      var label = useHeadings ? (el.classList.contains('glance') ? $('summary span', el) : el) : $('.ph', el);
      return '<li><a class="rs" href="#' + el.id + '"><i aria-hidden="true"></i><span>' +
        (label ? label.textContent : el.id) + '</span></a></li>';
    }).join('');
    var body = $('.tbody', section);
    body.classList.toggle('hasrail', targets.length > 0);
    if (targets.length) body.insertBefore(rail, body.firstChild);
    else if (rail.parentNode) rail.parentNode.removeChild(rail);
    var links = $$('a', railList);
    railItems = targets.map(function (el, i) { return { el: el, link: links[i] }; });
    spyRail();
  }

  function spyRail() {
    if (!railItems.length) return;
    var line = 150;
    var active = railItems[0];
    railItems.forEach(function (it) {
      if (it.el.getBoundingClientRect().top <= line) active = it;
    });
    var atEnd = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd) active = railItems[railItems.length - 1];
    railItems.forEach(function (it) {
      var on = it === active;
      if (on !== it.link.classList.contains('on')) {
        it.link.classList.toggle('on', on);
        if (on && it.link.scrollIntoView) it.link.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /* ---------- Back-to-top button and reading progress ---------- */
  var topButtons = $$('.totop');
  function toggleTopButtons() {
    var away = window.scrollY < 120;
    topButtons.forEach(function (b) { b.classList.toggle('away', away); });
  }
  topButtons.forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var href = b.getAttribute('href');
      if (location.hash !== href) history.pushState(null, '', href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  var progressBar = $('#rp');
  function updateProgress() {
    if (view.hidden || !progressBar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (h > 0 ? Math.min(100, window.scrollY / h * 100) : 0) + '%';
  }

  window.addEventListener('scroll', function () { toggleTopButtons(); updateProgress(); spyRail(); }, { passive: true });
  toggleTopButtons();

  /* ---------- Lightbox for screenshots ---------- */
  var lightbox = $('#lb');
  if (lightbox) {
    var lbImage = $('img', lightbox);
    var lbCaption = $('.lbcap', lightbox);
    var lbClose = $('.lbc', lightbox);

    var lbPrev = $('.lbp', lightbox);
    var lbNext = $('.lbn', lightbox);
    var lbCount = $('.lbcount', lightbox);
    var gallery = [];   // every screenshot of the open topic
    var galleryIndex = 0;

    function showLightboxImage(i) {
      galleryIndex = (i + gallery.length) % gallery.length;
      var img = gallery[galleryIndex];
      lbImage.src = img.src;
      lbImage.alt = img.alt;
      var caption = img.closest('figure').querySelector('figcaption');
      lbCaption.textContent = caption ? caption.textContent : '';
      lbCount.textContent = gallery.length > 1 ? (galleryIndex + 1) + ' / ' + gallery.length : '';
      lbPrev.hidden = lbNext.hidden = gallery.length < 2;
    }
    function openLightbox(img) {
      var section = img.closest('.topic');
      gallery = $$('.tbody figure img', section || document);
      showLightboxImage(Math.max(0, gallery.indexOf(img)));
      lightbox.classList.add('on');
      lbClose.focus();
    }
    function closeLightbox() {
      lightbox.classList.remove('on');
      lbImage.removeAttribute('src');
    }
    function stepLightbox(delta) {
      if (gallery.length > 1) showLightboxImage(galleryIndex + delta);
    }

    document.addEventListener('click', function (e) {
      var img = e.target.closest('.tbody figure img');
      if (img) openLightbox(img);
    });
    lightbox.addEventListener('click', function (e) {
      var nav = e.target.closest('.lbnav');
      if (nav) { e.stopPropagation(); stepLightbox(nav === lbNext ? 1 : -1); return; }
      closeLightbox();
    });
    // Arrow keys move between screenshots; Escape closes. Handled before the
    // page-level shortcuts below, which skip while the lightbox is open.
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('on')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
    });
  }

  /* ---------- "Next part" link at the end of every part ---------- */
  topics.forEach(function (section, k) {
    var parts = $$('.part', section);
    parts.forEach(function (part, i) {
      var next = parts[i + 1];
      var nextTopic = topics[k + 1];
      var href, kind, title;
      if (next) {
        href = '#' + next.id; kind = 'Next part'; title = $('.ph', next).textContent;
      } else if (nextTopic) {
        href = '#' + nextTopic.id; kind = 'Next topic'; title = nextTopic.dataset.title;
      } else {
        return;
      }
      var a = document.createElement('a');
      a.className = 'nextpart';
      a.href = href;
      a.innerHTML = '<span><small></small><b></b></span><span class="npgo" aria-hidden="true">→</span>';
      $('small', a).textContent = kind;
      $('b', a).textContent = title;
      part.appendChild(a);
    });
  });

  /* ---------- Collapsible "Steps at a glance", remembered ---------- */
  var glances = $$('details.glance');
  if (glances.length) {
    var pref = null;
    try { pref = localStorage.getItem('glance'); } catch (err) {}
    glances.forEach(function (d) {
      if (pref === 'closed') d.open = false;
      $('summary', d).insertAdjacentHTML('beforeend', '<small></small>');
      d.addEventListener('toggle', function () {
        try { localStorage.setItem('glance', d.open ? 'open' : 'closed'); } catch (err) {}
        glances.forEach(function (o) { if (o !== d) o.open = d.open; });
      });
    });
  }

  /* ---------- Keyboard shortcuts ---------- */
  var help = $('#kbd');
  function toggleHelp(force) {
    if (!help) return;
    var show = typeof force === 'boolean' ? force : help.hidden;
    help.hidden = !show;
    if (show) $('.kbdx', help).focus();
  }
  if (help) {
    help.addEventListener('click', function (e) {
      if (e.target === help || e.target.closest('.kbdx')) toggleHelp(false);
    });
    $$('.kbdbtn').forEach(function (b) { b.addEventListener('click', function () { toggleHelp(true); }); });
  }
  function currentPartIndex(parts) {
    var line = 150, idx = -1;
    parts.forEach(function (p, i) { if (p.getBoundingClientRect().top <= line) idx = i; });
    return idx;
  }
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (lightbox && lightbox.classList.contains('on')) return;

    if (e.key === '?') { e.preventDefault(); toggleHelp(); return; }
    if (help && !help.hidden) { if (e.key === 'Escape') toggleHelp(false); return; }
    if (onHome) return;

    var section = currentTopic;
    if (e.key === 'Escape') { location.hash = '#topics'; return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      var link = $(e.key === 'ArrowRight' ? '#next' : '#prev');
      if (link && !link.hidden) { e.preventDefault(); location.hash = link.getAttribute('href'); }
      return;
    }
    if (e.key === 'n' || e.key === 'N' || e.key === 'p' || e.key === 'P') {
      var parts = $$('.part', section);
      if (!parts.length) return;
      var i = currentPartIndex(parts) + (e.key === 'n' || e.key === 'N' ? 1 : -1);
      if (i < 0 || i >= parts.length) return;
      e.preventDefault();
      location.hash = '#' + parts[i].id;
    }
  });

  /* ---------- Code panels: expand and copy ---------- */
  document.addEventListener('click', function (e) {
    var expand = e.target.closest('[data-expand]');
    if (expand) {
      document.getElementById(expand.dataset.expand).classList.add('open');
      return;
    }
    var copy = e.target.closest('[data-copy]');
    if (!copy) return;

    var pre = document.getElementById(copy.dataset.copy);
    var text = pre.innerText.replace(/\n$/, '');
    var label = $('span', copy);

    function done() {
      copy.classList.add('done');
      label.textContent = 'Copied';
      setTimeout(function () {
        copy.classList.remove('done');
        label.textContent = 'Copy code';
      }, 1800);
    }
    function selectInstead() {
      var range = document.createRange();
      range.selectNodeContents(pre);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      label.textContent = 'Press Ctrl+C to copy';
    }
    try {
      navigator.clipboard.writeText(text).then(done, selectInstead);
    } catch (err) {
      selectInstead();
    }
  });

  /* ---------- Downloads inside the Claude artifact runtime ----------
   * In a normal browser the download attribute does the job. Inside an
   * artifact the page is sandboxed, so hand the file to the host instead. */
  var downloads = null;
  if (window.claude && window.claude.use) {
    window.claude.use('downloads').then(function (d) { downloads = d; }).catch(function () {});
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-dl]');
    if (!link || !downloads) return;
    e.preventDefault();
    fetch(link.getAttribute('href'))
      .then(function (r) { if (!r.ok) throw new Error(r.statusText); return r.blob(); })
      .then(function (blob) { return downloads.save({ filename: link.getAttribute('download'), data: blob }); })
      .then(function () { link.classList.add('ok'); })
      .catch(function (err) {
        if (!err || err.code !== 'declined') link.title = 'This download is not available here.';
      });
  });

  /* ---------- Feature ID checker ---------- */
  var idInput = $('#abbrIn');
  var idMessage = $('#abbrMsg');
  if (idInput && idMessage) {
    idInput.addEventListener('input', function () {
      var value = idInput.value;
      idMessage.className = 'msg';
      idInput.classList.remove('err');
      if (!value) { idMessage.textContent = ''; return; }

      var bad = value.match(/[^A-Za-z0-9_]/g);
      if (bad) {
        var unique = Array.from(new Set(bad)).map(function (c) { return c === ' ' ? '(space)' : c; }).join('  ');
        idInput.classList.add('err');
        idMessage.className = 'msg no';
        idMessage.textContent =
          (value.indexOf(' ') !== -1 ? 'Spaces are not permitted. Use an underscore instead. ' : '') +
          'Characters not permitted: ' + unique + '. Use only letters, numbers and underscores.';
      } else {
        idMessage.className = 'msg ok';
        idMessage.textContent = 'All characters are permitted. Confirm that no other form uses this Feature ID.';
      }
    });
  }

  /* ---------- Light and dark mode ----------
   * data-theme on <html> overrides the system setting (the head script sets
   * it early from localStorage). html.dark mirrors the effective theme so the
   * toggle can show the right icon. */
  var root = document.documentElement;
  var systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var themeButtons = $$('.theme');

  function currentTheme() {
    var chosen = root.getAttribute('data-theme');
    if (chosen === 'light' || chosen === 'dark') return chosen;
    return systemDark && systemDark.matches ? 'dark' : 'light';
  }
  function reflectTheme() {
    var dark = currentTheme() === 'dark';
    root.classList.toggle('dark', dark);
    themeButtons.forEach(function (b) {
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  var themingTimer = null;
  function setTheme(theme) {
    root.classList.add('theming');
    clearTimeout(themingTimer);
    themingTimer = setTimeout(function () { root.classList.remove('theming'); }, 450);
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (err) {}
    reflectTheme();
  }
  themeButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  });
  if (systemDark && systemDark.addEventListener) systemDark.addEventListener('change', reflectTheme);
  reflectTheme();

  /* ---------- First paint ---------- */
  $$('.card').forEach(function (card, i) { card.style.setProperty('--d', i); });
  route();

  /* ---------- Intro splash, only on the home page and only with motion allowed ---------- */
  var intro = $('#intro');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (intro && onHome && !reduceMotion) {
    intro.hidden = false;
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      intro.classList.add('out');
      document.body.classList.add('play');
      setTimeout(function () { intro.hidden = true; }, 750);
      setTimeout(function () { document.body.classList.remove('play'); }, 2000);
    };
    setTimeout(finish, 2600);
    intro.addEventListener('click', finish);
    document.addEventListener('keydown', finish, { once: true });
  }
})();
