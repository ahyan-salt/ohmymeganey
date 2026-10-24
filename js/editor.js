/**
 * 文章編輯器邏輯
 * ------------------------------------------------------------
 * 純前端：讀取站上已有的分類與文章，寫完直接匯出檔案，
 * 你只要把匯出的檔案上傳到 GitHub 對應位置即可。
 */

(function () {
  'use strict';

  var DRAFT_KEY = 'rszs-locked-drafts';

  var el = {
    title: document.getElementById('f-title'),
    cat: document.getElementById('f-cat'),
    date: document.getElementById('f-date'),
    slug: document.getElementById('f-slug'),
    tags: document.getElementById('f-tags'),
    excerpt: document.getElementById('f-excerpt'),
    lock: document.getElementById('f-lock'),
    body: document.getElementById('f-body'),
    pvTitle: document.querySelector('[data-pv-title]'),
    pvMeta: document.querySelector('[data-pv-meta]'),
    pvBody: document.querySelector('[data-pv-body]'),
    status: document.querySelector('[data-status]'),
    lockedList: document.querySelector('[data-locked-list]'),
    lockedCount: document.querySelector('[data-locked-count]'),
    publicList: document.querySelector('[data-public-list]')
  };

  var categories = (typeof SITE_CATEGORIES !== 'undefined' && SITE_CATEGORIES) || [];
  var publicPosts = (typeof SITE_POSTS !== 'undefined' && SITE_POSTS) || [];
  var locked = loadLocked();

  /* ---------------- 工具 ---------------- */

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function today() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function setStatus(text, isError) {
    el.status.textContent = text || '';
    el.status.classList.toggle('is-error', !!isError);
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------------- 鎖定列表存檔 ---------------- */

  function loadLocked() {
    try {
      var saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        var list = JSON.parse(saved);
        if (Array.isArray(list)) return list;
      }
    } catch (e) { /* 忽略 */ }
    return ((typeof window.LOCKED_POSTS !== 'undefined' && window.LOCKED_POSTS) || []).slice();
  }

  function saveLocked() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(locked)); } catch (e) { /* 忽略 */ }
  }

  function indexOfSlug(slug) {
    for (var i = 0; i < locked.length; i++) {
      if (locked[i].slug === slug) return i;
    }
    return -1;
  }

  function uniqueSlug(base) {
    var taken = {};
    publicPosts.forEach(function (p) { taken[p.slug] = true; });
    locked.forEach(function (p) { taken[p.slug] = true; });
    if (!taken[base]) return base;
    var n = 2;
    while (taken[base + '-' + n]) n++;
    return base + '-' + n;
  }

  /* ---------------- 表單 ---------------- */

  function readForm() {
    return {
      title: el.title.value.trim(),
      category: el.cat.value,
      date: el.date.value || today(),
      slug: el.slug.value.trim(),
      tags: el.tags.value.split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean),
      excerpt: el.excerpt.value.trim(),
      password: el.lock.value,
      body: el.body.value
    };
  }

  function baseSlug(form) {
    if (form.slug) return form.slug;
    var parts = form.date.split('-');
    var short = parts.length === 3 ? parts[0].slice(2) + parts[1] + parts[2] : form.date.replace(/-/g, '');
    return form.category + '-' + short;
  }

  function updatePreview() {
    var form = readForm();
    el.pvTitle.textContent = form.title || '（未填標題）';
    var cat = null;
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === form.category) { cat = categories[i]; break; }
    }
    el.pvMeta.textContent = form.date + ' · ' + (cat ? cat.name : form.category) +
      (form.password ? ' · 已上鎖' : '');
    el.pvBody.innerHTML = window.Markdown ? Markdown.toHtml(form.body) : '';
  }

  function clearForm() {
    el.title.value = '';
    el.slug.value = '';
    el.tags.value = '';
    el.excerpt.value = '';
    el.lock.value = '';
    el.body.value = '';
    el.date.value = today();
    updatePreview();
    setStatus('已清空表單。');
  }

  /* 匯出公開文章：產生可放進 posts/ 的 Markdown */
  function exportMarkdown() {
    var form = readForm();
    if (!form.title) return setStatus('請先填標題。', true);
    if (!form.body.trim()) return setStatus('正文還是空的。', true);
    if (form.password) {
      return setStatus('你填了密碼，請改用「加密並加入鎖定列表」，公開 .md 會把正文寫成明文。', true);
    }

    var slug = uniqueSlug(baseSlug(form));
    var lines = ['---'];
    lines.push('title: ' + form.title.replace(/\n/g, ' '));
    lines.push('category: ' + form.category);
    lines.push('tags: [' + form.tags.join(', ') + ']');
    lines.push('date: ' + form.date);
    if (form.excerpt) lines.push('excerpt: ' + form.excerpt.replace(/\n/g, ' '));
    lines.push('slug: ' + slug);
    lines.push('---', '');
    lines.push(form.body.replace(/\s+$/, ''), '');

    el.slug.value = slug;
    download(slug + '.md', lines.join('\n'));
    setStatus('已下載 ' + slug + '.md，把它上傳到 posts/ 目錄（GitHub 會自動重新建置）。');
  }

  /* 加密並加入鎖定列表 */
  function lockPost() {
    var form = readForm();
    if (!form.title) return setStatus('請先填標題。', true);
    if (!form.password) return setStatus('請在「密碼」欄填一個密碼。', true);
    if (!form.body.trim()) return setStatus('正文還是空的。', true);
    if (!window.Lock || !Lock.supported()) {
      return setStatus('當前環境不支援加密，請用 https 或 localhost 開啟本頁面。', true);
    }

    var base = baseSlug(form);
    var existing = indexOfSlug(base);
    var slug = existing >= 0 ? base : uniqueSlug(base);
    var excerpt = form.excerpt || '（已加密，輸入密碼後閱讀）';

    setStatus('正在加密…');
    Lock.encrypt(form.password, form.body).then(function (enc) {
      var entry = {
        slug: slug,
        title: form.title,
        category: form.category,
        tags: form.tags,
        date: form.date,
        excerpt: excerpt,
        locked: true,
        enc: enc
      };
      if (existing >= 0) locked[existing] = entry; else locked.push(entry);
      saveLocked();
      renderLockedList();
      el.slug.value = slug;
      setStatus('已加密並加入列表（slug：' + slug + '）。記得到上面點「下載 locked-posts.js」覆蓋到專案裡。');
    }).catch(function (err) {
      setStatus('加密失敗：' + (err && err.message ? err.message : err), true);
    });
  }

  /* ---------------- 匯出鎖定列表 ---------------- */

  function buildLockedFile() {
    return '/**\n' +
      ' * 加密（密碼上鎖）的文章列表\n' +
      ' * ------------------------------------------------------------\n' +
      ' * 本文件由 editor.html 生成，請勿手動編輯。\n' +
      ' * 正文以密文保存，沒有密碼看不到內容。\n' +
      ' */\n\n' +
      'window.LOCKED_POSTS = ' + JSON.stringify(locked, null, 2) + ';\n';
  }

  function exportLockedFile() {
    download('locked-posts.js', buildLockedFile());
    setStatus('已下載 locked-posts.js，請用它覆蓋 js/locked-posts.js。');
  }

  function copyLockedFile() {
    var text = buildLockedFile();
    function done() { setStatus('已複製 locked-posts.js 的內容，貼到 js/locked-posts.js 即可。'); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { setStatus('複製失敗，請改用「下載」。', true); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---------------- 列表渲染 ---------------- */

  function renderLockedList() {
    el.lockedCount.textContent = locked.length ? '（' + locked.length + ' 篇）' : '（空）';
    if (!locked.length) {
      el.lockedList.innerHTML = '<p class="editor-hint">還沒有上鎖的文章。填好標題、正文和密碼，點「加密並加入鎖定列表」。</p>';
      return;
    }
    el.lockedList.innerHTML = locked.map(function (post, index) {
      return '<div class="editor-item">' +
        '<div class="editor-item-main">' +
          '<p class="editor-item-title">' + escapeHtml(post.title) + '</p>' +
          '<p class="editor-item-meta">' + escapeHtml(post.date) + ' · ' +
            escapeHtml(post.category) + ' · ' + escapeHtml(post.slug) + '</p>' +
        '</div>' +
        '<div class="editor-item-acts">' +
          '<button type="button" class="btn btn-small" data-load="' + index + '">載入</button>' +
          '<button type="button" class="btn btn-small btn-ghost" data-del="' + index + '">刪除</button>' +
        '</div>' +
      '</div>';
    }).join('');

    el.lockedList.querySelectorAll('[data-load]').forEach(function (btn) {
      btn.addEventListener('click', function () { loadEntry(locked[Number(btn.getAttribute('data-load'))]); });
    });
    el.lockedList.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () { removeEntry(Number(btn.getAttribute('data-del'))); });
    });
  }

  function loadEntry(entry) {
    if (!entry) return;
    var password = window.prompt('請輸入這篇文章的密碼，才能載入正文進行編輯');
    if (!password) return;

    setStatus('正在解密…');
    Lock.decrypt(password, entry.enc).then(function (markdown) {
      el.title.value = entry.title;
      el.cat.value = entry.category;
      el.date.value = entry.date;
      el.slug.value = entry.slug;
      el.tags.value = (entry.tags || []).join(', ');
      el.excerpt.value = entry.excerpt === '（已加密，輸入密碼後閱讀）' ? '' : (entry.excerpt || '');
      el.lock.value = password;
      el.body.value = markdown;
      updatePreview();
      setStatus('已載入「' + entry.title + '」，修改後再點「加密並加入鎖定列表」更新。');
    }).catch(function () {
      setStatus('密碼不對，載入失敗。', true);
    });
  }

  function removeEntry(index) {
    var entry = locked[index];
    if (!entry) return;
    if (!window.confirm('確定要刪除「' + entry.title + '」嗎？')) return;
    locked.splice(index, 1);
    saveLocked();
    renderLockedList();
    setStatus('已刪除，記得重新下載 locked-posts.js。');
  }

  function renderPublicList() {
    if (!publicPosts.length) {
      el.publicList.innerHTML = '<p class="editor-hint">目前沒有公開文章。</p>';
      return;
    }
    el.publicList.innerHTML = publicPosts.map(function (post) {
      return '<div class="editor-item">' +
        '<div class="editor-item-main">' +
          '<p class="editor-item-title">' +
            '<a href="post.html?slug=' + encodeURIComponent(post.slug) + '" target="_blank" rel="noopener">' +
            escapeHtml(post.title) + '</a></p>' +
          '<p class="editor-item-meta">' + escapeHtml(post.date) + ' · ' +
            escapeHtml(post.category) + ' · ' + escapeHtml(post.slug) + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------------- 初始化 ---------------- */

  function init() {
    el.cat.innerHTML = categories.map(function (c) {
      return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + '</option>';
    }).join('');
    el.date.value = today();

    ['input', 'change'].forEach(function (evt) {
      el.title.addEventListener(evt, updatePreview);
      el.cat.addEventListener(evt, updatePreview);
      el.date.addEventListener(evt, updatePreview);
      el.tags.addEventListener(evt, updatePreview);
      el.body.addEventListener(evt, updatePreview);
      el.lock.addEventListener(evt, updatePreview);
    });

    document.querySelector('[data-act-md]').addEventListener('click', exportMarkdown);
    document.querySelector('[data-act-lock]').addEventListener('click', lockPost);
    document.querySelector('[data-act-export]').addEventListener('click', exportLockedFile);
    document.querySelector('[data-act-copy]').addEventListener('click', copyLockedFile);
    document.querySelector('[data-act-clear]').addEventListener('click', clearForm);

    if (!window.Lock || !Lock.supported()) {
      setStatus('提示：當前環境不支援加密（請用 https 或 localhost 開啟），上鎖功能將無法使用。', true);
    } else if (locked.length) {
      setStatus('已從瀏覽器草稿載入 ' + locked.length + ' 篇上鎖文章。');
    }

    renderLockedList();
    renderPublicList();
    updatePreview();
  }

  init();
})();
