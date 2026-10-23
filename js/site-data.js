/**
 * 站点数据文件
 * 只需要在这里维护文章即可，页面会自动生成。
 *
 * 文章字段说明：
 *   slug     唯一标识，用于 post.html?slug=xxx，只能用字母、数字、短横线
 *   title    标题
 *   category 所属分类 id，取值见下方 SITE_CATEGORIES
 *   tags     标签数组，首页词条云即由此汇总生成
 *   date     日期，格式 YYYY-MM-DD
 *   excerpt  摘要，显示在列表页
 *   content  正文，可直接写 HTML，如 <p>段落</p><h2>小标题</h2>
 */

const SITE_INFO = {
  name: 'rszs',
  title: 'rszs 的文字仓库',
  description: '一个以文字为主的地方。'
};

const SITE_CATEGORIES = [
  {
    id: 'original',
    name: '登基',
    desc: '原創。我要當皇帝！'
  },
  {
    id: 'fanfic',
    name: '求雨',
    desc: '同人。模仿原作的巫祝。'
  },
  {
    id: 'blog',
    name: '火鍋燒烤',
    desc: '近況像火鍋，思考即燒烤'
  }
];

const SITE_POSTS = [
  {
    slug: 'sample-original-1',
    title: '示例：一篇原创短篇',
    category: 'original',
    tags: ['短篇', '写作', '城市'],
    date: '2026-10-01',
    excerpt: '这是一篇示例文章，用来演示列表与正文的排版效果，你可以在 js/site-data.js 中替换成自己的内容。',
    content: `<p>这是一段示例正文。整站以文字为主，所以正文只保留了最简单的排版：段落、小标题、引用与列表。</p>
<h2>小标题</h2>
<p>换行会自动留出合适的行距，阅读起来不会觉得拥挤。默认字色是深灰，背景是白色，长时间阅读也不刺眼。</p>
<blockquote><p>被引用的一小段话，会以左侧细线的方式呈现。</p></blockquote>
<ul>
  <li>列表项一</li>
  <li>列表项二</li>
</ul>
<p>以上就是全部示例内容。</p>`
  },
  {
    slug: 'sample-original-2',
    title: '示例：写在深夜的一段话',
    category: 'original',
    tags: ['随笔', '深夜', '写作'],
    date: '2026-09-18',
    excerpt: '深夜写字的习惯，已经维持了很多年。夜里安静，字句落下来的声音都听得见。',
    content: `<p>深夜写字的习惯，已经维持了很多年。</p>
<p>夜里安静，字句落下来的声音都听得见。</p>`
  },
  {
    slug: 'sample-fanfic-1',
    title: '示例：一篇同人短打',
    category: 'fanfic',
    tags: ['短打', '同人', '连载'],
    date: '2026-09-30',
    excerpt: '同人写作的示例文章，用于演示分类页与标签页的效果。',
    content: `<p>同人的乐趣在于，把熟悉的两个人放进一个从未发生过的场景里，看他们会说什么。</p>
<h2>第一场</h2>
<p>示例内容到此为止。</p>`
  },
  {
    slug: 'sample-fanfic-2',
    title: '示例：同人长篇·第一章',
    category: 'fanfic',
    tags: ['同人', '连载', '成长'],
    date: '2026-08-22',
    excerpt: '连载示例，说明同一分类下可以放多篇文章。',
    content: `<p>第一章示例正文。</p>`
  },
  {
    slug: 'sample-blog-1',
    title: '示例：最近读的一本书',
    category: 'blog',
    tags: ['读书', '随笔'],
    date: '2026-10-12',
    excerpt: '读书笔记示例，博客分类下可以放生活记录、读书笔记、杂谈等任何内容。',
    content: `<p>读书笔记示例正文。</p>
<p>写下感想，比记住摘抄更有用。</p>`
  },
  {
    slug: 'sample-blog-2',
    title: '示例：一顿火锅的意义',
    category: 'blog',
    tags: ['美食', '生活记录', '城市'],
    date: '2026-09-05',
    excerpt: '火锅与烧烤是博客分类的名字，也是生活里最常见的两件事。',
    content: `<p>吃饭这件事，认真起来也是一门学问。</p>`
  },
  {
    slug: 'sample-blog-3',
    title: '示例：我的写作工具与流程',
    category: 'blog',
    tags: ['写作', '工具', '编程'],
    date: '2026-07-14',
    excerpt: '把写作流程固定下来，灵感来的时候就不必再纠结格式。',
    content: `<p>工具越简单，越容易开始写。</p>`
  }
];
