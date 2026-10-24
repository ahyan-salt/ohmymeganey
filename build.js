/**
 * 静态构建脚本
 * ------------------------------------------------------------
 * 作用：读取 site.config.json 配置 + posts/ 目录下的 Markdown 文章，
 *       合并生成 js/site-data.js，网页加载该文件后自动渲染。
 *
 * 用法：
 *   node build.js
 *
 * 不装 Node 也能发布：
 *   本仓库带有 .github/workflows/build.yml，往 posts/ 里放入或修改 .md 后，
 *   GitHub 会自动运行本脚本并更新 js/site-data.js，无需在本地运行 node。
 *
 * 文章文件命名规则：
 *   posts/我的文章.md      ->  slug 为 "我的文章"
 *   posts/my-post.md       ->  slug 为 "my-post"，文章地址 post.html?slug=my-post
 *   文件名以 _ 开头的文件会被跳过（可用来放模板）
 *
 * 需要密码上锁的文章不放这里（明文会被看到），请用 editor.html 生成 js/locked-posts.js。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Markdown = require('./js/markdown.js');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const CONFIG_FILE = path.join(ROOT, 'site.config.json');
const OUTPUT_FILE = path.join(ROOT, 'js', 'site-data.js');

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
      excerpt: meta.excerpt || Markdown.makeExcerpt(parsed.body),
      content: Markdown.toHtml(parsed.body)
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
      description: config.description || '',
      music: config.music || ''
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
