/**
 * 共用的 Markdown 渲染器
 * ------------------------------------------------------------
 * build.js（Node）用它把 Markdown 变成文章正文；
 * editor.html（浏览器）用它做实时预览。两边共用同一份代码，保证所见即所得。
 *
 * 支持的语法：
 *   标题 # ~ ######、段落、**粗体**、*斜体*、`行内代码`、
 *   ```代码块```、> 引用、- 无序列表、1. 有序列表、--- 分隔线、
 *   [文字](链接)、![说明](图片地址)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Markdown = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* 单个换行：中英文之间按需加空格，中文之间直接相连 */
  function joinSoftLines(lines) {
    var out = '';
    for (var i = 0; i < lines.length; i++) {
      var cur = lines[i].trim();
      if (i > 0) {
        var prev = out.slice(-1);
        if (!/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(prev) ||
            !/^[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(cur)) {
          out += ' ';
        }
      }
      out += cur;
    }
    return out;
  }

  /* 行内元素：代码、图片、链接、粗体、斜体 */
  function renderInline(text) {
    var codes = [];
    var out = escapeHtml(text);

    out = out.replace(/`([^`]+)`/g, function (m, code) {
      codes.push(code);
      return '\u0000' + (codes.length - 1) + '\u0000';
    });

    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, alt, src) {
      return '<img src="' + src + '" alt="' + alt + '">';
    });

    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, label, href) {
      var external = /^https?:\/\//i.test(href);
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

  var RE_BLANK = /^\s*$/;
  var RE_FENCE = /^\s*```/;
  var RE_HEADING = /^(#{1,6})\s+(.*)$/;
  var RE_QUOTE = /^\s*>\s?(.*)$/;
  var RE_UL = /^\s*[-*+]\s+(.*)$/;
  var RE_OL = /^\s*\d+[.)]\s+(.*)$/;
  var RE_HR = /^\s*(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;

  function isBlockStart(line) {
    return RE_BLANK.test(line) || RE_FENCE.test(line) || RE_HEADING.test(line) ||
      RE_QUOTE.test(line) || RE_UL.test(line) || RE_OL.test(line) || RE_HR.test(line);
  }

  /* 块级元素 */
  function markdownToHtml(markdown) {
    var lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (RE_BLANK.test(line)) { i++; continue; }

      /* 代码块 */
      if (RE_FENCE.test(line)) {
        var lang = line.replace(/^\s*```/, '').trim();
        var buf = [];
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
      var heading = RE_HEADING.exec(line);
      if (heading) {
        var level = Math.min(2 + heading[1].length - 1, 6);
        html.push('<h' + level + '>' + renderInline(heading[2].trim()) + '</h' + level + '>');
        i++;
        continue;
      }

      /* 引用 */
      if (RE_QUOTE.test(line)) {
        var quote = [];
        while (i < lines.length && RE_QUOTE.test(lines[i])) {
          quote.push(RE_QUOTE.exec(lines[i])[1]);
          i++;
        }
        html.push('<blockquote>' + markdownToHtml(quote.join('\n')) + '</blockquote>');
        continue;
      }

      /* 无序列表 */
      if (RE_UL.test(line)) {
        var ul = [];
        while (i < lines.length && RE_UL.test(lines[i])) {
          ul.push('<li>' + renderInline(RE_UL.exec(lines[i])[1].trim()) + '</li>');
          i++;
        }
        html.push('<ul>' + ul.join('') + '</ul>');
        continue;
      }

      /* 有序列表 */
      if (RE_OL.test(line)) {
        var ol = [];
        while (i < lines.length && RE_OL.test(lines[i])) {
          ol.push('<li>' + renderInline(RE_OL.exec(lines[i])[1].trim()) + '</li>');
          i++;
        }
        html.push('<ol>' + ol.join('') + '</ol>');
        continue;
      }

      /* 段落 */
      var para = [line];
      i++;
      while (i < lines.length && !isBlockStart(lines[i])) { para.push(lines[i]); i++; }
      html.push('<p>' + renderInline(joinSoftLines(para)) + '</p>');
    }

    return html.join('\n');
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
    var text = plainText(markdown);
    return text.length > 100 ? text.slice(0, 100) + '……' : text;
  }

  return {
    toHtml: markdownToHtml,
    escapeHtml: escapeHtml,
    plainText: plainText,
    makeExcerpt: makeExcerpt
  };
});
