/* shrine.js - SpiritVale Link Shrine */
import { parse } from 'https://esm.sh/smol-toml';

(function () {
  'use strict';

  var activeFeature = 'all';
  var activeLangs = ['en', 'global'];
  var activeSort = 'default';
  var activeOrigin = ['official', 'community'];
  var maxVisibleStars = 3;
  var officialLinkWeight = 1;
  var endorsementWeight = 10;
  var githubWeight = 5;

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function makeBadge(tag, label, href) {
    var cls = 'badge badge-' + tag;
    if (href) {
      return el('a', {
        class: cls,
        href: href,
        target: '_blank',
        rel: 'noopener noreferrer',
        title: 'View source on GitHub'
      }, label);
    }
    return el('span', { class: cls }, label);
  }

  function buildRow(link, tagLabels, langMeta) {
    var tags = link.tags || [];
    var langs = link.lang || [];
    var li = el('li', {
      class: 'link-row',
      'data-tags': tags.join(' '),
      'data-lang': langs.join(' '),
      'data-origin': link.origin || 'community'
    });

    li.appendChild(el('a', {
      class: 'link-title',
      href: link.url,
      target: '_blank',
      rel: 'noopener noreferrer'
    }, link.title));

    if (link.origin === 'official') {
      li.appendChild(el('span', { class: 'link-official-mark', title: 'Official', 'aria-label': 'Official' }, '✔'));
    }

    if (link.endorsements > 0) {
      var stars = '★'.repeat(Math.min(link.endorsements, maxVisibleStars));
      li.appendChild(el('span', { class: 'link-stars', title: 'Community-endorsed', 'aria-label': stars + ' stars' }, stars));
    }

    var flagSpan = el('span', { class: 'link-lang' });
    langs.forEach(function (code) {
      var meta = langMeta && langMeta[code];
      if (meta && meta.flag) {
        flagSpan.appendChild(el('span', { class: 'link-lang-flag', title: meta.label }, meta.flag));
      }
    });
    li.appendChild(flagSpan);

    if (link.author) {
      li.appendChild(el('span', { class: 'link-author' }, 'by ' + link.author));
    }

    var badgeGroup = el('span', { class: 'badge-group' });
    tags.forEach(function (tag) {
      var label = (tagLabels && tagLabels[tag]) || tag;
      badgeGroup.appendChild(makeBadge(tag, label, null));
    });

    if (link.github) {
      badgeGroup.appendChild(makeBadge('github', 'GitHub', link.github));
    }

    if (badgeGroup.childNodes.length > 0) li.appendChild(badgeGroup);

    if (link.desc) {
      li.appendChild(el('span', { class: 'link-desc' }, link.desc));
    }

    return li;
  }

  function applyFilters() {
    var grid = document.querySelector('.shrine-grid');
    var multiLang = activeLangs.filter(function (l) { return l !== 'global'; }).length > 1;
    if (grid) grid.classList.toggle('lang-multi', multiLang);

    var rows = document.querySelectorAll('.link-row');
    var lastVisible = null;
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      row.classList.remove('visible-last');
      var tags = row.getAttribute('data-tags') || '';
      var langs = row.getAttribute('data-lang') || '';

      var featureOk = activeFeature === 'all' ||
        tags.split(' ').indexOf(activeFeature) !== -1;

      var langOk = activeLangs.length === 0 ||
        langs.split(' ').some(function (l) { return activeLangs.indexOf(l) !== -1; });

      var originOk = activeOrigin.length === 0 || activeOrigin.indexOf(row.getAttribute('data-origin') || 'community') !== -1;
      var isVisible = featureOk && langOk && originOk;
      row.classList.toggle('hidden', !isVisible);
      if (isVisible) lastVisible = row;
    }
    if (lastVisible) lastVisible.classList.add('visible-last');

    var emptyMsg = document.querySelector('.shrine-empty');
    if (!emptyMsg) {
      emptyMsg = el('div', { class: 'shrine-empty' }, 'No links match your current filters.');
      grid.appendChild(emptyMsg);
    }
    emptyMsg.classList.toggle('hidden', lastVisible !== null);
  }

  function buildList(data) {
    var nav = document.querySelector('.shrine-nav');
    var grid = document.querySelector('.shrine-grid');
    if (!nav || !grid) return;

    var allLinks = (data.links || []).filter(function (link) {
      return link && link.title && link.url;
    });

    function linkScore(l) {
      return ((l.endorsements || 0) * endorsementWeight) +
        (l.origin === 'official' ? officialLinkWeight : 0) +
        (l.github ? githubWeight : 0);
    }

    allLinks.sort(function (a, b) {
      var diff = linkScore(b) - linkScore(a);
      return diff !== 0 ? diff : a.title.localeCompare(b.title);
    });

    var tagLabels = {};
    (data.filters || []).forEach(function (f) { tagLabels[f.tag] = f.label; });

    var langMeta = {};
    (data.languages || []).forEach(function (l) { langMeta[l.code] = l; });

    function setActiveFilter(tag) {
      activeFeature = tag;
      nav.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.toggle('filter-active', b.getAttribute('data-filter') === tag);
      });
      applyFilters();
    }

    var allBtn = el('button', { class: 'filter-btn filter-active', 'data-filter': 'all' }, 'All');
    allBtn.addEventListener('click', function () { setActiveFilter('all'); });
    nav.appendChild(allBtn);

    (data.filters || []).forEach(function (f) {
      if (!f.nav) return;
      var btn = el('button', { class: 'filter-btn', 'data-filter': f.tag }, f.label || f.tag);
      btn.addEventListener('click', function () { setActiveFilter(f.tag); });
      nav.appendChild(btn);
    });

    var langBar = el('div', { class: 'lang-bar' });

    if (data.languages && data.languages.length) {
      data.languages.forEach(function (lang) {
        var btn = el('button', {
          class: 'lang-btn' + (activeLangs.indexOf(lang.code) !== -1 ? ' lang-active' : ''),
          'data-lang': lang.code
        }, lang.label);
        btn.addEventListener('click', function () {
          var idx = activeLangs.indexOf(lang.code);
          if (idx === -1) {
            activeLangs.push(lang.code);
            btn.classList.add('lang-active');
          } else {
            activeLangs.splice(idx, 1);
            btn.classList.remove('lang-active');
          }
          applyFilters();
        });
        langBar.appendChild(btn);
      });

      langBar.appendChild(el('span', { class: 'bar-divider' }));
    }

    [['official', 'Official'], ['community', 'Community']].forEach(function (opt) {
      var btn = el('button', { class: 'origin-btn origin-active', 'data-origin': opt[0] }, opt[1]);
      btn.addEventListener('click', function () {
        var idx = activeOrigin.indexOf(opt[0]);
        if (idx === -1) {
          activeOrigin.push(opt[0]);
          btn.classList.add('origin-active');
        } else {
          activeOrigin.splice(idx, 1);
          btn.classList.remove('origin-active');
        }
        applyFilters();
      });
      langBar.appendChild(btn);
    });

    nav.parentNode.insertBefore(langBar, nav.nextSibling);

    function getSortedLinks() {
      if (activeSort === 'alpha') {
        return allLinks.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });
      }
      if (activeSort === 'newest') {
        return allLinks.slice().sort(function (a, b) {
          var da = a.created || '9999-99-99', db = b.created || '9999-99-99';
          return da === db ? 0 : da < db ? 1 : -1;
        });
      }
      if (activeSort === 'oldest') {
        return allLinks.slice().sort(function (a, b) {
          var da = a.created || '9999-99-99', db = b.created || '9999-99-99';
          return da === db ? 0 : da > db ? 1 : -1;
        });
      }
      if (activeSort === 'random') {
        var arr = allLinks.slice();
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
      }
      return allLinks;
    }

    var ul = el('ul', { class: 'link-list' });
    grid.appendChild(ul);

    function renderLinks() {
      ul.innerHTML = '';
      getSortedLinks().forEach(function (link) {
        ul.appendChild(buildRow(link, tagLabels, langMeta));
      });
      applyFilters();
    }

    var sortBar = el('div', { class: 'sort-bar' });
    var sortLabel = el('label', { class: 'sort-label', 'for': 'shrine-sort' }, 'sort:');
    var sortSelect = el('select', { class: 'sort-select', id: 'shrine-sort' });
    [['default', 'Default'], ['alpha', 'A–Z'], ['newest', 'Newest'], ['oldest', 'Oldest'], ['random', 'Random']].forEach(function (opt) {
      sortSelect.appendChild(el('option', { value: opt[0] }, opt[1]));
    });
    sortSelect.addEventListener('change', function () {
      activeSort = sortSelect.value;
      renderLinks();
    });
    sortBar.appendChild(sortLabel);
    sortBar.appendChild(sortSelect);
    (nav.parentNode.querySelector('.lang-bar') || nav).after(sortBar);

    renderLinks();
  }

  function showError(err) {
    var grid = document.querySelector('.shrine-grid');
    if (grid) {
      grid.appendChild(el('p', { class: 'load-notice' },
        'Error: ' + (err && err.message ? err.message : String(err))
      ));
    }
  }

  function fetchToml(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' (' + path + ')');
      return r.text().then(parse);
    });
  }

  Promise.all([
    fetchToml('filters.toml'),
    fetchToml('languages.toml'),
    fetchToml('links.toml')
  ]).then(function (results) {
    buildList({
      filters:   results[0].filter,
      languages: results[1].language,
      links:     results[2].link
    });
  }).catch(showError);

}());
