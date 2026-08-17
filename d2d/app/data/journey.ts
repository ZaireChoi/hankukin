import type { Stop, JourneyCategory, JourneyOption } from "../lib/types";

// Trip content. Adding a language here means adding fields (ja / zhHans / zhHant
// or titleJa / titleZhHans ...), never touching JSX — see app/i18n/index.ts.

export const transport = [
  ["TRANSIT", "대중교통", "Transit"], ["DRIVE", "자가용", "My car"], ["RENT", "렌터카", "Rental car"], ["RAIL", "기차", "Train"],
  ["BUS", "고속·시외버스", "Intercity bus"], ["AIR", "국내선", "Domestic flight"], ["INTL", "국제선", "International flight"], ["FERRY", "여객선", "Ferry"], ["MIX", "혼합경로", "Mixed route"],
] as const;

/**
 * A journey starts at the traveler's own door and ends there again.
 * Nothing between those two points is assumed — the middle is built from the
 * cities the traveler actually picks.
 */
export const initialStops: Stop[] = [
  { id:1, ko:"우리 집", en:"My home", kind:"HOME", locked:true },
  { id:2, ko:"우리 집", en:"My home", kind:"RETURN", locked:true },
];

export const journeyCategories:{id:JourneyCategory;ko:string;en:string}[] = [
  {id:"all",ko:"전체",en:"All"},{id:"heritage",ko:"문화재",en:"Heritage"},{id:"family",ko:"가족·체험",en:"Family"},
  {id:"experience",ko:"한국 체험",en:"K-experience"},{id:"food",ko:"식사·카페",en:"Food"},{id:"shopping",ko:"쇼핑",en:"Shopping"},
  {id:"comfort",ko:"날씨·컨디션",en:"Comfort"},{id:"rest",ko:"휴식",en:"Rest"},
];

// journeyOptions moved to app/data/places/ — options are per-city now.


export const samplePlans = [
  {id:1,tagKo:"균형 추천",tagEn:"BEST BALANCE",titleKo:"서울·경주·부산 분할형",titleEn:"Seoul, Gyeongju & Busan split stay",routeKo:"서울 3박 → 경주 2박 → 부산 2박",routeEn:"Seoul 3N → Gyeongju 2N → Busan 2N",total:7840000,air:3200000,stay:1920000,intercity:620000,local:340000,food:1120000,experience:440000,other:200000,hotelKo:"지역별 숙소 3곳 · 변경 2회",hotelEn:"3 regional stays · 2 changes",walk:"6.2 km/day",score:92},
  {id:2,tagKo:"최저 경비",tagEn:"LOWEST COST",titleKo:"서울 거점·지방 당일형",titleEn:"Seoul hub with regional day trips",routeKo:"서울 7박 · 경주·수원 당일",routeEn:"Seoul 7N · Gyeongju & Suwon day trips",total:6490000,air:3000000,stay:1440000,intercity:480000,local:270000,food:880000,experience:240000,other:180000,hotelKo:"서울 숙소 1곳 · 변경 없음",hotelEn:"1 Seoul stay · no change",walk:"7.8 km/day",score:84},
  {id:3,tagKo:"최소 이동",tagEn:"LESS MOVING",titleKo:"서울 집중·근교 확장형",titleEn:"Seoul focus with nearby excursions",routeKo:"서울 6박 → 인천 1박",routeEn:"Seoul 6N → Incheon 1N",total:7320000,air:3200000,stay:1800000,intercity:550000,local:350000,food:920000,experience:320000,other:180000,hotelKo:"숙소 2곳 · 장거리 최소",hotelEn:"2 stays · minimal long-distance travel",walk:"5.4 km/day",score:86},
  {id:4,tagKo:"지역 몰입",tagEn:"REGIONAL DEPTH",titleKo:"도착 즉시 지방 이동형",titleEn:"Direct-to-region on arrival",routeKo:"인천 → 경주 3박 → 부산 3박 → 서울 1박",routeEn:"Incheon → Gyeongju 3N → Busan 3N → Seoul 1N",total:8150000,air:3200000,stay:2040000,intercity:680000,local:400000,food:1120000,experience:500000,other:210000,hotelKo:"지역 우선 숙소 3곳",hotelEn:"3 region-first stays",walk:"6.8 km/day",score:89},
  {id:5,tagKo:"문화유산",tagEn:"HERITAGE",titleKo:"서울 고궁·경주 문화재 집중형",titleEn:"Seoul palaces & Gyeongju heritage",routeKo:"서울 3박 → 경주 3박 → 부산 1박",routeEn:"Seoul 3N → Gyeongju 3N → Busan 1N",total:7620000,air:3200000,stay:1800000,intercity:620000,local:340000,food:1000000,experience:460000,other:200000,hotelKo:"문화재 접근성 우선",hotelEn:"Stays optimized for heritage access",walk:"8.1 km/day",score:90},
  {id:6,tagKo:"뷰티·쇼핑",tagEn:"BEAUTY & SHOPPING",titleKo:"시술·쇼핑 회복동선형",titleEn:"Beauty, recovery & shopping route",routeKo:"서울 6박 → 인천 1박",routeEn:"Seoul 6N → Incheon 1N",total:9240000,air:3200000,stay:2400000,intercity:440000,local:300000,food:1080000,experience:1560000,other:260000,hotelKo:"예약기관 인접 · 회복일 포함",hotelEn:"Near appointments · recovery days included",walk:"3.9 km/day",score:88},
  {id:7,tagKo:"가족 테마",tagEn:"FAMILY THEME",titleKo:"테마파크·워터파크 중심형",titleEn:"Theme park & water park family route",routeKo:"서울 4박 → 용인 2박 → 인천 1박",routeEn:"Seoul 4N → Yongin 2N → Incheon 1N",total:8940000,air:3200000,stay:2100000,intercity:540000,local:380000,food:1200000,experience:1280000,other:240000,hotelKo:"가족객실·셔틀 접근 우선",hotelEn:"Family rooms & shuttle access",walk:"5.2 km/day",score:87},
  {id:8,tagKo:"렌터카",tagEn:"ROAD TRIP",titleKo:"지방 자가운전 순환형",titleEn:"Regional self-drive loop",routeKo:"서울 → 경주 → 부산 → 전주 → 서울",routeEn:"Seoul → Gyeongju → Busan → Jeonju → Seoul",total:8420000,air:3200000,stay:1920000,intercity:1150000,local:250000,food:1000000,experience:680000,other:220000,hotelKo:"주차·편도반납 조건 반영",hotelEn:"Parking & one-way return considered",walk:"4.1 km/day",score:85},
  {id:9,tagKo:"최단 시간",tagEn:"FASTEST",titleKo:"국제선·KTX 빠른 연결형",titleEn:"Fast air and KTX connections",routeKo:"서울 2박 → 경주 2박 → 부산 2박 → 서울 1박",routeEn:"Seoul 2N → Gyeongju 2N → Busan 2N → Seoul 1N",total:8080000,air:3400000,stay:1920000,intercity:750000,local:320000,food:1000000,experience:480000,other:210000,hotelKo:"역 접근성 최우선",hotelEn:"Station access prioritized",walk:"6.0 km/day",score:91},
  {id:10,tagKo:"유연 일정",tagEn:"FLEXIBLE",titleKo:"무료취소·날씨대응형",titleEn:"Flexible, weather-ready route",routeKo:"서울 3박 → 경주 2박 → 부산 2박",routeEn:"Seoul 3N → Gyeongju 2N → Busan 2N",total:8340000,air:3360000,stay:2000000,intercity:680000,local:340000,food:1000000,experience:720000,other:240000,hotelKo:"무료취소 후보 우선",hotelEn:"Free-cancellation options prioritized",walk:"5.7 km/day",score:89},
] as const;

export const sampleDays = [
  {ko:"입국·서울",en:"Arrival & Seoul",scope:"korea",stops:[{time:"06:30",ko:"도착공항·입국",en:"Arrival airport & immigration"},{time:"09:10",ko:"공항철도·서울 이동",en:"Airport rail to Seoul"},{time:"11:00",ko:"숙소 짐 보관",en:"Leave bags at stay"},{time:"13:00",ko:"서울 첫 동선",en:"First Seoul route"}]},
  {ko:"서울 문화",en:"Seoul culture",scope:"city",stops:[{time:"08:30",ko:"숙소 출발",en:"Leave stay"},{time:"09:00",ko:"고궁권역",en:"Palace district"},{time:"12:30",ko:"지역 음식",en:"Local lunch"},{time:"14:00",ko:"전통문화권역",en:"Traditional culture district"},{time:"18:00",ko:"숙소 복귀",en:"Return to stay"}]},
  {ko:"서울 생활문화",en:"Local Seoul",scope:"street",stops:[{time:"09:30",ko:"지하철 출구 접근",en:"Reach subway exit"},{time:"10:00",ko:"동네 산책권역",en:"Neighbourhood walk"},{time:"13:00",ko:"카페·쇼핑",en:"Cafe & shopping"},{time:"17:30",ko:"버스·지하철 복귀",en:"Bus/subway return"}]},
  {ko:"서울→경주",en:"Seoul to Gyeongju",scope:"korea",stops:[{time:"07:10",ko:"숙소 체크아웃",en:"Check out"},{time:"08:30",ko:"KTX 탑승",en:"Board KTX"},{time:"10:35",ko:"신경주역 도착",en:"Arrive Singyeongju"},{time:"11:20",ko:"경주 숙소 짐 보관",en:"Leave bags at Gyeongju stay"}]},
  {ko:"경주 문화재",en:"Gyeongju heritage",scope:"city",stops:[{time:"08:40",ko:"숙소 출발",en:"Leave stay"},{time:"09:10",ko:"문화재 권역 1",en:"Heritage cluster 1"},{time:"12:20",ko:"점심·휴식",en:"Lunch & rest"},{time:"14:00",ko:"문화재 권역 2",en:"Heritage cluster 2"}]},
  {ko:"경주→부산",en:"Gyeongju to Busan",scope:"korea",stops:[{time:"09:00",ko:"경주 출발",en:"Leave Gyeongju"},{time:"10:30",ko:"부산 도착",en:"Arrive Busan"},{time:"11:20",ko:"숙소 짐 보관",en:"Leave bags at stay"},{time:"13:00",ko:"해안권역",en:"Coastal district"}]},
  {ko:"부산",en:"Busan",scope:"city",stops:[{time:"09:00",ko:"숙소 출발",en:"Leave stay"},{time:"09:40",ko:"시장·문화권역",en:"Market & culture district"},{time:"13:20",ko:"해안 관광",en:"Coastal visit"},{time:"19:00",ko:"숙소 복귀",en:"Return to stay"}]},
  {ko:"귀국",en:"Return home",scope:"korea",stops:[{time:"07:00",ko:"숙소 체크아웃",en:"Check out"},{time:"09:30",ko:"공항 이동",en:"Transfer to airport"},{time:"12:30",ko:"국제선 체크인",en:"International check-in"},{time:"16:00",ko:"귀국편 출발",en:"Return flight"}]},
] as const;

export const mapData = {
  korea:[{x:25,y:20,ko:"서울",en:"Seoul"},{x:57,y:55,ko:"경주",en:"Gyeongju"},{x:70,y:78,ko:"부산",en:"Busan"}],
  city:[{x:22,y:68,ko:"숙소",en:"Stay"},{x:38,y:36,ko:"관광권역 1",en:"Cluster 1"},{x:62,y:28,ko:"식사",en:"Meal"},{x:76,y:62,ko:"관광권역 2",en:"Cluster 2"}],
  street:[{x:17,y:70,ko:"출구",en:"Exit"},{x:35,y:51,ko:"횡단",en:"Cross"},{x:57,y:48,ko:"정류장",en:"Stop"},{x:80,y:25,ko:"입구",en:"Entrance"}],
} as const;

export const originLocations = {
  india:{ko:"인도",en:"India",cities:[
    {id:"hyderabad",ko:"하이데라바드",en:"Hyderabad",areas:["Financial District","Gachibowli","HITEC City","Madhapur","Banjara Hills","Jubilee Hills","Kondapur"]},
    {id:"delhi",ko:"델리",en:"Delhi",areas:["New Delhi","Gurugram","Noida","South Delhi","Aerocity"]},
    {id:"mumbai",ko:"뭄바이",en:"Mumbai",areas:["Bandra","Andheri","Colaba","Powai","Navi Mumbai"]},
    {id:"bengaluru",ko:"벵갈루루",en:"Bengaluru",areas:["Whitefield","Koramangala","Indiranagar","Electronic City","MG Road"]},
    {id:"chennai",ko:"첸나이",en:"Chennai",areas:["T Nagar","Anna Nagar","OMR","Guindy","Adyar"]},
  ]},
  korea:{ko:"대한민국",en:"South Korea",cities:[
    {id:"seoul",ko:"서울",en:"Seoul",areas:["강남구","종로구","마포구","송파구","영등포구","용산구"]},
    {id:"daegu",ko:"대구",en:"Daegu",areas:["수성구","동구","중구","달서구","북구"]},
    {id:"busan",ko:"부산",en:"Busan",areas:["해운대구","부산진구","수영구","중구","동구"]},
    {id:"incheon",ko:"인천",en:"Incheon",areas:["중구","연수구","남동구","부평구","서구"]},
  ]},
  usa:{ko:"미국",en:"United States",cities:[
    {id:"new-york",ko:"뉴욕",en:"New York",areas:["Manhattan","Brooklyn","Queens","Jersey City"]},
    {id:"los-angeles",ko:"로스앤젤레스",en:"Los Angeles",areas:["Downtown","Koreatown","Hollywood","Santa Monica"]},
    {id:"san-francisco",ko:"샌프란시스코",en:"San Francisco",areas:["Downtown","SoMa","Mission","Oakland"]},
  ]},
  japan:{ko:"일본",en:"Japan",cities:[
    {id:"tokyo",ko:"도쿄",en:"Tokyo",areas:["Shinjuku","Shibuya","Ginza","Ueno","Asakusa"]},
    {id:"osaka",ko:"오사카",en:"Osaka",areas:["Namba","Umeda","Tennoji","Shin-Osaka"]},
    {id:"fukuoka",ko:"후쿠오카",en:"Fukuoka",areas:["Hakata","Tenjin","Nakasu","Fukuoka Airport"]},
  ]},
  vietnam:{ko:"베트남",en:"Vietnam",cities:[
    {id:"hanoi",ko:"하노이",en:"Hanoi",areas:["Hoan Kiem","Ba Dinh","Tay Ho","Cau Giay"]},
    {id:"hochiminh",ko:"호찌민",en:"Ho Chi Minh City",areas:["District 1","District 2","District 3","District 7"]},
    {id:"danang",ko:"다낭",en:"Da Nang",areas:["Hai Chau","My Khe","Son Tra","Ngu Hanh Son"]},
  ]},
  china:{ko:"중국",en:"China",cities:[
    {id:"beijing",ko:"베이징",en:"Beijing",areas:["Dongcheng","Chaoyang","Haidian","Shunyi"]},{id:"shanghai",ko:"상하이",en:"Shanghai",areas:["Huangpu","Pudong","Jing'an","Hongqiao"]},{id:"guangzhou",ko:"광저우",en:"Guangzhou",areas:["Tianhe","Yuexiu","Haizhu","Baiyun"]},{id:"shenzhen",ko:"선전",en:"Shenzhen",areas:["Futian","Nanshan","Luohu","Bao'an"]},{id:"chengdu",ko:"청두",en:"Chengdu",areas:["Jinjiang","Wuhou","Qingyang","Shuangliu"]},
  ]},
  taiwan:{ko:"대만",en:"Taiwan",cities:[{id:"taipei",ko:"타이베이",en:"Taipei",areas:["Zhongzheng","Xinyi","Da'an","Songshan"]},{id:"kaohsiung",ko:"가오슝",en:"Kaohsiung",areas:["Lingya","Gushan","Zuoying","Sinsing"]}]},
  hongkong:{ko:"홍콩",en:"Hong Kong",cities:[{id:"hong-kong",ko:"홍콩",en:"Hong Kong",areas:["Hong Kong Island","Kowloon","New Territories","Lantau"]}]},
  thailand:{ko:"태국",en:"Thailand",cities:[{id:"bangkok",ko:"방콕",en:"Bangkok",areas:["Sukhumvit","Silom","Siam","Riverside"]},{id:"chiang-mai",ko:"치앙마이",en:"Chiang Mai",areas:["Old City","Nimman","Chang Khlan","Mae Rim"]},{id:"phuket",ko:"푸껫",en:"Phuket",areas:["Phuket Town","Patong","Kata","Airport Area"]}]},
  singapore:{ko:"싱가포르",en:"Singapore",cities:[{id:"singapore",ko:"싱가포르",en:"Singapore",areas:["Central","Orchard","Marina Bay","Changi","Jurong"]}]},
  malaysia:{ko:"말레이시아",en:"Malaysia",cities:[{id:"kuala-lumpur",ko:"쿠알라룸푸르",en:"Kuala Lumpur",areas:["KLCC","Bukit Bintang","Bangsar","Putrajaya"]},{id:"penang",ko:"페낭",en:"Penang",areas:["George Town","Bayan Lepas","Tanjung Bungah"]}]},
  indonesia:{ko:"인도네시아",en:"Indonesia",cities:[{id:"jakarta",ko:"자카르타",en:"Jakarta",areas:["Central Jakarta","South Jakarta","West Jakarta","Tangerang"]},{id:"bali",ko:"발리",en:"Bali",areas:["Denpasar","Kuta","Ubud","Nusa Dua"]},{id:"surabaya",ko:"수라바야",en:"Surabaya",areas:["Central","West","East","Sidoarjo"]}]},
  philippines:{ko:"필리핀",en:"Philippines",cities:[{id:"manila",ko:"마닐라",en:"Manila",areas:["Makati","BGC","Pasay","Quezon City"]},{id:"cebu",ko:"세부",en:"Cebu",areas:["Cebu City","Mandaue","Lapu-Lapu","Mactan"]},{id:"davao",ko:"다바오",en:"Davao",areas:["Poblacion","Buhangin","Talomo","Airport Area"]}]},
  nepal:{ko:"네팔",en:"Nepal",cities:[{id:"kathmandu",ko:"카트만두",en:"Kathmandu",areas:["Thamel","Lalitpur","Bhaktapur","Airport Area"]},{id:"pokhara",ko:"포카라",en:"Pokhara",areas:["Lakeside","Damside","Bagar","Airport Area"]}]},
  bangladesh:{ko:"방글라데시",en:"Bangladesh",cities:[{id:"dhaka",ko:"다카",en:"Dhaka",areas:["Gulshan","Banani","Dhanmondi","Uttara"]},{id:"chattogram",ko:"치타공",en:"Chattogram",areas:["Agrabad","Panchlaish","Khulshi","Airport Area"]}]},
  uk:{ko:"영국",en:"United Kingdom",cities:[{id:"london",ko:"런던",en:"London",areas:["Central","Westminster","Camden","Heathrow Area"]},{id:"manchester",ko:"맨체스터",en:"Manchester",areas:["City Centre","Salford","Didsbury","Airport Area"]},{id:"edinburgh",ko:"에든버러",en:"Edinburgh",areas:["Old Town","New Town","Leith","Airport Area"]}]},
  france:{ko:"프랑스",en:"France",cities:[{id:"paris",ko:"파리",en:"Paris",areas:["Centre","La Défense","Montmartre","CDG Area"]},{id:"lyon",ko:"리옹",en:"Lyon",areas:["Presqu'île","Part-Dieu","Vieux Lyon","Airport Area"]},{id:"nice",ko:"니스",en:"Nice",areas:["Centre","Promenade","Old Town","Airport Area"]}]},
  germany:{ko:"독일",en:"Germany",cities:[{id:"berlin",ko:"베를린",en:"Berlin",areas:["Mitte","Kreuzberg","Charlottenburg","Airport Area"]},{id:"frankfurt",ko:"프랑크푸르트",en:"Frankfurt",areas:["Innenstadt","Sachsenhausen","Messe","Airport Area"]},{id:"munich",ko:"뮌헨",en:"Munich",areas:["Altstadt","Maxvorstadt","Schwabing","Airport Area"]}]},
  italy:{ko:"이탈리아",en:"Italy",cities:[{id:"rome",ko:"로마",en:"Rome",areas:["Centro Storico","Prati","Trastevere","Fiumicino"]},{id:"milan",ko:"밀라노",en:"Milan",areas:["Centro","Brera","Porta Nuova","Malpensa Area"]},{id:"venice",ko:"베네치아",en:"Venice",areas:["San Marco","Cannaregio","Mestre","Airport Area"]}]},
  spain:{ko:"스페인",en:"Spain",cities:[{id:"madrid",ko:"마드리드",en:"Madrid",areas:["Centro","Salamanca","Chamartín","Airport Area"]},{id:"barcelona",ko:"바르셀로나",en:"Barcelona",areas:["Eixample","Gothic Quarter","Gràcia","Airport Area"]}]},
  netherlands:{ko:"네덜란드",en:"Netherlands",cities:[{id:"amsterdam",ko:"암스테르담",en:"Amsterdam",areas:["Centrum","Zuid","West","Schiphol Area"]},{id:"rotterdam",ko:"로테르담",en:"Rotterdam",areas:["Centrum","Delfshaven","Kop van Zuid","Airport Area"]}]},
  switzerland:{ko:"스위스",en:"Switzerland",cities:[{id:"zurich",ko:"취리히",en:"Zurich",areas:["Altstadt","Enge","Oerlikon","Airport Area"]},{id:"geneva",ko:"제네바",en:"Geneva",areas:["Centre","Eaux-Vives","Carouge","Airport Area"]}]},
  brazil:{ko:"브라질",en:"Brazil",cities:[{id:"sao-paulo",ko:"상파울루",en:"São Paulo",areas:["Centro","Paulista","Pinheiros","Guarulhos Area"]},{id:"rio",ko:"리우데자네이루",en:"Rio de Janeiro",areas:["Centro","Copacabana","Ipanema","Galeão Area"]}]},
  argentina:{ko:"아르헨티나",en:"Argentina",cities:[{id:"buenos-aires",ko:"부에노스아이레스",en:"Buenos Aires",areas:["Microcentro","Palermo","Recoleta","Ezeiza Area"]},{id:"cordoba",ko:"코르도바",en:"Córdoba",areas:["Centro","Nueva Córdoba","Güemes","Airport Area"]}]},
  chile:{ko:"칠레",en:"Chile",cities:[{id:"santiago",ko:"산티아고",en:"Santiago",areas:["Centro","Providencia","Las Condes","Airport Area"]},{id:"valparaiso",ko:"발파라이소",en:"Valparaíso",areas:["Plan","Cerro Alegre","Viña del Mar","Port Area"]}]},
  peru:{ko:"페루",en:"Peru",cities:[{id:"lima",ko:"리마",en:"Lima",areas:["Miraflores","Barranco","San Isidro","Airport Area"]},{id:"cusco",ko:"쿠스코",en:"Cusco",areas:["Centro","San Blas","Wanchaq","Airport Area"]}]},
  colombia:{ko:"콜롬비아",en:"Colombia",cities:[{id:"bogota",ko:"보고타",en:"Bogotá",areas:["Chapinero","Zona Rosa","Centro","Airport Area"]},{id:"medellin",ko:"메데인",en:"Medellín",areas:["El Poblado","Laureles","Centro","Airport Area"]}]},
  canada:{ko:"캐나다",en:"Canada",cities:[{id:"toronto",ko:"토론토",en:"Toronto",areas:["Downtown","North York","Mississauga","Pearson Area"]},{id:"vancouver",ko:"밴쿠버",en:"Vancouver",areas:["Downtown","Richmond","Burnaby","YVR Area"]},{id:"montreal",ko:"몬트리올",en:"Montreal",areas:["Downtown","Old Montreal","Plateau","Airport Area"]}]},
  mexico:{ko:"멕시코",en:"Mexico",cities:[{id:"mexico-city",ko:"멕시코시티",en:"Mexico City",areas:["Centro","Polanco","Roma","Airport Area"]},{id:"monterrey",ko:"몬테레이",en:"Monterrey",areas:["Centro","San Pedro","Apodaca","Airport Area"]}]},
  australia:{ko:"호주",en:"Australia",cities:[{id:"sydney",ko:"시드니",en:"Sydney",areas:["CBD","Parramatta","Bondi","Airport Area"]},{id:"melbourne",ko:"멜버른",en:"Melbourne",areas:["CBD","Southbank","Carlton","Airport Area"]},{id:"brisbane",ko:"브리즈번",en:"Brisbane",areas:["CBD","South Bank","Fortitude Valley","Airport Area"]}]},
  newzealand:{ko:"뉴질랜드",en:"New Zealand",cities:[{id:"auckland",ko:"오클랜드",en:"Auckland",areas:["CBD","Newmarket","Manukau","Airport Area"]},{id:"wellington",ko:"웰링턴",en:"Wellington",areas:["CBD","Te Aro","Lower Hutt","Airport Area"]}]},
  saudi:{ko:"사우디아라비아",en:"Saudi Arabia",cities:[{id:"riyadh",ko:"리야드",en:"Riyadh",areas:["Olaya","Al Malqa","Diplomatic Quarter","Airport Area"]},{id:"jeddah",ko:"제다",en:"Jeddah",areas:["Al Hamra","Corniche","Al Rawdah","Airport Area"]}]},
  uae:{ko:"아랍에미리트",en:"United Arab Emirates",cities:[
    {id:"dubai",ko:"두바이",en:"Dubai",areas:["Downtown","Marina","Deira","Business Bay","Jumeirah"]},
    {id:"abu-dhabi",ko:"아부다비",en:"Abu Dhabi",areas:["Corniche","Yas Island","Al Reem Island","Airport Area"]},
  ]},
} as const;

export const originRegionGroups:{id:string;ko:string;en:string;countries:string[]}[] = [
  {id:"all",ko:"전 세계",en:"Worldwide",countries:[]},
  {id:"south-asia",ko:"남아시아",en:"South Asia",countries:["india","nepal","bangladesh"]},
  {id:"east-asia",ko:"동아시아",en:"East Asia",countries:["korea","china","japan","taiwan","hongkong"]},
  {id:"southeast-asia",ko:"동남아시아",en:"Southeast Asia",countries:["vietnam","thailand","singapore","malaysia","indonesia","philippines"]},
  {id:"europe",ko:"유럽",en:"Europe",countries:["uk","france","germany","italy","spain","netherlands","switzerland"]},
  {id:"americas",ko:"미주",en:"Americas",countries:["usa","canada","mexico","brazil","argentina","chile","peru","colombia"]},
  {id:"oceania",ko:"오세아니아",en:"Oceania",countries:["australia","newzealand"]},
  {id:"middle-east",ko:"중동",en:"Middle East",countries:["uae","saudi"]},
];

export const destinationRegions = [
  {id:"capital",ko:"수도권",en:"Capital",cities:["서울","인천","수원","용인","가평","파주"]},
  {id:"gangwon",ko:"강원",en:"Gangwon",cities:["강릉","속초","춘천","평창","원주","동해"]},
  {id:"chungcheong",ko:"충청",en:"Chungcheong",cities:["대전","공주","부여","단양","제천","천안"]},
  {id:"jeolla",ko:"전라",en:"Jeolla",cities:["전주","광주","여수","순천","목포","군산","담양"]},
  {id:"gyeongsang",ko:"경상",en:"Gyeongsang",cities:["경주","부산","대구","안동","통영","거제","진주","울산","포항"]},
  {id:"jeju",ko:"제주",en:"Jeju",cities:["제주시","서귀포"]},
] as const;
export const requestExamples = [
  "가족 4명이 서울·경주·부산을 7박 8일 여행하고 싶어요. 문화재와 음식 중심으로 지역별 숙소를 추천해 주세요.",
  "서울에서 5박 동안 뷰티체험과 쇼핑을 하고 싶어요. 숙소는 한 곳에 두고 많이 걷지 않는 일정으로 짜 주세요.",
  "한국 도착 후 바로 지방으로 이동해 경주·부산·제주를 여행하고 싶어요. 관광지와 문화재 중심으로 계획해 주세요.",
] as const;

export type OriginCountry = keyof typeof originLocations;
