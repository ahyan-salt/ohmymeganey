/**
 * 站点公共脚本：负责渲染左侧导航、词条云、文章列表与文章正文。
 * 页面通过在 <body> 上设置 data-page 来告诉脚本当前是哪个页面。
 */

(function () {
  'use strict';

  var NAV_ITEMS = [
    { id: 'original', label: '登基（原创）', href: 'list.html?cat=original' },
    { id: 'fanfic', label: '求雨（同人）', href: 'list.html?cat=fanfic' },
    { id: 'blog', label: '火锅烧烤（博客）', href: 'list.html?cat=blog' },
    { id: 'about', label: '关于我', href: 'about.html' },
    { id: 'contact', label: '联系我', href: 'contact.html' }
  ];

  var REDUCED_MOTION = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function categoryOf(id) {
    for (var i = 0; i < SITE_CATEGORIES.length; i++) {
      if (SITE_CATEGORIES[i].id === id) return SITE_CATEGORIES[i];
    }
    return { id: id, name: id, desc: '' };
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function postsSorted() {
    return SITE_POSTS.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });
  }

  function collectTags() {
    var map = {};
    SITE_POSTS.forEach(function (post) {
      (post.tags || []).forEach(function (tag) {
        map[tag] = (map[tag] || 0) + 1;
      });
    });
    var list = Object.keys(map).map(function (tag) {
      return { tag: tag, count: map[tag] };
    });
    list.sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag, 'zh-Hans-CN');
    });
    return list;
  }

  function tagHref(tag) {
    return 'list.html?tag=' + encodeURIComponent(tag);
  }

  function categoryHref(id) {
    return 'list.html?cat=' + encodeURIComponent(id);
  }

  /* ---------- 左侧竖排导航 ---------- */

  function renderNav() {
    var host = document.querySelector('.sidebar-nav');
    if (!host) return;
    var current = document.body.getAttribute('data-nav-active') || '';
    if (document.body.getAttribute('data-page') === 'list') {
      var catParam = new URLSearchParams(window.location.search).get('cat');
      if (catParam) current = catParam;
    }
    var html = NAV_ITEMS.map(function (item) {
      var active = item.id === current ? ' class="is-active"' : '';
      return '<li><a href="' + item.href + '"' + active + '>' + item.label + '</a></li>';
    }).join('');
    host.innerHTML = html;

    var siteName = document.querySelectorAll('[data-site-name]');
    for (var i = 0; i < siteName.length; i++) {
      siteName[i].textContent = SITE_INFO.name;
    }
    var siteDesc = document.querySelectorAll('[data-site-desc]');
    for (var j = 0; j < siteDesc.length; j++) {
      siteDesc[j].textContent = SITE_INFO.description;
    }
    var year = document.querySelectorAll('[data-year]');
    for (var k = 0; k < year.length; k++) {
      year[k].textContent = new Date().getFullYear();
    }
  }

  /* ---------- 首页词条云 ---------- */

  var cloudState = [];      /* 每个词条：基准位置 + 当前位移 + 速度 */
  var cloudRaf = 0;         /* 动画帧句柄 */

  function renderTagCloud() {
    var host = document.querySelector('[data-tag-cloud]');
    if (!host) return;
    var tags = collectTags();
    if (!tags.length) {
      host.innerHTML = '<p class="empty">还没有标签，去写第一篇文章吧。</p>';
      return;
    }
    var max = tags[0].count;
    var min = tags[tags.length - 1].count;
    host.innerHTML = tags.map(function (item) {
      var ratio = max === min ? 0.5 : (item.count - min) / (max - min);
      var size = 1 + ratio * 1.4;          /* 1.0rem ~ 2.4rem */
      var weight = ratio > 0.55 ? 600 : 400;
      var shade = Math.round(45 + (1 - ratio) * 40); /* 深灰 -> 浅灰 */
      return '<a class="cloud-item" href="' + tagHref(item.tag) + '"' +
        ' style="font-size:' + size.toFixed(2) + 'rem;font-weight:' + weight +
        ';color:rgb(' + shade + ',' + shade + ',' + shade + ')"' +
        ' title="' + escapeHtml(item.tag) + '：' + item.count + ' 篇">' +
        escapeHtml(item.tag) + '<span class="cloud-count">' + item.count + '</span></a>';
    }).join('');

    /* 大字先放，更容易排出不重叠的散乱布局 */
    var els = [].slice.call(host.querySelectorAll('.cloud-item'));
    els.sort(function (a, b) {
      return b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight;
    });
    els.forEach(function (el) {
      /* 字号越大（1.0rem ~ 2.4rem），保留的弹开力度越大 */
      var rem = parseFloat(el.style.fontSize) || 1;
      cloudState.push({
        el: el,
        w: el.offsetWidth || 40,
        h: el.offsetHeight || 24,
        sizeRatio: Math.max(0, Math.min(1, (rem - 1) / 1.4)),
        bx: 0, by: 0,
        ox: 0, oy: 0, vx: 0, vy: 0,
        scale: 1,
        hovered: false,
        phase: Math.random() * Math.PI * 2
      });
    });

    layoutCloud(host);
    if (!REDUCED_MOTION) startCloudMotion(host);

    var timer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { layoutCloud(host); }, 150);
    });
  }

  /* 把词条随机撒在容器里，尽量互不重叠，靠中间更密一些 */
  function layoutCloud(host) {
    if (!cloudState.length) return;
    var items = cloudState.slice().sort(function (a, b) {
      return b.w * b.h - a.w * a.h;
    });
    var width = host.clientWidth || 640;
    var GAP = 12;        /* 词条之间的最小留白 */
    var PAD_X = 34;      /* 左右留白：给弹开留出空间 */
    var PAD_Y = 8;
    var area = 0;
    items.forEach(function (it) { area += (it.w + GAP) * (it.h + GAP); });
    var height = Math.max(300, Math.round(area / width * 1.9) + 60);
    var placed = null;

    for (var n = 0; n < 24 && !placed; n++) {
      placed = tryPlace(items, width, height, PAD_X, PAD_Y, GAP, false);
      if (!placed) height = Math.round(height * 1.12) + 12;
    }
    if (!placed) placed = tryPlace(items, width, height, PAD_X, PAD_Y, -8, true); /* 兜底：允许轻微重叠 */

    var bottom = 0;
    placed.forEach(function (p) {
      p.item.bx = p.x;
      p.item.by = p.y;
      p.item.ox = 0;
      p.item.oy = 0;
      p.item.vx = 0;
      p.item.vy = 0;
      p.item.el.style.left = p.x + 'px';
      p.item.el.style.top = p.y + 'px';
      p.item.el.style.transform = 'translate3d(0,0,0)';
      bottom = Math.max(bottom, p.y + p.item.h);
    });

    host.classList.add('is-cloud');
    host.style.height = Math.max(300, Math.round(bottom + 40)) + 'px';  /* 留出弹开的空间 */
  }

  /* 返回每个词条的位置；force 为 false 时只要有重叠就返回 null */
  function tryPlace(items, width, height, padX, padY, gap, force) {
    var placed = [];
    var ok = true;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var maxX = Math.max(padX, width - item.w - padX);
      var maxY = Math.max(padY, height - item.h - padY);
      var best = null;
      var bestCost = Infinity;

      for (var n = 0; n < 220; n++) {
        /* 两次随机取平均，让分布向中间聚拢，看起来更像一朵云 */
        var rx = (Math.random() + Math.random()) / 2;
        var ry = (Math.random() + Math.random()) / 2;
        var x = padX + rx * (maxX - padX);
        var y = padY + ry * (maxY - padY);
        var cost = 0;

        for (var k = 0; k < placed.length; k++) {
          var p = placed[k];
          var ow = Math.min(x + item.w, p.x + p.w) - Math.max(x, p.x) + gap;
          var oh = Math.min(y + item.h, p.y + p.h) - Math.max(y, p.y) + gap;
          if (ow > 0 && oh > 0) cost += ow * oh;
        }

        if (cost === 0) { best = { x: x, y: y }; bestCost = 0; break; }
        if (cost < bestCost) { bestCost = cost; best = { x: x, y: y }; }
      }

      if (bestCost > 0) ok = false;
      best.w = item.w;
      best.h = item.h;
      best.item = item;
      placed.push(best);
    }

    return (ok || force) ? placed : null;
  }

  /* 悬浮：轻微上下浮动；指针划过时把附近词条弹开（字号越小弹得越少）；
     指针静止时，正对的词条放大并吸附到指针附近 */
  function startCloudMotion(host) {
    if (cloudRaf) return;

    var RADIUS = 82;          /* 指针影响半径 */
    var PUSH = 30;            /* 最大弹开距离（字号最大的词条） */
    var MIN_PUSH_RATIO = 0.35;/* 最小字号保留的弹开比例 */
    var STILL_MS = 140;       /* 指针静止多久算"停住" */
    var HOVER_SCALE = 1.08;      /* 正对时放大的倍数 */
    var pointer = { x: -9999, y: -9999, lx: -9999, ly: -9999, active: false, still: 0 };

    host.addEventListener('pointermove', function (e) {
      var rect = host.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });
    host.addEventListener('pointerleave', function () {
      pointer.active = false;
      pointer.still = 0;
    });

    cloudState.forEach(function (item) {
      item.el.addEventListener('pointerenter', function () {
        item.hovered = true;
        item.el.style.zIndex = 10;
      });
      item.el.addEventListener('pointerleave', function () {
        item.hovered = false;
        item.el.style.zIndex = '';
      });
    });

    var last = 0;
    function frame(now) {
      var dt = last ? Math.min((now - last) / 16.7, 3) : 1;
      last = now;

      if (pointer.active) {
        var steady = Math.abs(pointer.x - pointer.lx) < 1.5 && Math.abs(pointer.y - pointer.ly) < 1.5;
        pointer.still = steady ? pointer.still + dt * 16.7 : 0;
        pointer.lx = pointer.x;
        pointer.ly = pointer.y;
      }

      cloudState.forEach(function (item) {
        var tx = Math.sin(now * 0.0007 + item.phase) * 3.2;   /* 浮动目标位移 */
        var ty = Math.cos(now * 0.0009 + item.phase * 1.7) * 3.2;

        /* 被指针正对的词条：停住时吸过去 */
        if (item.hovered && pointer.active && pointer.still > STILL_MS) {
          tx = (pointer.x - item.w / 2) - item.bx;
          ty = (pointer.y - item.h / 2) - item.by;
        } else if (pointer.active) {
          /* 其他词条：按字号大小决定被推开多远 */
          var cx = item.bx + item.ox + item.w / 2;
          var cy = item.by + item.oy + item.h / 2;
          var dx = cx - pointer.x;
          var dy = cy - pointer.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (dist < RADIUS) {
            var push = (1 - dist / RADIUS) * PUSH * (MIN_PUSH_RATIO + (1 - MIN_PUSH_RATIO) * item.sizeRatio);
            tx += dx / dist * push;
            ty += dy / dist * push;
          }
        }

        item.vx += (tx - item.ox) * 0.08 * dt;
        item.vy += (ty - item.oy) * 0.08 * dt;
        var damp = Math.pow(0.88, dt);
        item.vx *= damp;
        item.vy *= damp;
        item.ox += item.vx * dt;
        item.oy += item.vy * dt;

        var wantScale = item.hovered ? HOVER_SCALE : 1;
        item.scale += (wantScale - item.scale) * 0.12 * dt;

        item.el.style.transform = 'translate3d(' + item.ox.toFixed(2) + 'px,' +
          item.oy.toFixed(2) + 'px,0) scale(' + item.scale.toFixed(3) + ')';
      });

      cloudRaf = window.requestAnimationFrame(frame);
    }

    cloudRaf = window.requestAnimationFrame(frame);
  }

  /* ---------- 列表页 ---------- */

  function postCard(post) {
    var cat = categoryOf(post.category);
    var tags = (post.tags || []).map(function (tag) {
      return '<a class="tag" href="' + tagHref(tag) + '">#' + escapeHtml(tag) + '</a>';
    }).join(' ');
    return '<article class="post-card">' +
      '<h2 class="post-card-title"><a href="post.html?slug=' + encodeURIComponent(post.slug) + '">' +
        escapeHtml(post.title) + '</a></h2>' +
      '<p class="post-meta">' + escapeHtml(post.date) + ' · ' +
        '<a href="' + categoryHref(cat.id) + '">' + escapeHtml(cat.name) + '</a></p>' +
      '<p class="post-excerpt">' + escapeHtml(post.excerpt || '') + '</p>' +
      (tags ? '<p class="post-tags">' + tags + '</p>' : '') +
      '</article>';
  }

  function renderList() {
    var host = document.querySelector('[data-post-list]');
    if (!host) return;
    var params = new URLSearchParams(window.location.search);
    var cat = params.get('cat');
    var tag = params.get('tag');
    var title = '全部文章';
    var desc = '';
    var posts = postsSorted();

    if (tag) {
      title = '标签：' + tag;
      desc = '以下是带有该标签的全部文章。';
      posts = posts.filter(function (p) { return (p.tags || []).indexOf(tag) >= 0; });
    } else if (cat) {
      var c = categoryOf(cat);
      title = c.name;
      desc = c.desc || '';
      posts = posts.filter(function (p) { return p.category === cat; });
    }

    var titleEl = document.querySelector('[data-list-title]');
    if (titleEl) titleEl.textContent = title;
    var descEl = document.querySelector('[data-list-desc]');
    if (descEl) descEl.textContent = desc;

    var head = document.querySelector('[data-list-head]');
    if (head) {
      head.innerHTML = '共 ' + posts.length + ' 篇' +
        (tag || cat ? ' · <a href="list.html">查看全部文章</a>' : '');
    }

    if (!posts.length) {
      host.innerHTML = '<p class="empty">这里还没有文章。</p>';
      return;
    }
    host.innerHTML = posts.map(postCard).join('');
  }

  /* ---------- 文章详情页 ---------- */

  function renderPost() {
    var host = document.querySelector('[data-post]');
    if (!host) return;
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');
    var post = null;
    for (var i = 0; i < SITE_POSTS.length; i++) {
      if (SITE_POSTS[i].slug === slug) { post = SITE_POSTS[i]; break; }
    }
    if (!post) {
      host.innerHTML = '<h1>文章不存在</h1><p class="empty">链接可能已经失效，' +
        '<a href="index.html">回到首页</a>。</p>';
      return;
    }
    var cat = categoryOf(post.category);
    document.title = post.title + ' · ' + SITE_INFO.name;
    var tags = (post.tags || []).map(function (tag) {
      return '<a class="tag" href="' + tagHref(tag) + '">#' + escapeHtml(tag) + '</a>';
    }).join(' ');
    host.innerHTML =
      '<h1 class="article-title">' + escapeHtml(post.title) + '</h1>' +
      '<p class="post-meta">' + escapeHtml(post.date) + ' · ' +
        '<a href="' + categoryHref(cat.id) + '">' + escapeHtml(cat.name) + '</a></p>' +
      '<div class="article-body">' + (post.content || '') + '</div>' +
      (tags ? '<p class="post-tags">' + tags + '</p>' : '') +
      '<p class="article-back"><a href="' + categoryHref(cat.id) + '">← 返回' +
        escapeHtml(cat.name) + '</a></p>';
  }

  /* ---------- 初始化 ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    document.title = document.title || SITE_INFO.title;
    renderNav();
    renderTagCloud();
    renderList();
    renderPost();
  });
})();
