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
    notFound: {
      h1: 'That page is not here',
      ledeA: 'The address you followed does not exist on this site — either it never did, or we moved the article and left a link behind. If a link on our own pages sent you here, ',
      tellUs: 'tell us',
      ledeB: ': broken links of ours are our mistake, not yours.',
      frontA: 'Or start from ',
      frontLink: 'the front page',
      frontB: '.',
    },
    nav: {
      stuck: 'Stuck?',
      plan: 'Plan your trip',
      skipToContent: 'Skip to content',
      language: 'Language',
      notAvailable: 'Not yet available in this language',
    },
    /**
     * 페이지가 설명을 안 넘겼을 때 쓰는 meta description.
     *
     * 2026-08-23. 여기 오기 전에는 BRAND.defaultMetaDescription(영어 한 줄)이 그대로 나갔다.
     * 홈이 설명을 안 넘기고 있어서 /ja/ 와 /zh-hans/ 의 대문 설명이 **영어였다.**
     * 사이트에서 제일 중요한 한 줄인데, 화면에 안 보이는 자리라 아무도 못 봤다.
     *
     * ※ 이 주석을 처음 쓸 때 별표 둘 바로 뒤에 「/ja/」를 붙여 적었다가 빌드가 섰다.
     *   별표 다음에 슬래시가 오면 그 자리에서 블록 주석이 닫히고, 뒤가 전부 코드로 읽힌다.
     *   경로를 강조하고 싶으면 강조 표시를 경로 **뒤에** 둔다.
     *   (이 줄을 고칠 때도 같은 실수를 한 번 더 했다 — 경고문에 그 문자열을 그대로 넣었다.)
     * 게이트 14-b 를 만들자마자 처음 잡힌 것이 이것이다.
     *
     * brand.mjs 의 영어 원문을 지우지는 않는다 — 그쪽은 언어를 모르는 자리(JSON-LD 등)에서
     * 계속 쓰인다. 화면과 검색에 나가는 것만 여기서 언어별로 고른다.
     */
    meta: {
      default: 'K-drama brought you to Korea. We cover the ground game — reading signs, fares, tickets, food, clinics — checked against Korean primary sources.',
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
      ctaVisit: 'Visit Korea',
      ctaBring: 'Bring Korea Home',
      ctaShipNote: 'Availability and shipping vary by country. Prices were checked on the dates shown on each merchant page.',
      verifyNotice: (d) => `This page was last verified on ${d}. Opening hours, prices and business status change often — please confirm on the official page before you travel.`,
      originalLabel: 'The Korean sentence this comes from',
    },
      place: {
        heading: 'The place', name: 'Name', address: 'Address', status: 'Status',
        access: 'Access', accessRestricted: 'Restricted — not freely open to visitors',
        bestSeason: 'Best season', gettingThere: 'Getting there', transport: 'Transport',
        admission: 'Admission', bring: 'Bring',
        statusLabel: { operating: 'Operating', temporarily_closed: 'Temporarily closed',
                       permanently_closed: 'Permanently closed', unknown: 'Not verified' },
      },

      notices: {
        affiliate: 'This article contains affiliate links. We may earn a commission if you book or purchase through them, at no additional cost to you.',
        noAffiliate: 'These are plain links to merchants we think are useful. We are not in an affiliate relationship with them and earn nothing if you book or purchase. If that changes, this notice will change with it.',
        photoAngle: "This is a suggested photo angle for visitors, not the production's confirmed camera position.",
      },
      sourceChecked: 'checked',
      sourceType: {
        official_production: 'Official — production', official_interview: 'Official — interview',
        official_social: 'Official — social account', public_institution: 'Public institution',
        reliable_media: 'Media', aggregate_data: 'Aggregate data',
        merchant_official: 'Merchant official site', editorial: 'Editorial',
        community_tally: 'Community threads — we counted, we did not take facts from them',
      },

      scene: {
        closed: 'This location has permanently closed. We keep the page as a record of the filming site, but booking and purchase links have been removed.',
        photoHeading: 'How to get a similar photo',
        whereToStand: 'Where to stand',
        direction: 'Which way to face',
        framing: 'Framing',
        bestTime: 'Best time',
        crowdTip: 'Avoiding crowds',
        props: 'Simple props',
        itinerary: 'Fit it into your day',
        nearby: 'Korean culture & history nearby',
        slots: { morning: 'Morning', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' },
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
      tellMe: 'Tell me',
      wrongMid: '. Corrections go on the public ',
      ledgerLink: 'record of what we got wrong',
      wrongTail: ', along with who found it — including the ones found by people outside this site, because pretending we caught everything ourselves would be its own small lie.',
      writtenBy: 'Written by',
      /*
       * 2026-08-22. aiNote 와 policyNote 는 **같은 말이었다.**
       *   aiNote     — 'Drafted with AI assistance; sources read, figures checked
       *                 and photographs opened by a person before publication.'
       *   policyNote — 'This article was researched, drafted and fact-checked
       *                 with AI assistance under an editorial policy you can read.'
       * 상자가 둘로 나뉘어 있어서 여섯 달 동안 아무도 눈치채지 못했다.
       * 기사 하단이 어수선해 보인 진짜 이유는 상자가 넷이어서가 아니라
       * **넷 중 둘이 같은 문장이어서** 였다. 하나로 합친다.
       *
       * 세 토막으로 쪼갠 것은 가운데에 편집방침 링크를 넣기 위해서다.
       * 전에는 「an editorial policy you can read」 라고 써 놓고
       * **정작 링크가 없었다** — 읽으라면서 어디 있는지는 안 알려준 셈이다.
       */
      colophonLead: 'Researched, drafted and fact-checked with AI assistance under an ',
      colophonPolicy: 'editorial policy',
      colophonTail: ' you can read; sources read, figures checked and photographs opened by a person before publication.',
      ledger: 'Mistakes we have found are on the public record.',
      spotted: 'Spotted something wrong or out of date?',
      reportError: 'Report an error',
    },
    home: {
      kicker: 'Who brought you to Korea?',
      tagline: 'Read the signs. Know the fares.',
      sub: 'Korea, minus the moments that freeze visitors.',
      arrivalCta: 'Landing in Korea?',
      arrivalCtaStrong: 'Set up your first 24 hours →',
      metaDescription: 'K-drama brought you to Korea. We cover the ground game — reading signs, fares, tickets, food, clinics — checked against Korean primary sources.',
      kickers: { filming: 'Filming location', kculture: 'K-culture', now: 'Korea Now',
                 decode: 'Decode', hangul: 'Read the signs', guides: 'Culture & History' },
      scenesLead: 'K-drama, film, K-pop and live performance — and the places they happen. Some of these are locations you can stand in, with how to get there and what it costs. Others are the thing itself: what a song is doing on the chart two years late, or whether a film everyone was talking about is still being talked about.',
    },
    stuck: {
      heading: 'Stuck on something?',
      lede: 'Everything here started as a moment when a visitor did not know what to do.',
      ledeStrong: 'The answer is on the line — you do not have to click.',
      foot: (n) => `${n} of these so far, and the list is how we choose what to write next. Got stuck on something that is not here?`,
      tellUs: 'Tell us',
      footTail: '— that is where the next one comes from.',
      allLink: (n) => `All ${n} problems, with one-line answers →`,
      pageLede: 'Every article on this site started as a moment when a visitor did not know what to do. This is the full list, and',
      pageLedeStrong: 'the answer is on the line — you do not have to click.',
      pageArrival: 'Setting up before you land?',
      pageArrivalLink: 'The arrival page puts the first-day items in order.',
      metaDescription: 'Every moment that stumps visitors to Korea — airport, cards, signs, clinics, rules — with the answer on the line, and a link to the article where it was checked.',
    },
    arrival: {
      kicker: 'LANDING IN KOREA?',
      h1: 'Arrival setup — your first 24 hours, in order',
      lede: 'Five things, most of them doable from your sofa before you fly. Each step links to the full article where every number was checked against a Korean primary source.',
      metaDescription: 'The five things to set up for landing in Korea — eSIM, cards and 3D Secure, T-money, airport transport, and the quirks — in order, with the checked details one click away.',
      preflight: 'Before you fly',
      pre1: 'Call your card issuer about 3D Secure',
      pre1Tail: '— the one fix that only works from home.',
      pre2: 'Buying an SKT voice eSIM online? Its passport verification runs',
      pre2Strong: '8am–10pm Korean time',
      pre2Tail: '— do it before the flight, not after landing at 1am.',
      pre3: 'Secret Garden tickets',
      pre3Tail: 'sell out ahead — if it is on your list, book it now.',
      s1: 'Get your phone working',
      s1a: 'Most tourist eSIMs sold through travel platforms are data-only: mobile data works, but there is no usable Korean 010 number, no calls and no SMS. Read the product page before you pay.',
      s1b: 'A data eSIM bought from a Korean carrier does carry an 010 number, and if you need to send texts — some booking apps demand it — the voice plans differ by carrier: SKT sells and verifies online (8am–10pm Korean time), KT and LG U+ hand over the QR at the airport counter.',
      s1link: 'The eSIM article — what a tourist eSIM can and cannot do',
      s1cta: 'Get an eSIM',
      s2: 'Make your cards work before you need them',
      s2a: 'Your foreign card will work in most shops and restaurants. Korean online checkouts are a different story — many run 3D Secure, and a card that is not enrolled gets declined with no useful explanation.',
      s2b: 'The fix is a phone call to your card issuer before you fly. Bring a second card from a different bank, and some cash.',
      s2link: 'The 3D Secure article — the call to make, and the three questions to ask',
      s3: 'Pick up a transit card',
      s3a: 'T-money is the rechargeable card that works on subways and buses nationwide. Physical cards sell at airport convenience stores; some carrier eSIM bundles include one.',
      s3b: 'We are still verifying the mobile T-money apps on foreign phones — until then, the physical card is the answer we can stand behind.',
      s3link: 'What subway, bus and taxi rides actually cost',
      s4: 'Get from the airport into the city',
      s4a: 'From Incheon: the all-stop train is the cheapest, the Express is the fastest rail option, limousine buses go door-ish to door, and after the last train the N6701/N6703 night buses are the option nobody tells you about.',
      s4link: 'Incheon → Seoul, compared — fares, times, and the 1am problem',
      s4cta: 'Book airport transport',
      s5: 'Know the quirks before they find you',
      s5a: 'Korean trains have no ticket gates — sit in your assigned seat and that is the whole procedure. Clinics take walk-ins. Glasses take about ten minutes. And the signs stop being wallpaper after one evening with the alphabet.',
      s5link: 'The full list: every moment that stumps visitors, with one-line answers',
      sleep: 'Where to sleep',
      sleepBody: 'The honest position has not changed: we do not have a Seoul neighbourhood guide yet, and we do not recommend hotels we have not evaluated. What we can do is hand you the search rather than an answer — the link below opens Seoul on Trip.com, where you filter by area yourself. Myeongdong, Hongdae and Gangnam are three different trips. A guide to choosing between them is still on the list.',
    },
    footer2: {
      independent: 'We are an independent guide and are not affiliated with any broadcaster, agency, artist or public body.',
      someAffiliate: 'Some links are affiliate links; see our',
      noAffiliate: 'We currently carry no affiliate links and earn nothing from any link on this site. If that changes, this line changes with it — see our',
      disclosureWord: 'disclosure',
    },
  },

  ja: {
    notFound: {
      h1: 'そのページはありません',
      ledeA: 'たどられたアドレスは、このサイトには存在しません。もともと無かったか、記事を移したあとにリンクが残っていたかのどちらかです。当サイトのページからここへ来られた場合は、',
      tellUs: 'お知らせください',
      ledeB: '。当方のリンク切れは、こちらの落ち度です。',
      frontA: 'または',
      frontLink: 'トップページ',
      frontB: 'からどうぞ。',
    },
    nav: {
      stuck: '困っていること',
      plan: '旅程をつくる',
      skipToContent: '本文へ',
      language: '言語',
      notAvailable: 'この言語ではまだ公開していません',
    },
    meta: {
      default: 'ドラマがきっかけで韓国へ。着いてからの実務を書きます — 看板の読み方、運賃、チケット、食事、病院。すべて韓国語の一次情報で確認しています。',
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
      ctaVisit: '韓国で訪ねる',
      ctaBring: '韓国のものを取り寄せる',
      ctaShipNote: '取り扱いと配送は国によって異なります。価格は各販売ページに表示された日付で確認したものです。',
      verifyNotice: (d) => `このページの最終確認日は ${d} です。営業時間・料金・営業状況は頻繁に変わります。出発前に公式ページでご確認ください。`,
      originalLabel: 'もとになった韓国語の原文',
    },
      place: {
        heading: '場所', name: '名称', address: '住所', status: '営業状況',
        access: '立ち入り', accessRestricted: '制限あり — 自由に入れる場所ではありません',
        bestSeason: '向いている季節', gettingThere: '行き方', transport: '交通費',
        admission: '入場料', bring: '持ち物',
        statusLabel: { operating: '営業中', temporarily_closed: '一時休業',
                       permanently_closed: '閉業', unknown: '未確認' },
      },

      notices: {
        affiliate: 'この記事にはアフィリエイトリンクが含まれます。リンク経由で予約・購入された場合、手数料を受け取ることがあります。読者の負担が増えることはありません。',
        noAffiliate: 'これは役に立つと考えて載せた通常のリンクです。掲載先との提携関係はなく、予約・購入があっても当方の収益にはなりません。関係が生じた場合は、この表示も変わります。',
        photoAngle: 'これは訪れる人向けに提案する撮影アングルであり、制作側が公表したカメラ位置ではありません。',
      },
      sourceChecked: '確認日',
      sourceType: {
        official_production: '公式 — 制作', official_interview: '公式 — インタビュー',
        official_social: '公式 — 公式アカウント', public_institution: '公的機関',
        reliable_media: '報道', aggregate_data: '集計データ',
        merchant_official: '販売元の公式サイト', editorial: '編集記事',
        community_tally: '掲示板スレッド — 件数を数えただけで、事実の出典にはしていません',
      },

      scene: {
        closed: 'この場所は閉業しました。撮影地の記録としてページは残しますが、予約・購入のリンクは削除しました。',
        photoHeading: '同じような写真を撮るには',
        whereToStand: '立つ位置',
        direction: '向く方向',
        framing: '構図',
        bestTime: '時間帯',
        crowdTip: '人を避けるには',
        props: '小物',
        itinerary: 'その日の予定に組み込む',
        nearby: 'すぐ近くの文化と歴史',
        slots: { morning: '午前', lunch: '昼', afternoon: '午後', evening: '夕方', night: '夜' },
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
      tellMe: '教えてください',
      wrongMid: '。訂正は公開の',
      ledgerLink: '「間違えたことの記録」',
      wrongTail: 'に、誰が見つけたかと一緒に残します。外部の方に指摘されたものも含めます——全部自分で気づいたふりをするのは、それ自体が小さな嘘だからです。',
      writtenBy: '執筆',
      colophonLead: 'この記事は、公開している',
      colophonPolicy: '編集方針',
      colophonTail: 'のもとで、AIの支援を受けて調査・執筆・事実確認を行いました。出典の確認、数字の照合、写真の確認は公開前に人が行っています。',
      ledger: '見つかった誤りは公開の記録に残しています。',
      spotted: '内容に誤りや古い情報を見つけましたか？',
      reportError: '誤りを知らせる',
    },
    home: {
      kicker: '韓国へ連れてきたのは、誰でしたか。',
      tagline: '看板を読む。運賃を知る。',
      sub: '旅行者が固まってしまう瞬間を、取り除いた韓国。',
      arrivalCta: '韓国に到着しますか？',
      arrivalCtaStrong: '最初の24時間を整える →',
      metaDescription: 'ドラマがきっかけで韓国へ。このサイトは現地で実際に効くほうを扱います — 看板の読み方、運賃、チケット、食事、病院。すべて韓国語の一次資料で確認しています。',
      kickers: { filming: 'ロケ地', kculture: 'K-カルチャー', now: '今の韓国',
                 decode: '言葉の意味', hangul: '看板を読む', guides: '文化と歴史' },
      scenesLead: 'ドラマ・映画・K-POP・ライブと、それが起きた場所。実際に立てるロケ地は、行き方と費用まで書きます。もう一方は作品そのもの — ある曲が二年遅れでチャートに戻ってきた理由や、話題だった映画が今も話題なのか。',
    },
    stuck: {
      heading: '困っていることは何ですか',
      lede: 'ここにある記事はすべて、旅行者がどうしていいか分からなくなった瞬間から始まっています。',
      ledeStrong: '答えはその行に書いてあります — クリックしなくてかまいません。',
      foot: (n) => `いまのところ${n}件です。次に何を書くかも、この一覧が決めています。ここに無いことで困りましたか。`,
      tellUs: '教えてください',
      footTail: '— 次の記事はそこから生まれます。',
      allLink: (n) => `${n}件すべてを一行の答えつきで見る →`,
      pageLede: 'このサイトの記事はすべて、旅行者がどうしていいか分からなくなった瞬間から始まっています。これが全一覧で、',
      pageLedeStrong: '答えはその行に書いてあります — クリックしなくてかまいません。',
      pageArrival: '着く前に準備しますか。',
      pageArrivalLink: '到着後24時間にやることを順番に並べたページがあります。',
      metaDescription: '韓国で旅行者が固まってしまう瞬間 — 空港、カード、看板、病院、規則 — に、一行の答えと、それを確認した記事へのリンクをつけた一覧です。',
    },
    arrival: {
      kicker: '韓国に着きますか',
      h1: '到着後24時間、やることを順番に',
      lede: '五つあります。ほとんどは出発前に自宅で済ませられることです。各項目は、数字をすべて韓国の一次資料で確認した記事につながっています。',
      metaDescription: '韓国に着く前後で整えるべき五つ — eSIM、カードと3Dセキュア、T-money、空港からの移動、そして知らないと戸惑う決まり。順番に並べ、確認済みの詳細はワンクリック先に。',
      preflight: '出発前に',
      pre1: '3Dセキュアについてカード会社に電話する',
      pre1Tail: '— 自宅からしかできない唯一の対処です。',
      pre2: 'SKTの音声eSIMをオンラインで買うなら、パスポート認証の受付は',
      pre2Strong: '韓国時間 8:00〜22:00',
      pre2Tail: 'です。午前1時に着いてからでは間に合いません。',
      pre3: '秘苑（後苑）のチケット',
      pre3Tail: 'は先に売り切れます。予定にあるなら今のうちに。',
      s1: 'スマホを使える状態にする',
      s1a: '旅行プラットフォームで売られている観光用eSIMの多くはデータ専用です。通信はできますが、使える韓国の010番号も通話もSMSもありません。支払う前に商品ページを読んでください。',
      s1b: '韓国の通信会社から買うデータeSIMには010番号が付きます。発信までしたい場合（SMS認証を求める予約アプリがあります）、手順は会社ごとに違います — SKTはオンラインで購入・認証（韓国時間8:00〜22:00）、KTとLG U+は空港カウンターでQRを受け取ります。',
      s1link: 'eSIM編 — 観光用eSIMでできること・できないこと',
      s1cta: 'eSIMを用意する',
      s2: '必要になる前にカードを使える状態にする',
      s2a: '外国のカードは、店や飲食店ではほぼ問題なく使えます。違うのは韓国のオンライン決済です — 多くが3Dセキュアを求め、未登録のカードは説明もなく拒否されます。',
      s2b: '対処は、出発前にカード会社へ電話することです。別の銀行のカードをもう一枚と、現金も持っていってください。',
      s2link: '3Dセキュア編 — かける電話と、聞くべき三つのこと',
      s3: '交通カードを手に入れる',
      s3a: 'T-money（ティモニ）は全国の地下鉄とバスで使えるチャージ式カードです。実物カードは空港のコンビニで買えます。通信会社のeSIMセットに付いてくることもあります。',
      s3b: 'モバイルT-moneyアプリが外国の端末で使えるかは確認中です。それまでは、実物カードが私たちが責任を持って言える答えです。',
      s3link: '地下鉄・バス・タクシーの実際の料金',
      s4: '空港から市内へ移動する',
      s4a: '仁川からは、一般列車が最も安く、直通列車が最速の鉄道、リムジンバスは宿の近くまで行き、終電後にはN6701／N6703という深夜バスがあります — 誰も教えてくれない選択肢です。',
      s4link: '仁川→ソウル比較 — 運賃、所要時間、そして午前1時問題',
      s4cta: '空港からの移動を予約する',
      s5: '戸惑う前に、決まりを知っておく',
      s5a: '韓国の列車に改札はありません — 指定された席に座る、それで手続きは終わりです。病院は予約なしで行けます。眼鏡は10分ほどでできます。そして看板は、アルファベットに一晩使えば壁紙ではなくなります。',
      s5link: '全一覧：旅行者が固まる瞬間と、一行の答え',
      sleep: '泊まる場所について',
      sleepBody: '立場は変えていません。ソウルのエリア選びガイドはまだなく、自分たちで見ていないホテルを勧めることはしません。できるのは、答えではなく検索そのものをお渡しすることです。下のリンクはTrip.comのソウル一覧を開きます——エリアはご自身で絞ってください。明洞・弘大・江南は、それぞれ別の旅になります。選び方のガイドは引き続き予定に入っています。',
    },
    footer2: {
      independent: '当サイトは独立した案内であり、放送局・事務所・アーティスト・公的機関のいずれとも関係がありません。',
      someAffiliate: '一部にアフィリエイトリンクを含みます。詳しくは',
      noAffiliate: '現在アフィリエイトリンクはなく、サイト内のどのリンクからも収益を得ていません。変われば、この一文も変わります —',
      disclosureWord: '開示ページ',
    },
  },
  'zh-hans': {
    notFound: {
      h1: '这个页面不在这里',
      ledeA: '你访问的地址在本站不存在——要么从来就没有，要么是我们移动了文章却留下了旧链接。如果是本站的某个链接把你带到这里的，',
      tellUs: '请告诉我们',
      ledeB: '：我们自己的死链是我们的问题，不是你的。',
      frontA: '或者从',
      frontLink: '首页',
      frontB: '开始。',
    },
    nav: {
      stuck: '卡住了？',
      plan: '规划行程',
      skipToContent: '跳到正文',
      language: '语言',
      notAvailable: '该语言尚未上线',
    },
    meta: {
      default: '因为韩剧来到韩国。我们写的是落地之后的事 —— 怎么看懂招牌、票价、门票、吃饭、看病，全部对照韩文一手资料核对。',
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
      ctaVisit: '到韩国走一趟',
      ctaBring: '把韩国带回家',
      ctaShipNote: '各国的供货与配送情况不同。价格以各商家页面所示日期确认为准。',
      verifyNotice: (d) => `本页最后核对日期为 ${d}。营业时间、价格与营业状态经常变动，出发前请以官方页面为准。`,
      originalLabel: '这段话的韩文原文',
    },
      place: {
        heading: '地点', name: '名称', address: '地址', status: '营业状况',
        access: '进入', accessRestricted: '有限制 —— 并非可自由进入的场所',
        bestSeason: '适合的季节', gettingThere: '怎么去', transport: '交通花费',
        admission: '门票', bring: '要带的东西',
        statusLabel: { operating: '营业中', temporarily_closed: '暂停营业',
                       permanently_closed: '已停业', unknown: '未核实' },
      },

      notices: {
        affiliate: '本文含有联盟推广链接。若你通过这些链接预订或购买，我们可能获得佣金，你的花费不会因此增加。',
        noAffiliate: '这些只是我们认为有用的普通链接。我们与这些商家没有联盟关系，你预订或购买我们也不会有收入。若这一点发生变化，本条说明也会随之修改。',
        photoAngle: '这是给到访者的建议拍摄角度，不是制作方公布的机位。',
      },
      sourceChecked: '查看日期',
      sourceType: {
        official_production: '官方 — 制作方', official_interview: '官方 — 访谈',
        official_social: '官方 — 官方账号', public_institution: '公共机构',
        reliable_media: '媒体报道', aggregate_data: '汇总数据',
        merchant_official: '商家官网', editorial: '编辑内容',
        community_tally: '论坛帖子 —— 我们只统计数量，不从中取事实',
      },

      scene: {
        closed: '此地已永久停业。我们保留这个页面作为拍摄地的记录，但已移除预订与购买链接。',
        photoHeading: '怎样拍出类似的照片',
        whereToStand: '站在哪里',
        direction: '朝哪个方向',
        framing: '构图',
        bestTime: '最佳时段',
        crowdTip: '避开人群',
        props: '小道具',
        itinerary: '把它排进你这一天',
        nearby: '就在附近的文化与历史',
        slots: { morning: '上午', lunch: '中午', afternoon: '下午', evening: '傍晚', night: '夜间' },
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
      tellMe: '请告诉我',
      wrongMid: '。更正会记入公开的',
      ledgerLink: '「我们错在哪里」的记录',
      wrongTail: '，并注明是谁发现的——包括由站外读者指出的那些，因为假装全是自己发现的，本身就是一个小谎。',
      writtenBy: '撰写',
      colophonLead: '本文依据公开的',
      colophonPolicy: '编辑方针',
      colophonTail: '，在 AI 协助下完成调查、撰写与事实核查；出处、数字与照片在发布前均由人工核对。',
      ledger: '我们发现的错误都公开记录在案。',
      spotted: '发现错误或过时的信息了吗？',
      reportError: '告诉我们',
    },
    home: {
      kicker: '是谁把你带到韩国的？',
      tagline: '看懂招牌，算清车费。',
      sub: '把让旅行者当场卡住的那些瞬间，从韩国里拿掉。',
      arrivalCta: '要落地韩国了吗？',
      arrivalCtaStrong: '把最初的 24 小时安排好 →',
      metaDescription: '因为韩剧来到韩国。本站写的是落地之后真正要用的部分 —— 看招牌、车费、门票、吃饭、看病，全部对照韩文一手资料核对。',
      kickers: { filming: '取景地', kculture: 'K-文化', now: '此刻的韩国',
                 decode: '这句话的意思', hangul: '看懂招牌', guides: '文化与历史' },
      scenesLead: '韩剧、电影、K-POP 与现场演出，以及它们发生的地方。有些是你可以真正站上去的取景地，我们会写怎么去、要花多少钱。另一些是作品本身 —— 一首歌为什么在两年后重新爬上榜单，或者当初人人都在谈的电影现在还有没有人谈。',
    },
    stuck: {
      heading: '你卡在哪一步',
      lede: '这里的每一篇，都始于旅行者当场不知道该怎么办的那一刻。',
      ledeStrong: '答案就写在那一行 —— 不点开也没关系。',
      foot: (n) => `目前有 ${n} 条。接下来写什么，也是由这份清单决定的。遇到了这里没有的问题吗？`,
      tellUs: '告诉我们',
      footTail: '—— 下一篇就是从那里来的。',
      allLink: (n) => `查看全部 ${n} 条问题与一行答案 →`,
      pageLede: '这个网站的每一篇文章，都始于旅行者当场不知道该怎么办的那一刻。这是完整清单，而且',
      pageLedeStrong: '答案就写在那一行 —— 不点开也没关系。',
      pageArrival: '想在落地前先准备好吗？',
      pageArrivalLink: '有一页把到达后 24 小时要做的事按顺序排好了。',
      metaDescription: '在韩国让旅行者当场卡住的那些瞬间 —— 机场、银行卡、招牌、看病、规定 —— 每一条都附一行答案，以及核对过的原文章链接。'
    },
    arrival: {
      kicker: '要落地韩国了吗',
      h1: '落地后 24 小时，按顺序安排',
      lede: '一共五件事，大部分在出发前坐在家里就能办完。每一步都链接到完整文章，里面的每个数字都对照韩文一手资料核对过。',
      metaDescription: '落地韩国前后要安排好的五件事 —— eSIM、银行卡与 3D Secure、T-money、机场到市区、以及不知道就会卡住的规定。按顺序排列，核对过的细节都在一次点击之外。',
      preflight: '出发前',
      pre1: '就 3D Secure 给发卡行打个电话',
      pre1Tail: '—— 这是唯一只能在家里做的事。',
      pre2: '要在线上买 SKT 的语音 eSIM 吗？它的护照认证受理时间是',
      pre2Strong: '韩国时间 8:00–22:00',
      pre2Tail: '，凌晨一点落地之后就来不及了。',
      pre3: '昌德宫后苑的门票',
      pre3Tail: '会提前售罄。如果在你的行程里，现在就订。',
      s1: '让手机能用',
      s1a: '旅行平台上卖的观光 eSIM 多数是纯流量：能上网，但没有可用的韩国 010 号码，不能通话也不能收发短信。付款前请先看商品页。',
      s1b: '从韩国运营商买的流量 eSIM 是带 010 号码的。如果你还要发短信（有些预订 App 会要求），各家流程不同 —— SK 电讯可线上购买与认证（韩国时间 8:00–22:00），KT 与 LG U+ 要在机场柜台领二维码。',
      s1link: 'eSIM 篇 —— 旅游 eSIM 能做什么、不能做什么',
      s1cta: '准备 eSIM',
      s2: '在需要之前先让卡能用',
      s2a: '你的外国卡在多数商店和餐厅都能刷。不一样的是韩国的线上结账 —— 很多会走 3D Secure，未登记的卡会被直接拒绝，而且不会给你有用的说明。',
      s2b: '解决办法是出发前给发卡行打个电话。另外带一张不同银行的卡，再带点现金。',
      s2link: '3D Secure 篇 —— 该打的电话，和要问的三个问题',
      s3: '拿一张交通卡',
      s3a: 'T-money（티머니）是全国地铁与巴士通用的储值卡。实体卡在机场便利店有售；有些运营商的 eSIM 套装会附赠一张。',
      s3b: '手机版 T-money 在外国手机上能否使用，我们还在核实。在那之前，实体卡是我们能负责任地推荐的答案。',
      s3link: '地铁、巴士、出租车实际要多少钱',
      s4: '从机场进市区',
      s4a: '从仁川出发：普通列车最便宜，直达列车是最快的轨道方式，机场大巴能到宿舍附近，末班车之后还有 N6701／N6703 深夜巴士 —— 这是没人会主动告诉你的选项。',
      s4link: '仁川 → 首尔对比 —— 票价、用时，以及凌晨一点的问题',
      s4cta: '预订机场交通',
      s5: '在被规定绊住之前先知道它们',
      s5a: '韩国的列车没有检票闸机 —— 坐到你的对号座位上，流程就结束了。诊所可以直接走进去。配眼镜大约十分钟。而招牌，在你用一个晚上认完字母之后，就不再只是背景了。',
      s5link: '完整清单：让旅行者卡住的每个瞬间，以及一行答案',
      sleep: '住哪里',
      sleepBody: '立场没有变：我们还没有首尔的区域选择指南，也不会推荐自己没有评估过的酒店。我们能做的是把搜索交给你，而不是给你一个答案——下面的链接会打开 Trip.com 的首尔列表，区域由你自己筛。明洞、弘大、江南是三种完全不同的旅行。怎么选，那份指南仍在计划中。',
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
