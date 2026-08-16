# 자동 푸시 — 검증을 통과한 변경만 올린다.
#
# 왜 만들었나 (2026-08-13):
#   하루에 "푸시했어" 를 열 번 치셨다. 사람이 매번 붙어야 하는 것은 자동화가 아니다.
#
# 왜 수동 푸시보다 안전한가:
#   지금은 검증 없이 올린다. 이 스크립트는 테스트와 빌드를 먼저 돌리고,
#   하나라도 깨지면 올리지 않는다.
#
# 왜 처음부터 로그를 남기는가 (1차 시도에서 배운 것):
#   첫 버전은 변경이 있을 때만 로그를 썼다. 그래서 실행 자체가 안 된 것인지,
#   실행됐는데 죽은 것인지 구분할 수 없었다. 조용한 실패는 진단이 불가능하다.
#   이제 매 실행마다 한 줄을 남기고, 예외도 전부 기록한다.
#
# 설치: 자동푸시-등록.bat 더블클릭
# 로그: hankukin\.auto-push.log

$repo = Split-Path -Parent $PSScriptRoot
$logFile = Join-Path $repo '.auto-push.log'

function Log($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch { }
}

# ── 전체를 감싼다. 어떤 이유로 죽든 흔적이 남아야 한다 ──────────
try {
  Set-Location $repo

  # git / npm 이 PATH 에 없는 환경에서도 동작하도록.
  # ?. 연산자는 PowerShell 7 이상 전용이다 — 이 PC 는 5.1 이라 파서 오류가 났다 (2026-08-13).
  # 윈도우 기본 PowerShell 에서 도는 것이 중요하므로 5.1 문법만 쓴다.
  $c = Get-Command git -ErrorAction SilentlyContinue
  $git = if ($c) { $c.Source } else { $null }
  if (-not $git) {
    foreach ($p in @("$env:ProgramFiles\Git\cmd\git.exe", "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
                     "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe")) {
      if (Test-Path $p) { $git = $p; break }
    }
  }
  if (-not $git) { Log "중단: git 을 찾을 수 없습니다"; exit 1 }

  $c = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $c) { $c = Get-Command npm -ErrorAction SilentlyContinue }
  $npm = if ($c) { $c.Source } else { $null }

  # ── 0. 사진 수집 (하루 한 번) ─────────────────────────────────
  #
  # 왜 여기에 붙였나 (2026-08-14):
  #   사진 받을 때마다 운영자가 .bat 을 눌러야 했다. 그건 자동화가 아니다.
  #   이미 10분마다 도는 작업이 있으니, 새 등록 없이 여기에 얹는다.
  #   매번 돌면 낭비이므로 마지막 실행 시각을 파일로 남기고 12시간 간격을 둔다.
  #
  #   한국 공공데이터는 GitHub Actions(미국)에서 접속이 안 된다.
  #   그래서 이 PC 에서 받는 것이 유일한 방법이다.
  # ── 0. 요청된 장소 사진만 받는다 ──────────────────────────────
  #
  # 이전 설계는 12시간마다 궁궐 사진을 다시 받았다. 잘못이었다 —
  # 궁궐 기사는 이미 다 썼는데 같은 사진을 반복해서 받고 있었고,
  # 정작 지금 쓰는 기사의 장소 사진은 받지 않았다.
  #
  # 이제는 기사가 data\photo-requests.json 에 적어둔 것만 받는다.
  # 요청이 없으면 아무 일도 하지 않는다.
  $reqFile = Join-Path $repo 'data\photo-requests.json'
  if ((Test-Path $reqFile) -and (Test-Path (Join-Path $repo '.env.local'))) {
    $raw = Get-Content $reqFile -Raw -Encoding UTF8
    if ($raw -match '"requests"\s*:\s*\[\s*\{') {
      $ps = Join-Path $PSScriptRoot 'fetch-requested-images.ps1'
      if (Test-Path $ps) {
        # 출력을 버리면 왜 못 받았는지 알 수 없다 (2026-08-14).
        # 파일로 남기고, 요약 한 줄은 로그에도 적는다.
        #
        # 2>&1 로는 아무것도 잡히지 않았다 (2026-08-14 재수정).
        #   PowerShell 5.0 부터 Write-Host 는 정보 스트림(6번)으로 나간다.
        #   2>&1 은 오류 스트림만 받으므로 $result 가 항상 비었고,
        #   그것을 그대로 Out-File 해서 .photo-fetch.log 가 매번 빈 파일이 됐다.
        #   스크립트는 정상 동작하며 출력하고 있었는데 우리가 못 보고 있었다.
        #   *>&1 은 모든 스트림을 받는다.
        $outLog = Join-Path $repo '.photo-fetch.log'
        try {
          $result = & $ps *>&1
          $result | Out-File -FilePath $outLog -Encoding UTF8
          $summary = ($result | Where-Object { $_ -match '요청 \d+건' } | Select-Object -Last 1)
          Log ("요청 사진 수집: " + $(if ($summary) { $summary } else { '완료' }))
        }
        catch { Log "요청 사진 수집 실패: $($_.Exception.Message)" }
      }
    }
  }

  # ── 0. 이미 커밋됐지만 올라가지 않은 것을 먼저 밀어낸다 ────────
  #
  # 2026-08-14: 이것이 없어서 커밋 3 건이 한 시간 넘게 로컬에 갇혀 있었다.
  #   아래 '변경 없음' 검사는 **워킹트리만** 본다. 이미 커밋한 것은 변경이 아니므로
  #   매 실행마다 "변경 없음" 을 찍고 조용히 끝냈고, 고쳐 놓은 내용이 사이트에
  #   영영 반영되지 않았다. 운영자 화면에는 계속 옛 버전이 보였다.
  #
  #   '올릴 것이 없다' 와 '커밋할 것이 없다' 는 다른 말이다.
  #
  #   2026-08-16 밤: 이 자리가 5-b 를 정확히 무효로 만들고 있었다.
  #   5-b 는 검증 못한 커밋을 푸시하지 않고 남겨 둔다. 그런데 10분 뒤 이 문단이
  #   그것을 '밀린 커밋' 으로 보고 **그대로 올렸다.** 로그가 그것을 그대로 적어 두었다.
  #       07:10  중단: 검증하지 못해 올리지 않습니다
  #       07:20  밀린 커밋 2 건 — 푸시 → 밀린 커밋 푸시 완료
  #
  #   8/14 에 고친 것이 8/16 에 고친 것을 되돌렸다. 한 군데를 고치고 옆을 안 봤다.
  #
  #   그래서 여기서는 **세기만 한다.** 푸시는 검증을 통과한 뒤 한 자리에서만 일어난다.
  & $git fetch --quiet 2>&1 | Out-Null
  $backlog = 0
  $ahead = & $git rev-list --count '@{u}..HEAD' 2>$null
  if ($LASTEXITCODE -eq 0 -and $ahead) { $backlog = [int]$ahead }
  if ($backlog -gt 0) { Log "밀린 커밋 $backlog 건 — 검증 후에 함께 올린다" }

  # ── 1. 변경이 없으면 조용히 끝낸다 ────────────────────────────
  $status = & $git status --porcelain
  $changed = if ($status) { ($status | Measure-Object -Line).Lines } else { 0 }
  if ($changed -eq 0 -and $backlog -eq 0) { Log "실행: 변경 없음"; exit 0 }
  if ($changed -gt 0) { Log "실행: 변경 $changed 건 — 검증 시작" }
  else { Log "실행: 새 변경은 없고 밀린 커밋만 있다 — 그것을 검증한다" }

  # ── 2. 단위 테스트 ────────────────────────────────────────────
  # node.exe 는 PATH 에 없을 수 있다 (이 PC 가 그랬다). 흔한 설치 경로도 뒤진다.
  $c = Get-Command node -ErrorAction SilentlyContinue
  $node = if ($c) { $c.Source } else { $null }
  if (-not $node) {
    foreach ($p in @("$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe",
                     "$env:LOCALAPPDATA\Programs\nodejs\node.exe", "$env:APPDATA\nvm\node.exe",
                     "$env:ProgramFiles\nodejs\node_modules\npm\bin\node.exe")) {
      if (Test-Path $p) { $node = $p; break }
    }
  }
  # nvm-for-windows 는 버전마다 폴더가 다르다. 가장 최근 것을 쓴다.
  if (-not $node -and (Test-Path "$env:APPDATA\nvm")) {
    $cand = Get-ChildItem "$env:APPDATA\nvm\v*\node.exe" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($cand) { $node = $cand.FullName }
  }
  #
  # 마지막 수단 — 저장소 안의 한 줄짜리 파일로 직접 알려 준다.
  #
  #   scripts\node-path.txt  ->  C:\Program Files\nodejs\node.exe
  #
  # 예약 작업의 PATH 는 로그인 셸의 PATH 와 다르다. 명령창에서는 node 가 되는데
  # 예약 작업에서만 안 되는 일이 실제로 있었고, 그것 때문에 게이트 여섯 개가
  # 열흘 가까이 우회됐다. PATH 를 고치는 것이 정답이지만, 고치기 전까지
  # **사이트가 멈춰 있는 것보다는 이 파일 한 줄이 낫다.** (.gitignore 에 넣어 둔다)
  $hint = Join-Path $PSScriptRoot 'node-path.txt'
  if (-not $node -and (Test-Path $hint)) {
    $h = (Get-Content $hint -Raw).Trim()
    if ($h -and (Test-Path $h)) { $node = $h }
  }
  if ($node -and -not $npm) {
    $guess = Join-Path (Split-Path -Parent $node) 'npm.cmd'
    if (Test-Path $guess) { $npm = $guess }
  }
  $verified = $true      # 검증을 실제로 했는가. 건너뛰면 false 로 내려간다.
  if ($node) {
    $failed = $false
    Get-ChildItem (Join-Path $repo 'scripts\__tests__\*.test.mjs') | ForEach-Object {
      & $node $_.FullName *> $null
      if ($LASTEXITCODE -ne 0) { Log "  테스트 실패: $($_.Name)"; $failed = $true }
    }
    if ($failed) { Log "중단: 테스트 실패 — 올리지 않습니다"; exit 1 }
  } else {
    Log "  경고: node 를 찾지 못해 테스트를 건너뜁니다"
    $verified = $false
  }

  # ── 3. 빌드 (스키마 위반·이미지 누락이 여기서 걸린다) ─────────
  if ($npm) {
    & $npm run build *> $null
    if ($LASTEXITCODE -ne 0) { Log "중단: 빌드 실패 — 올리지 않습니다"; exit 1 }
  } else {
    Log "  경고: npm 을 찾지 못해 빌드를 건너뜁니다"
    $verified = $false
  }

  # ── 4. 커밋 메시지를 변경 내용에서 만든다 ─────────────────────
  $files = $status | ForEach-Object { ($_ -split '\s+', 3)[-1] }
  $area =
    if     ($files -match '^src/content/') { 'content' }
    elseif ($files -match '^scripts/')     { 'scripts' }
    elseif ($files -match '^src/')         { 'site' }
    elseif ($files -match '^\.github/')    { 'ci' }
    elseif ($files -match '^data/')        { 'data' }
    else                                   { 'chore' }
  # 검증을 건너뛰었으면 'verified' 라고 쓰지 않는다.
  # 확인하지 않은 것을 확인했다고 적으면, 나중에 커밋 로그를 믿을 수 없게 된다.
  $tag = if ($verified) { 'verified' } else { 'UNVERIFIED - node/npm missing' }
  $msg = "auto($area): $changed files - $tag"

  # ── 5. 올린다 ─────────────────────────────────────────────────
  if ($changed -gt 0) {
    & $git add -A
    & $git commit -m $msg *> $null
    if ($LASTEXITCODE -ne 0 -and $backlog -eq 0) { Log "중단: 커밋할 것이 없습니다"; exit 0 }
  }

  # ── 5-b. 검증하지 못했으면 **올리지 않는다** ────────────────────
  #
  # 2026-08-16 에 잡았다. 이 스크립트는 npm 을 못 찾으면 빌드를 건너뛰고,
  # 'UNVERIFIED' 라고 정직하게 적은 뒤 — **그대로 푸시하고 있었다.**
  #
  # 그러는 동안 우리는 게이트를 다섯 개 만들었다.
  #   no-shared-images · no-duplicate-files · photo-sanity
  #   content-quality(반복 구조 포함) · 원문 인용 길이
  # 전부 `astro build` 안에서만 돈다. **빌드를 건너뛰면 전부 우회된다.**
  # 사진 오매칭을 막는 장치도, 대장 누락을 막는 장치도 그때는 없는 것과 같다.
  #
  # 커밋은 남긴다 — 작업을 잃으면 안 되니까.
  # **푸시만 막는다.** 커밋은 되돌릴 수 있고 발행은 되돌리기 어렵다.
  if (-not $verified) {
    $held = $backlog + $(if ($changed -gt 0) { 1 } else { 0 })
    Log "중단: 검증하지 못해 올리지 않습니다 (커밋 $held 건이 남아 있습니다)"
    Log "  node/npm 을 PATH 에서 찾지 못했습니다. 설치 후 다시 실행하거나,"
    Log "  직접 'npm run build' 로 게이트를 통과시킨 뒤 'git push' 하십시오."
    exit 1
  }

  & $git pull --rebase *> $null
  if ($LASTEXITCODE -ne 0) { Log "중단: rebase 충돌 — 사람이 확인해야 합니다"; exit 1 }

  & $git push *> $null
  if ($LASTEXITCODE -ne 0) { Log "중단: 푸시 실패 — 인증 또는 네트워크 확인"; exit 1 }

  Log "완료: $msg"
}
catch {
  Log "예외: $($_.Exception.Message)"
  exit 1
}
