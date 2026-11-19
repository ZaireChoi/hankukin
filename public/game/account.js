/*
 * HANKUKIN PLAY 계정 로더. 이 파일은 거의 바꾸지 않는다.
 * 호스팅이 JS 파일을 브라우저에 4시간 캐시하므로, 실제 코드(account-core.js)는
 * 10분 단위 버전 번호를 붙여 불러와 수정이 빨리 반영되게 한다.
 * 사용법은 그대로:  <script type="module" src="/game/account.js" data-game="anibrix" data-prefix="anibrix_"></script>
 */
const s = document.querySelector('script[src*="/game/account.js"]');
window.__HKACC_CFG = s ? Object.assign({}, s.dataset) : {};
import('/game/account-core.js?v=' + Math.floor(Date.now() / 600000));