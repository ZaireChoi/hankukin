/**
 * 화면 문구 — 기사 본문이 아닌 **껍데기의 모든 글자**가 여기 있다.
 *
 * 2026-08-17. 일본어 5편을 쓰고 빌드해 보니 기사만 일본어였다.
 * 헤더·푸터·목록 페이지·정책 링크가 전부 영어로 남아 있었다.
 * 일본 독자에게 그건 「일본어판이 있다」가 아니라 **「일본어판이 미완성이다」** 로 읽힌다.
 *
 * 운영자 지시: *"일본사람한테는 일본어로 글이 뜨고 들어가면 껍데기까지 일본어로 보여야지.
 * 중국어든 앞으로 다른 나라 언어든 말이야."*
 *
 * 그래서 두 가지를 동시에 만든다.
 *   ① 문구를 **한 곳에** 모은다. 컴포넌트에 흩어져 있으면 언어를 늘릴 때마다 사냥해야 한다.
 *   ② **빠진 문구가 있으면 빌드를 세운다** (열한 번째 게이트).
 *      영어로 조용히 대체하는 방식은 절대 쓰지 않는다 —
 *      그게 정확히 오늘 아침에 발견한 상태이고, 아무도 모르는 채로 며칠이 간다.
 *
 * 새 언어를 추가하는 방법:
 *   여기에 그 언어 블록을 통째로 추가한다. 하나라도 빠지면 빌드가 알려 준다.
 *   그다음 brand.mjs 의 LOCALES 에 넣는다. 순서를 바꾸면 반쯤 번역된 화면이 나간다.
 */

export const UI = {
  en: {
    nav: {
      stuck: 'Stuck?',
      skipToContent: 'Skip to content',
      language: 'Language',
      notAvailable: 'Not yet available in this language',
    },
    sections: {
      scenes:  { label: 'HANKUKIN Scenes', blurb: 'Where to Go',
        lead: 'K-drama, film, K-pop and performance — the places you can stand in, and the things themselves.' },
      now:     { label: 'HANKUKIN Now', blurb: "What's Hot",
        lead: 'What Korea costs and how it works right now — fares, prices and rules, each checked against the operator on a stated date.' },
      decode:  { label: 'HANKUKIN Decode', blurb: 'What It Means',
        lead: 'The words subtitles drop — what Korean speakers are actually saying to each other, and why it matters in the scene.' },
      hangul:  { label: 'HANKUKIN Hangul', blurb: 'Read the Signs',
        lead: 'How to read Korean writing well enough to use it — the letters, the signs on the street, and what each kind of shop calls itself.' },
      guides:  { label: 'Culture & History', blurb: 'Why It Matters',
        lead: 'The background behind the places you visit and the stories you watch — with sources you can check.' },
    },
    footer: {
      stuck: 'Stuck on Something?',
      arrival: 'Arrival Setup',
      about: 'About',
      author: 'Who Writes This',
      editorial: 'Editorial Policy',
      ledger: 'What We Threw Away',
      affiliate: 'Affiliate Disclosure',
      privacy: 'Privacy Policy',
      contact: 'Contact & Report an Error',
      inEnglish: '',            // 영어판에서는 표시하지 않는다
    },
    article: {
      sources: 'Sources & last checked',
      readNext: 'Read next',
      lastChecked: 'Last checked',
      sceneMatters: 'Why this scene matters',
      ctaHeading: 'Book it or find it',
      verifyNotice: (d) => `This page was last verified on ${d}. Opening hours, prices and business status change often — please confirm on the official page before you travel.`,
      originalLabel: 'The Korean sentence this comes from',
    },
    affiliate: {
      topNote: 'This article contains affiliate links, marked where they appear. If you book through one we may earn a commission at no extra cost to you —',
      topNoteLink: 'how this works',
      tag: 'Affiliate link — we may earn a commission',
      sourceTag: 'we earn a commission if you book here',
      rel: { confirmed_use: 'Confirmed use', inspired_by: 'Inspired by', suggested: 'Suggested' },
      allPaid: 'Every link above is an affiliate link: if you book through one we may earn a commission, at no extra cost to you. We were not paid to write any of this and nobody reviewed it before publication but us.',
      somePaid: 'Links marked as affiliate links earn us a commission if you book through them, at no extra cost to you. The rest are official operator and government pages that pay us nothing. We were not paid to write any of this.',
      nonePaid: 'Official operator and government pages. None of these are affiliate links and nobody pays us for a place here.',
    },
    byline: {
      writtenBy: 'Written by',
      aiNote: 'Drafted with AI assistance; sources read, figures checked and photographs opened by a person before publication.',
      ledger: 'Mistakes we have found are on the public record.',
      policyNote: 'This article was researched, drafted and fact-checked with AI assistance under an editorial policy you can read.',
      spotted: 'Spotted something wrong or out of date?',
      reportError: 'Report an error',
    },
    home: {
      tagline: 'Read the signs. Know the fares.',
      sub: 'Korea, minus the moments that freeze visitors.',
      arrivalCta: 'Landing in Korea?',
      arrivalCtaStrong: 'Set up your first 24 hours →',
      metaDescription: 'K-drama brought you to Korea. We cover the ground game — reading signs, fares, tickets, food, clinics — checked against Korean primary sources.',
      kickers: { filming: 'Filming location', kculture: 'K-culture', now: 'Korea Now',
                 decode: 'Decode', hangul: 'Read the signs', guides: 'Culture & History' },
      scenesLead: 'K-drama, film, K-pop and live performance — and the places they happen. Some of these are locations you can stand in, with how to get there and what it costs. Others are the thing itself: what a song is doing on the chart two years late, or whether a film everyone was talking about is still being talked about.',
    },
    footer2: {
      independent: 'We are an independent guide and are not affiliated with any broadcaster, agency, artist or public body.',
      someAffiliate: 'Some links are affiliate links; see our',
      noAffiliate: 'We currently carry no affiliate links and earn nothing from any link on this site. If that changes, this line changes with it — see our',
      disclosureWord: 'disclosure',
    },
  },

  ja: {
    nav: {
      stuck: '困っていること',
      skipToContent: '本文へ',
      language: '言語',
      notAvailable: 'この言語ではまだ公開していません',
    },
    sections: {
      scenes:  { label: 'HANKUKIN Scenes', blurb: 'どこへ行くか',
        lead: 'ドラマ・映画・K-POP・舞台 — 実際に立てる場所と、その作品そのもの。' },
      now:     { label: 'HANKUKIN Now', blurb: '今の韓国',
        lead: '韓国が今いくらで、どう動いているか — 運賃・価格・規則を、事業者の公表内容と確認日つきで。' },
      decode:  { label: 'HANKUKIN Decode', blurb: '言葉の意味',
        lead: '字幕が落としてしまう言葉 — 韓国語話者が実際に何と言っているのか、そしてそれが場面でなぜ効くのか。' },
      hangul:  { label: 'HANKUKIN Hangul', blurb: '看板を読む',
        lead: '使える程度にハングルを読む方法 — 文字、街の看板、そして店が自分を何と呼んでいるか。' },
      guides:  { label: '文化と歴史', blurb: 'なぜそうなのか',
        lead: '訪ねる場所と観る物語の背景を、確認できる出典とともに。' },
    },
    footer: {
      stuck: '困っていることから探す',
      arrival: '到着後24時間の準備',
      about: 'このサイトについて',
      author: '誰が書いているか',
      editorial: '編集方針',
      ledger: '取り下げた記事の記録',
      affiliate: 'アフィリエイトの開示',
      privacy: 'プライバシーポリシー',
      contact: 'お問い合わせ・誤りのご指摘',
      inEnglish: '（英語）',
    },
    article: {
      sources: '出典と最終確認日',
      readNext: '次に読む',
      lastChecked: '最終確認',
      sceneMatters: 'この場所が効く理由',
      ctaHeading: '予約する・探す',
      verifyNotice: (d) => `このページの最終確認日は ${d} です。営業時間・料金・営業状況は頻繁に変わります。出発前に公式ページでご確認ください。`,
      originalLabel: 'もとになった韓国語の原文',
    },
    affiliate: {
      topNote: 'この記事にはアフィリエイトリンクが含まれます（該当箇所に表示しています）。そこから予約された場合、追加費用なしで当サイトに手数料が入ります —',
      topNoteLink: '仕組みについて',
      tag: 'アフィリエイトリンク — 手数料が入ります',
      sourceTag: 'ここから予約されると手数料が入ります',
      rel: { confirmed_use: '実際に利用', inspired_by: '参考', suggested: '候補' },
      allPaid: '上のリンクはすべてアフィリエイトリンクです。予約された場合、追加費用なしで当サイトに手数料が入ります。記事の対価は受け取っておらず、公開前に外部の確認も受けていません。',
      somePaid: '「アフィリエイトリンク」と表示したものは、予約された場合に追加費用なしで手数料が入ります。それ以外は事業者・行政の公式ページで、当サイトには一切支払われていません。記事の対価は受け取っていません。',
      nonePaid: '事業者・行政の公式ページです。アフィリエイトリンクは一つもなく、掲載の対価も受け取っていません。',
    },
    byline: {
      writtenBy: '執筆',
      aiNote: 'AIの支援を受けて執筆しています。出典の確認、数字の照合、写真の確認は公開前に人が行っています。',
      ledger: '見つかった誤りは公開の記録に残しています。',
      policyNote: 'この記事は、公開している編集方針のもとで、AIの支援を受けて調査・執筆・事実確認を行いました。',
      spotted: '内容に誤りや古い情報を見つけましたか？',
      reportError: '誤りを知らせる',
    },
    home: {
      tagline: '看板を読む。運賃を知る。',
      sub: '旅行者が固まってしまう瞬間を、取り除いた韓国。',
      arrivalCta: '韓国に到着しますか？',
      arrivalCtaStrong: '最初の24時間を整える →',
      metaDescription: 'ドラマがきっかけで韓国へ。このサイトは現地で実際に効くほうを扱います — 看板の読み方、運賃、チケット、食事、病院。すべて韓国語の一次資料で確認しています。',
      kickers: { filming: 'ロケ地', kculture: 'K-カルチャー', now: '今の韓国',
                 decode: '言葉の意味', hangul: '看板を読む', guides: '文化と歴史' },
      scenesLead: 'ドラマ・映画・K-POP・ライブと、それが起きた場所。実際に立てるロケ地は、行き方と費用まで書きます。もう一方は作品そのもの — ある曲が二年遅れでチャートに戻ってきた理由や、話題だった映画が今も話題なのか。',
    },
    footer2: {
      independent: '当サイトは独立した案内であり、放送局・事務所・アーティスト・公的機関のいずれとも関係がありません。',
      someAffiliate: '一部にアフィリエイトリンクを含みます。詳しくは',
      noAffiliate: '現在アフィリエイトリンクはなく、サイト内のどのリンクからも収益を得ていません。変われば、この一文も変わります —',
      disclosureWord: '開示ページ',
    },
  },
  'zh-hans': {
    nav: {
      stuck: '卡住了？',
      skipToContent: '跳到正文',
      language: '语言',
      notAvailable: '该语言尚未上线',
    },
    sections: {
      scenes:  { label: 'HANKUKIN Scenes', blurb: '去哪里',
        lead: '韩剧、电影、K-POP 与现场演出 —— 你可以真正站上去的地方，以及作品本身。' },
      now:     { label: 'HANKUKIN Now', blurb: '此刻的韩国',
        lead: '韩国现在多少钱、怎么运作 —— 票价、物价与规定，逐条对照运营方的公开信息，并注明核对日期。' },
      decode:  { label: 'HANKUKIN Decode', blurb: '这句话的意思',
        lead: '字幕省略掉的那些话 —— 韩国人之间实际在说什么，以及它在那个场景里为什么重要。' },
      hangul:  { label: 'HANKUKIN Hangul', blurb: '看懂招牌',
        lead: '把韩文读到能用的程度 —— 字母、街上的招牌，以及每类店铺如何称呼自己。' },
      guides:  { label: '文化与历史', blurb: '背后的原因',
        lead: '你要去的地方、你在看的故事，它们的背景 —— 附上可以自己核对的出处。' },
    },
    footer: {
      stuck: '按问题查找',
      arrival: '落地后 24 小时',
      about: '关于本站',
      author: '谁在写',
      editorial: '编辑方针',
      ledger: '被我们撤下的内容',
      affiliate: '联盟链接披露',
      privacy: '隐私政策',
      contact: '联系与纠错',
      inEnglish: '（英文）',
    },
    article: {
      sources: '出处与最后核对日',
      readNext: '接着读',
      lastChecked: '最后核对',
      sceneMatters: '这个地方为什么值得',
      ctaHeading: '预订或查找',
      verifyNotice: (d) => `本页最后核对日期为 ${d}。营业时间、价格与营业状态经常变动，出发前请以官方页面为准。`,
      originalLabel: '这段话的韩文原文',
    },
    affiliate: {
      topNote: '本文含联盟链接（已在出现处标注）。通过这些链接下单，本站可获得佣金，您不会因此多付一分钱 ——',
      topNoteLink: '这是怎么运作的',
      tag: '联盟链接 —— 本站可获得佣金',
      sourceTag: '通过此处预订，本站可获得佣金',
      rel: { confirmed_use: '已实际使用', inspired_by: '参考', suggested: '备选' },
      allPaid: '以上全部为联盟链接：通过它们下单，本站可获得佣金，您不会多付费用。本文并非收费撰写，发布前也没有任何外部方审阅。',
      somePaid: '标注为联盟链接的，通过它们下单本站可获得佣金，您不会多付费用。其余为运营方与政府的官方页面，不向本站支付任何费用。本文并非收费撰写。',
      nonePaid: '以上均为运营方与政府的官方页面。其中没有任何联盟链接，也没有人为出现在这里付费。',
    },
    byline: {
      writtenBy: '撰写',
      aiNote: '本文在 AI 协助下撰写；出处、数字与照片在发布前均由人工核对。',
      ledger: '我们发现的错误都公开记录在案。',
      policyNote: '本文依据公开的编辑方针，在 AI 协助下完成调查、撰写与事实核查。',
      spotted: '发现错误或过时的信息了吗？',
      reportError: '告诉我们',
    },
    home: {
      tagline: '看懂招牌，算清车费。',
      sub: '把让旅行者当场卡住的那些瞬间，从韩国里拿掉。',
      arrivalCta: '要落地韩国了吗？',
      arrivalCtaStrong: '把最初的 24 小时安排好 →',
      metaDescription: '因为韩剧来到韩国。本站写的是落地之后真正要用的部分 —— 看招牌、车费、门票、吃饭、看病，全部对照韩文一手资料核对。',
      kickers: { filming: '取景地', kculture: 'K-文化', now: '此刻的韩国',
                 decode: '这句话的意思', hangul: '看懂招牌', guides: '文化与历史' },
      scenesLead: '韩剧、电影、K-POP 与现场演出，以及它们发生的地方。有些是你可以真正站上去的取景地，我们会写怎么去、要花多少钱。另一些是作品本身 —— 一首歌为什么在两年后重新爬上榜单，或者当初人人都在谈的电影现在还有没有人谈。',
    },
    footer2: {
      independent: '本站是独立的指南，与任何电视台、经纪公司、艺人或公共机构均无关联。',
      someAffiliate: '部分链接为联盟链接，详见',
      noAffiliate: '本站目前没有联盟链接，也不从站内任何链接获得收入。若有变化，这句话也会随之改变 —— 详见',
      disclosureWord: '披露页',
    },
  },
};

/**
 * 문구를 꺼낸다. **없으면 던진다.**
 *
 * 영어로 조용히 대체하지 않는 이유 — 그러면 반쯤 영어인 화면이 만들어지고,
 * 화면을 열어 보기 전에는 아무도 모른다. 오늘 그 상태를 실제로 만들었다.
 */
export function t(lang, path) {
  const parts = path.split('.');
  let node = UI[lang];
  for (const p of parts) {
    if (node == null) break;
    node = node[p];
  }
  if (node === undefined || node === null) {
    throw new Error(
      `\n\n화면 문구가 없습니다 — UI["${lang}"].${path}\n\n` +
      'src/config/ui.mjs 에 이 언어의 문구를 추가하십시오.\n' +
      '**영어로 대체하지 않습니다.** 반쯤 영어인 화면은 미완성으로 읽힙니다.\n',
    );
  }
  return node;
}

/** 게이트가 쓰는 것 — 어떤 키들이 있어야 하는가 (영어를 기준으로 삼는다). */
export function flatKeys(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') out.push(...flatKeys(v, key));
    else out.push(key);
  }
  return out;
}
