/**
 * 저자 — 한 사람이다.
 *
 * 왜 만드나 (2026-08-16 운영자 승인).
 *
 *   외부 평가와 우리 자체 판단이 같은 것을 최대 약점으로 꼽았다.
 *   "About 페이지에 '한 사람이 운영한다' 고 쓰여 있지만 그 사람이 누구인지 나오지 않는다."
 *   구조화 데이터의 author 도 사람이 아니라 조직(HANKUKIN)이었다.
 *
 *   2026년에 이건 치명적이다. 생성된 여행글이 넘치는데
 *   **뒤에 아무도 없는 사이트**는 그 더미와 구별할 방법이 없다.
 *
 * 여기 적는 것의 한계 — 지어내지 않는다.
 *
 *   운영자가 공개를 승인한 것만 적는다. 실명은 쓰지 않는다.
 *   직업과 소속은 승인받지 않았으므로 쓰지 않는다.
 *   "10년 경력" 같은 수식도 붙이지 않는다 — 확인한 바 없다.
 *
 *   저자 소개에서 거짓말을 하면 그 사이트의 다른 모든 문장이 같이 죽는다.
 *   **적을 게 적어서 짧은 소개는 괜찮다. 부풀린 소개는 안 괜찮다.**
 */
export const AUTHOR = {
  /** 필명. 실명은 공개하지 않는다 (운영자 결정, 2026-08-16). */
  name: 'Suyol',

  /** 한 줄 소개 — 기사 하단 byline 에 쓴다. */
  short: 'Korean, reads the Korean sources this site is built on, and has lived and worked outside Korea.',

  /**
   * 검증된 사실만. 각 줄은 운영자가 직접 말한 것에 근거한다.
   * 근거 없는 줄을 여기 넣지 말 것.
   */
  facts: [
    {
      claim: 'Korean, and reads the Korean-language sources directly',
      why: 'Almost everything on this site comes from Korean government pages, agency notices and press releases that have no English version. Where a figure matters, the Korean sentence it came from is printed on the page next to it, so you can check the translation rather than take it on trust.',
    },
    {
      claim: 'Has lived and worked outside Korea',
      why: 'Which is where the angle of this site comes from. Most Korean travel information is written for people who already know how things work here. The gaps this site tries to fill are the ones that are only visible if you have been the foreigner somewhere.',
    },
  ],

  /** AI 를 어떻게 쓰는지 — 숨기지 않는다. 숨기면 그게 약점이 된다. */
  ai: [
    'Drafting, translation and the charts are done with AI assistance, and this is stated on every article.',
    'Sources are chosen and read by a person. Figures are checked against the primary source, not against a summary of it.',
    'Every photograph in use has been opened and looked at by a person before publication. The build refuses to publish one that has not.',
    'When something turns out to be wrong it is corrected and the correction is listed publicly.',
  ],
};

/**
 * 저자 페이지의 3개 언어 문안 (2026-08-16).
 *
 * 이 페이지는 「누가 책임지는가」를 말하는 자리다.
 * 일본어·중국어 독자에게 그 답이 영어로만 있으면, 답하지 않은 것과 같다.
 * 필명·사실 항목은 번역해도 내용이 달라지지 않아야 하므로, 여기서 한 벌로 관리한다.
 */
export const AUTHOR_I18N = {
  en: {
    title: 'who writes this', h1: 'Who writes this',
    lede: 'One person. Not a team, not a content agency, and not a pile of generated articles with a logo on top — though from the outside those are hard to tell apart, which is why this page exists.',
    short: AUTHOR.short,
    factsHeading: 'What that actually buys you',
    facts: AUTHOR.facts,
    aiHeading: 'How AI is used here',
    aiLeadA: 'It is used, it is disclosed on every article, and pretending otherwise would be the easiest thing on this page to catch. The line that matters is not whether a machine helped write the sentences. It is ',
    aiLeadStrong: 'who is answerable for whether they are true.',
    ai: AUTHOR.ai,
    notHeading: 'What I am not',
    not: [
      ['Not a travel professional.', ' No agency, no tour operator, no tourism board. Nobody pays for a mention here.'],
      ['Not a doctor, a lawyer or a financial adviser', ', and the articles that touch those subjects say so where it matters.'],
      ['Not everywhere.', ' A lot of what is on this site is researched from primary Korean sources rather than visited last week. Where that is the case, the sources are listed and dated so you can see exactly what the claim rests on.'],
    ],
    wrongHeading: 'If something here is wrong',
  },
  ja: {
    title: 'これを書いている人', h1: 'これを書いている人',
    lede: '一人です。チームでもなく、コンテンツ制作会社でもなく、生成した記事の山にロゴを載せたものでもありません。とはいえ外から見ると見分けがつきにくい——だからこのページがあります。',
    short: '韓国人。このサイトの土台になっている韓国語の資料を直接読み、韓国の外で暮らし、働いた経験があります。',
    factsHeading: 'それで何が変わるのか',
    facts: [
      { claim: '韓国人で、韓国語の資料を直接読んでいます',
        why: 'このサイトのほとんどは、英語版のない韓国の官公庁ページ、事業者の告知、報道資料から来ています。数字が重要な箇所では、その元になった韓国語の一文をすぐ隣に載せています。訳を信じてもらうのではなく、確かめてもらうためです。' },
      { claim: '韓国の外で暮らし、働いた経験があります',
        why: 'このサイトの視点はそこから来ています。韓国の旅行情報の多くは、こちらの仕組みをすでに知っている人向けに書かれています。このサイトが埋めようとしている穴は、どこかで「外国人の側」に立ったことがある人にしか見えない種類のものです。' },
    ],
    aiHeading: 'AIをどう使っているか',
    aiLeadA: '使っています。すべての記事に明記しています。隠したところで、このページでいちばん簡単に見破られることです。問題は、機械が文章を書くのを手伝ったかどうかではありません。',
    aiLeadStrong: 'その文が本当かどうかに、誰が責任を負うのか——そこが境目です。',
    ai: [
      '下書き、翻訳、図版はAIの支援で作っており、そのことを各記事に明記しています。',
      '出典は人が選び、人が読みます。数字は要約ではなく一次資料に当てて確認します。',
      '掲載しているすべての写真は、公開前に人が実際に開いて見ています。見ていない写真はビルドが公開を拒否します。',
      '間違いが判明した場合は訂正し、その訂正を公開の記録に残します。',
    ],
    notHeading: 'こういうものではありません',
    not: [
      ['旅行の専門家ではありません。', '旅行会社でもツアーオペレーターでも観光局でもありません。ここでの言及にお金を払っている人はいません。'],
      ['医師でも弁護士でも金融アドバイザーでもありません', '。その分野に触れる記事では、必要な箇所にそう書いています。'],
      ['どこにでも行っているわけではありません。', 'このサイトの多くは、先週訪ねた話ではなく、韓国語の一次資料から調べたものです。その場合は出典と日付を並べて、何を根拠にした話なのかがそのまま見えるようにしています。'],
    ],
    wrongHeading: '間違いを見つけたら',
  },
  'zh-hans': {
    title: '谁在写这个网站', h1: '谁在写这个网站',
    lede: '一个人。不是团队，不是内容代理公司，也不是一堆生成的文章上面盖个标志——不过从外面看这几样很难分辨，所以才有了这一页。',
    short: '韩国人，直接阅读本站赖以成立的韩语资料，并有在韩国以外生活和工作的经历。',
    factsHeading: '这到底带来什么',
    facts: [
      { claim: '韩国人，直接读韩语原始资料',
        why: '本站的内容几乎全部来自没有英文版的韩国政府页面、企业公告和新闻稿。凡是数字重要的地方，我们都会把它出自的那句韩语原文放在旁边——不是让你相信翻译，而是让你自己核对。' },
      { claim: '有在韩国以外生活和工作的经历',
        why: '本站的视角就来自这里。韩国的旅行信息大多是写给已经懂这里怎么运作的人看的。本站想填的那些空缺，只有当过一次"外国人"的人才看得见。' },
    ],
    aiHeading: '这里怎么使用 AI',
    aiLeadA: '用了，每篇文章都写明了，而且假装没用是这一页上最容易被戳破的事。真正的分界不在于机器有没有帮忙写句子，而在于',
    aiLeadStrong: '这些句子是不是真的，由谁负责。',
    ai: [
      '草稿、翻译和图表是借助 AI 完成的，每篇文章都写明了这一点。',
      '来源由人挑选、由人阅读。数字是对着一次原始资料核对的，不是对着摘要。',
      '所有在用的照片，发布前都由人打开看过。没看过的，构建过程会直接拒绝发布。',
      '发现错误就更正，并把更正公开记录下来。',
    ],
    notHeading: '我不是什么',
    not: [
      ['不是旅游业者。', '没有旅行社，没有旅游经营方，没有观光局。这里的任何一处提及都不是买来的。'],
      ['不是医生、律师或理财顾问', '，涉及这些话题的文章会在需要的地方写明。'],
      ['没有到处都去过。', '本站相当一部分内容是从韩语一次资料查证来的，而不是上周刚去过。凡是这种情况，我们都会列出来源和日期，让你清楚看到这个说法建立在什么之上。'],
    ],
    wrongHeading: '如果这里有错',
  },
};
