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
