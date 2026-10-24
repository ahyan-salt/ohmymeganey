/**
 * 加密（密码上锁）的文章列表
 * ------------------------------------------------------------
 * 本文件由 editor.html 生成，请勿手动编辑。
 * 里面的正文是密文，没有密码看不到内容。
 *
 * 每条记录的结构：
 * {
 *   slug, title, category, tags: [], date, excerpt,   // 公开信息（列表、标签云会用到）
 *   locked: true,
 *   enc: { v, alg, kdf, iter, salt, iv, data }        // 加密后的正文
 * }
 */

window.LOCKED_POSTS = [];
