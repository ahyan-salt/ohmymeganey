/**
 * 静态构建脚本
 * ------------------------------------------------------------
 * 作用：读取 site.config.json 配置 + posts/ 目录下的 Markdown 文章，
 *       合并生成 js/site-data.js，网页加载该文件后自动渲染。
 *
 * 用法：
 *   node build.js
 *
 * 文章文件命名规则：
 *   posts/我的文章.md      ->  slug 为 "我的文章"
 *   posts/my-post.md       ->  slug 为 "my-post"，文章地址 post.html?slug=my-post
 *   文件名以 _ 开头的文件会被跳过（可用来放模板）
 *
 * 支持的 Markdown 语法：
 *   标题 # ~ ######、段落、**粗体**、*斜体*、`行内代码`、
 *   ```代码块```、> 引用、- 无序列表、1. 有序列表、--- 分隔线、
 *   [文字](链接)、![说明](图片地址)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const CONFIG_FILE = path.join(ROOT, 'site.config.json');
const OUTPUT_FILE = path.join(ROOT, 'js', 'site-data.js');

/* ---------------- 工具函数 ---------------- */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* 单个换行：中英文之间按需加空格，中文之间直接相连 */
function joinSoftLines(lines) {
  let out = '';
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim();
    if (i > 0) {
      const prev = out.slice(-1);
      if (!/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(prev) || !/^[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(cur)) {
        out += ' ';
      }
    }
    out += cur;
  }
  return out;
}

/* 行内元素：代码、图片、链接、粗体、斜体 */
function renderInline(text) {
  const codes = [];
  let out = escapeHtml(text);

  out = out.replace(/`([^`]+)`/g, function (m, code) {
    codes.push(code);
    return '\u0000' + (codes.length - 1) + '\u0000';
  });

  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, alt, src) {
    return '<img src="' + src + '" alt="' + alt + '">';
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, label, href) {
    const external = /^https?:\/\//i.test(href);
    return '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  out = out.replace(/\u0000(\d+)\u0000/g, function (m, idx) {
    return '<code>' + codes[Number(idx)] + '</code>';
  });

  return out;
}

const RE_BLANK = /^\s*$/;
const RE_FENCE = /^\s*```/;
const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_QUOTE = /^\s*>\s?(.*)$/;
const RE_UL = /^\s*[-*+]\s+(.*)$/;
const RE_OL = /^\s*\d+[.)]\s+(.*)$/;
const RE_HR = /^\s*(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;

function isBlockStart(line) {
  return RE_BLANK.test(line) || RE_FENCE.test(line) || RE_HEADING.test(line) ||
    RE_QUOTE.test(line) || RE_UL.test(line) || RE_OL.test(line) || RE_HR.test(line);
}

/* 块级元素 */
function markdownToHtml(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (RE_BLANK.test(line)) { i++; continue; }

    /* 代码块 */
    if (RE_FENCE.test(line)) {
      const lang = line.replace(/^\s*```/, '').trim();
      const buf = [];
      i++;
      while (i < lines.length && !RE_FENCE.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      html.push('<pre><code' + (lang ? ' class="lang-' + escapeHtml(lang) + '"' : '') + '>' +
        escapeHtml(buf.join('\n')) + '</code></pre>');
      continue;
    }

    /* 分隔线 */
    if (RE_HR.test(line)) { html.push('<hr>'); i++; continue; }

    /* 标题：# 对应正文里的 h2，依次递增 */
    const heading = RE_HEADING.exec(line);
    if (heading) {
      const level = Math.min(2 + heading[1].length - 1, 6);
      html.push('<h' + level + '>' + renderInline(heading[2].trim()) + '</h' + level + '>');
      i++;
      continue;
    }

    /* 引用 */
    if (RE_QUOTE.test(line)) {
      const buf = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        buf.push(RE_QUOTE.exec(lines[i])[1]);
        i++;
      }
      html.push('<blockquote>' + markdownToHtml(buf.join('\n')) + '</blockquote>');
      continue;
    }

    /* 无序列表 */
    if (RE_UL.test(line)) {
      const items = [];
      while (i < lines.length && RE_UL.test(lines[i])) {
        items.push('<li>' + renderInline(RE_UL.exec(lines[i])[1].trim()) + '</li>');
        i++;
      }
      html.push('<ul>' + items.join('') + '</ul>');
      continue;
    }

    /* 有序列表 */
    if (RE_OL.test(line)) {
      const items = [];
      while (i < lines.length && RE_OL.test(lines[i])) {
        items.push('<li>' + renderInline(RE_OL.exec(lines[i])[1].trim()) + '</li>');
        i++;
      }
      html.push('<ol>' + items.join('') + '</ol>');
      continue;
    }

    /* 段落 */
    const buf = [line];
    i++;
    while (i < lines.length && !isBlockStart(lines[i])) { buf.push(lines[i]); i++; }
    html.push('<p>' + renderInline(joinSoftLines(buf)) + '</p>');
  }

  return html.join('\n');
}

/* ---------------- 文章解析 ---------------- */

/* 解析文件头部的元信息：
 * ---
 * title: 标题
 * category: original
 * tags: [短篇, 城市]
 * date: 2026-10-01
 * excerpt: 摘要（可省略，省略时自动取正文开头）
 * ---
 */
function parseFrontMatter(raw) {
  const text = String(raw).replace(/^\uFEFF/, '');
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text);
  if (!match) return { data: {}, body: text };

  const data = {};
  match[1].split('\n').forEach(function (row) {
    const kv = /^([A-Za-z_][\w-]*)\s*[:：]\s*(.*)$/.exec(row.trim());
    if (!kv) return;
    const key = kv[1];
    let value = kv[2].trim().replace(/^["']|["']$/g, '');
    if (key === 'tags') {
      data.tags = value.replace(/^\[|\]$/g, '').split(/[,，]/)
        .map(function (t) { return t.trim().replace(/^["']|["']$/g, ''); })
        .filter(Boolean);
      return;
    }
    data[key] = value;
  });

  return { data, body: text.slice(match[0].length) };
}

function plainText(markdown) {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[->*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeExcerpt(markdown) {
  const text = plainText(markdown);
  return text.length > 100 ? text.slice(0, 100) + '……' : text;
}

function today() {
  const d = new Date();
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function normalizeDate(value, fallback) {
  const m = /(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/.exec(String(value || ''));
  if (!m) return fallback;
  return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
}

function loadPosts(categoryIds) {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR)
    .filter(function (name) { return /\.(md|markdown|txt)$/i.test(name) && !name.startsWith('_'); })
    .sort();

  const posts = [];
  const slugs = {};

  files.forEach(function (name) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, name), 'utf8');
    const parsed = parseFrontMatter(raw);
    const meta = parsed.data;
    const slug = (meta.slug || name.replace(/\.[^.]+$/, '')).trim();

    if (slugs[slug]) {
      console.warn('  ! 跳过重复的 slug「' + slug + '」（' + name + ' 与 ' + slugs[slug] + ' 冲突）');
      return;
    }
    slugs[slug] = name;

    const category = (meta.category || '').trim();
    if (!category) {
      console.warn('  ! ' + name + ' 缺少 category 字段，已跳过');
      return;
    }
    if (categoryIds.indexOf(category) < 0) {
      console.warn('  ! ' + name + ' 的 category「' + category + '」不在 site.config.json 里，已跳过');
      return;
    }
    if (!meta.title) {
      console.warn('  ! ' + name + ' 缺少 title 字段，已跳过');
      return;
    }

    posts.push({
      slug: slug,
      title: meta.title,
      category: category,
      tags: meta.tags || [],
      date: normalizeDate(meta.date, today()),
      excerpt: meta.excerpt || makeExcerpt(parsed.body),
      content: markdownToHtml(parsed.body)
    });
  });

  posts.sort(function (a, b) { return b.date.localeCompare(a.date); });
  return posts;
}

/* ---------------- 生成输出 ---------------- */

function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

  const categories = (config.categories || []).map(function (c) {
    return { id: c.id, name: c.name, desc: c.desc || '' };
  });
  const categoryIds = categories.map(function (c) { return c.id; });

  const posts = loadPosts(categoryIds);

  const lines = [
    '/*',
    ' * 本文件由 build.js 自动生成，请勿手动编辑。',
    ' * 新增或修改文章：编辑 posts/ 目录下的 Markdown 文件，然后运行 node build.js',
    ' */',
    '',
    'const SITE_INFO = ' + JSON.stringify({
      name: config.name || '',
      title: config.title || '',
      description: config.description || ''
    }, null, 2) + ';',
    '',
    'const SITE_CATEGORIES = ' + JSON.stringify(categories, null, 2) + ';',
    '',
    'const SITE_POSTS = [' + (posts.length ? '\n' + posts.map(function (p) {
      return '  ' + JSON.stringify(p, null, 2).split('\n').join('\n  ');
    }).join(',\n') + '\n' : '') + '];',
    ''
  ];

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8');

  console.log('构建完成：' + posts.length + ' 篇文章 -> ' + path.relative(ROOT, OUTPUT_FILE));
}

main();
