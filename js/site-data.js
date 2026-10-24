/*
 * 本文件由 build.js 自动生成，请勿手动编辑。
 * 新增或修改文章：编辑 posts/ 目录下的 Markdown 文件，然后运行 node build.js
 */

const SITE_INFO = {
  "name": "人死在世",
  "title": "人死在世",
  "description": "靈光一現"
};

const SITE_CATEGORIES = [
  {
    "id": "original",
    "name": "登基",
    "desc": "原創。自己做虛構皇帝！"
  },
  {
    "id": "fanfic",
    "name": "求雨",
    "desc": "同人。模仿原作的巫祝。"
  },
  {
    "id": "blog",
    "name": "火鍋燒烤",
    "desc": "近況燉煮與小思考"
  }
];

const SITE_POSTS = [
  {
    "slug": "sample-blog-1",
    "title": "示例：最近读的一本书",
    "category": "blog",
    "tags": [
      "读书",
      "随笔"
    ],
    "date": "2026-10-12",
    "excerpt": "读书笔记示例正文。 写下感想，比记住摘抄更有用。",
    "content": "<p>读书笔记示例正文。</p>\n<p>写下感想，比记住摘抄更有用。</p>"
  },
  {
    "slug": "sample-original-1",
    "title": "示例：一篇原创短篇",
    "category": "original",
    "tags": [
      "短篇",
      "写作",
      "城市"
    ],
    "date": "2026-10-01",
    "excerpt": "这是一篇示例文章，用来演示列表与正文的排版效果，你可以把 posts/ 里的示例文件替换成自己的内容。",
    "content": "<p>这是一段示例正文。整站以文字为主，所以正文只保留了最简单的排版：段落、小标题、引用与列表。</p>\n<h3>小标题</h3>\n<p>换行会自动留出合适的行距，阅读起来不会觉得拥挤。默认字色是深灰，背景是白色，长时间阅读也不刺眼。</p>\n<blockquote><p>被引用的一小段话，会以左侧细线的方式呈现。</p></blockquote>\n<ul><li>列表项一</li><li>列表项二</li></ul>\n<p>以上就是全部示例内容。</p>"
  },
  {
    "slug": "sample-fanfic-1",
    "title": "示例：一篇同人短打",
    "category": "fanfic",
    "tags": [
      "短打",
      "同人",
      "连载"
    ],
    "date": "2026-09-30",
    "excerpt": "同人的乐趣在于，把熟悉的两个人放进一个从未发生过的场景里，看他们会说什么。 第一场 示例内容到此为止。",
    "content": "<p>同人的乐趣在于，把熟悉的两个人放进一个从未发生过的场景里，看他们会说什么。</p>\n<h3>第一场</h3>\n<p>示例内容到此为止。</p>"
  },
  {
    "slug": "sample-original-2",
    "title": "示例：写在深夜的一段话",
    "category": "original",
    "tags": [
      "随笔",
      "深夜",
      "写作"
    ],
    "date": "2026-09-18",
    "excerpt": "深夜写字的习惯，已经维持了很多年。 夜里安静，字句落下来的声音都听得见。",
    "content": "<p>深夜写字的习惯，已经维持了很多年。</p>\n<p>夜里安静，字句落下来的声音都听得见。</p>"
  },
  {
    "slug": "sample-blog-2",
    "title": "示例：一顿火锅的意义",
    "category": "blog",
    "tags": [
      "美食",
      "生活记录",
      "城市"
    ],
    "date": "2026-09-05",
    "excerpt": "吃饭这件事，认真起来也是一门学问。",
    "content": "<p>吃饭这件事，认真起来也是一门学问。</p>"
  },
  {
    "slug": "sample-fanfic-2",
    "title": "示例：同人长篇·第一章",
    "category": "fanfic",
    "tags": [
      "同人",
      "连载",
      "成长"
    ],
    "date": "2026-08-22",
    "excerpt": "第一章示例正文。",
    "content": "<p>第一章示例正文。</p>"
  },
  {
    "slug": "sample-blog-3",
    "title": "示例：我的写作工具与流程",
    "category": "blog",
    "tags": [
      "写作",
      "工具",
      "编程"
    ],
    "date": "2026-07-14",
    "excerpt": "工具越简单，越容易开始写。",
    "content": "<p>工具越简单，越容易开始写。</p>"
  }
];
