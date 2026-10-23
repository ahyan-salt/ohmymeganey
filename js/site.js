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
    var host = document.querySelector('[data-nav]');
    if (!host) return;
    var current = document.body.getAttribute('data-nav') || '';
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
