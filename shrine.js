/* shrine.js - SpiritVale Link Shrine */
import { parse } from 'https://esm.sh/smol-toml';

(function () {
  'use strict';

  var activeFeature = 'all';
  var featureMembers = {}; // group tag -> member tags, from filters.toml
  var activeLangs = ['en', 'global'];
  var activeSort = 'default';

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

  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function makeGithubIcon(href) {
    var a = el('a', {
      class: 'link-github-icon',
      href: href,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: 'Open source - view on GitHub',
      'aria-label': 'open source'
    });
    var svg = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
    var path = svgEl('path', { d: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' });
    svg.appendChild(path);
    a.appendChild(svg);
    return a;
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
      'data-lang': langs.join(' ')
    });

    li.appendChild(el('a', {
      class: 'link-title',
      href: link.url,
      target: '_blank',
      rel: 'noopener noreferrer'
    }, link.title));

    var flagSpan = el('span', { class: 'link-lang' });
    langs.forEach(function (code) {
      var meta = langMeta && langMeta[code];
      if (meta && meta.flag) {
        flagSpan.appendChild(el('span', { class: 'link-lang-flag', title: meta.name || meta.label }, meta.flag));
      }
    });
    li.appendChild(flagSpan);

    if (link.trending) {
      li.appendChild(el('span', { class: 'link-fire', title: 'Trending on Discord', 'aria-label': 'trending' }, '🔥'));
    }

    if (link.github) {
      li.appendChild(makeGithubIcon(link.github));
    }

    if (link.ads) {
      li.appendChild(el('span', { class: 'link-ads', title: 'Contains ads', 'aria-label': 'contains ads' }, '🪧'));
    }

    if (link.author && link.author.toLowerCase() !== link.title.toLowerCase()) {
      li.appendChild(el('span', { class: 'link-author' }, 'by ' + link.author));
    }

    var badgeGroup = el('span', { class: 'badge-group' });
    tags.forEach(function (tag) {
      var label = (tagLabels && tagLabels[tag]) || tag;
      badgeGroup.appendChild(makeBadge(tag, label, null));
    });


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
    Array.from(rows).forEach(function (row) {
      row.classList.remove('visible-last');
      var tags = row.getAttribute('data-tags') || '';
      var langs = row.getAttribute('data-lang') || '';

      var wanted = featureMembers[activeFeature] || [activeFeature];
      var featureOk = activeFeature === 'all' ||
        tags.split(' ').some(function (t) { return wanted.indexOf(t) !== -1; });

      var langOk = activeLangs.length > 0 &&
        langs.split(' ').some(function (l) { return activeLangs.indexOf(l) !== -1; });

      var isVisible = featureOk && langOk;
      row.classList.toggle('hidden', !isVisible);
      if (isVisible) lastVisible = row;
    });
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
      return (l.trending ? 100 : 0) +
        (l.github ? 1 : 0) +
        (l.ads ? -1 : 0);
    }

    var tagOrder = ['databases', 'builds', 'simulators', 'maps', 'markets', 'social', 'news'];
    function primaryTagRank(l) {
      if (!l.tags) return tagOrder.length;
      var best = tagOrder.length;
      l.tags.forEach(function (t) {
        var i = tagOrder.indexOf(t);
        if (i !== -1 && i < best) best = i;
      });
      return best;
    }

    allLinks.sort(function (a, b) {
      var diff = linkScore(b) - linkScore(a);
      if (diff !== 0) return diff;
      var tagDiff = primaryTagRank(a) - primaryTagRank(b);
      if (tagDiff !== 0) return tagDiff;
      return a.title.localeCompare(b.title);
    });

    var tagLabels = {};
    (data.filters || []).forEach(function (f) {
      tagLabels[f.tag] = f.label;
      if (f.tags) featureMembers[f.tag] = f.tags;
    });

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
    var langGroup = el('div', { class: 'lang-group' });

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
        langGroup.appendChild(btn);
      });

      langBar.appendChild(langGroup);
    }

    nav.parentNode.insertBefore(langBar, nav.nextSibling);

    function getSortedLinks() {
      if (activeSort === 'alpha') {
        return allLinks.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });
      }
      if (activeSort === 'newest' || activeSort === 'oldest') {
        var dir = activeSort === 'newest' ? 1 : -1;
        return allLinks.slice().sort(function (a, b) {
          var da = a.created || a.added || '', db = b.created || b.added || '';
          if (!da || !db) return da === db ? 0 : (da ? -1 : 1);
          return da === db ? 0 : da < db ? dir : -dir;
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
