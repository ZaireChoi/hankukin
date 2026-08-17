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
        #
        # 2026-08-17: 10분마다 71건씩 두드리다 TourAPI 에 막혔다.
        #
        #   [실패] 석촌호수: (429) Too Many Requests
        #   [실패] 안양천: (429) Too Many Requests   ... 71건 전부
        #
        # 로그에는 「새로 받음 0곳」 으로 찍혔다. 받을 게 없어서가 아니라
        # **차단당해서 0곳**이었는데, 요약 한 줄로는 둘이 구별되지 않았다.
        # 하루 144번 두드릴 이유가 없다 — 사진 요청은 그렇게 자주 바뀌지 않는다.
        #
        # 그래서 쿨다운을 둔다. 다음에 돌 시각을 파일에 적어 두고 그 전에는 건너뛴다.
        # 429 를 보면 쿨다운을 12시간으로 늘린다. 막힌 문을 계속 두드리면 더 오래 막힌다.
        $outLog   = Join-Path $repo '.photo-fetch.log'
        $nextFile = Join-Path $repo '.photo-fetch.next'
        $now      = Get-Date
        $nextAt   = $null
        if (Test-Path $nextFile) {
          try { $nextAt = [datetime]::Parse((Get-Content $nextFile -Raw).Trim()) } catch { $nextAt = $null }
        }

        if ($nextAt -and $now -lt $nextAt) {
          # 조용히 건너뛴다. 매 실행마다 로그를 한 줄씩 남기면 로그가 이걸로 가득 찬다.
        }
        else {
          try {
            $result = & $ps *>&1
            $result | Out-File -FilePath $outLog -Encoding UTF8
            $summary = ($result | Where-Object { $_ -match '요청 \d+건' } | Select-Object -Last 1)

            $throttled = @($result | Where-Object { $_ -match '429|Too Many Requests' }).Count
            if ($throttled -gt 0) {
              $cool = 12
              Log "요청 사진 수집: **429 차단 $throttled 건** — 12시간 쉰다. 새로 받은 것이 없는 이유는 차단이다"
            } else {
              $cool = 6
              Log ("요청 사진 수집: " + $(if ($summary) { $summary } else { '완료' }))
            }
            $now.AddHours($cool).ToString('o') | Set-Content -Path $nextFile -Encoding UTF8
          }
          catch {
            Log "요청 사진 수집 실패: $($_.Exception.Message)"
            (Get-Date).AddHours(1).ToString('o') | Set-Content -Path $nextFile -Encoding UTF8
          }
        }
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
    elseif ($h) { Log "  경고: node-path.txt 에 적힌 경로가 실제로 없습니다 -> $h" }
  }
  # 여기까지 못 찾았으면 **디스크를 직접 뒤진다.** (2026-08-17 추가)
  #
  # 왜. 8/16 밤에 이 스크립트가 검증 실패로 푸시를 막았고 — 막은 것 자체는 맞다 —
  # 그 상태로 커밋 15개가 로컬에만 쌓여 있었다. **막혔다는 걸 아무도 안 봤다.**
  # 알림이 없으면 '안전하게 멈춤' 은 '조용히 멈춤' 과 구별되지 않는다.
  # 흔한 설치처를 넓게 뒤지고, 그래도 없으면 **무엇을 뒤졌는지 로그에 남긴다.**
  if (-not $node) {
    $roots = @("$env:LOCALAPPDATA\nvs", "$env:LOCALAPPDATA\fnm_multishells", "$env:LOCALAPPDATA\Volta",
               "$env:USERPROFILE\scoop\apps\nodejs", "$env:ProgramData\chocolatey\lib\nodejs",
               "$env:LOCALAPPDATA\Microsoft\WinGet\Packages") | Where-Object { Test-Path $_ }
    foreach ($r in $roots) {
      $cand = Get-ChildItem $r -Filter node.exe -Recurse -Depth 4 -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if ($cand) { $node = $cand.FullName; Log "  node 를 찾았습니다: $node"; break }
    }
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
    #
    # 2026-08-17: 여기서 출력을 $null 로 버리고 있었다.
    #
    # 그래서 로그에는 「중단: 빌드 실패」 한 줄만 남았고,
    # **어느 게이트가 왜 세웠는지는 아무 데도 안 남았다.**
    # 게이트를 열세 개 만들어 놓고 어느 게 걸렸는지 못 보는 건 절반만 만든 것이다.
    #
    # 전체 출력은 .build-fail.log 에, 사람이 읽을 첫 줄은 .auto-push.log 에 적는다.
    $buildLog = Join-Path $repo '.build-fail.log'
    $out = & $npm run build *>&1
    if ($LASTEXITCODE -ne 0) {
      $out | Out-File -FilePath $buildLog -Encoding UTF8
      # 게이트는 Error 로 던진다. 그 문장을 찾아 첫 줄만 옮긴다.
      $why = ($out | Where-Object { $_ -match '\[ERROR\]|Error:|있습니다|없습니다|실패' } | Select-Object -First 1)
      if ($why) { Log ("중단: 빌드 실패 — " + ($why -replace '\s+', ' ').Trim()) }
      else      { Log "중단: 빌드 실패 (이유를 못 찾음 — .build-fail.log 를 여십시오)" }
      Log "  전체 출력: .build-fail.log"
      exit 1
    }
    if (Test-Path $buildLog) { Remove-Item $buildLog -ErrorAction SilentlyContinue }
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
    #
    # 여기서 그냥 멈추면 **아무도 모른다** (2026-08-17 에 실제로 그랬다).
    # 커밋 15건이 로컬에만 쌓여 있었고, 외부 평가가 지적할 때까지 몰랐다.
    # 그래서 ① 눈에 띄게 적고 ② 고치는 명령을 그대로 찍고
    # ③ 밀린 건수가 쌓이면 **화면에 창을 띄운다.** 조용한 정지는 정지가 아니다.
    #
    Log ""
    Log "════════════════════════════════════════════════════════════"
    Log " 올리지 못했습니다. 커밋 $held 건이 이 PC 에만 있습니다."
    Log "════════════════════════════════════════════════════════════"
    if (-not $node) { Log "  · node.exe 를 못 찾았습니다" }
    if (-not $npm)  { Log "  · npm.cmd 를 못 찾았습니다" }
    Log ""
    Log "  고치는 법 — PowerShell 에서 아래 한 줄:"
    Log ""
    Log "    where.exe node | Select-Object -First 1 | Set-Content `"$hint`""
    Log ""
    Log "  node 가 설치돼 있지 않다면 https://nodejs.org 에서 LTS 를 받으십시오."
    Log "  그 뒤 이 스크립트를 다시 실행하면 밀린 $held 건이 한 번에 올라갑니다."
    Log "════════════════════════════════════════════════════════════"

    # 조용히 쌓이는 것을 막는다. 3건을 넘으면 사람을 부른다.
    if ($held -ge 3) {
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        [System.Windows.Forms.MessageBox]::Show(
          "HANKUKIN: 커밋 $held 건이 올라가지 못하고 이 PC 에만 있습니다.`n`n" +
          "원인: node/npm 을 찾지 못해 발행 전 검증을 못 했습니다.`n" +
          "게이트를 통과 못 한 것을 올리지 않는 것은 의도된 동작입니다.`n`n" +
          "PowerShell 에서:`n" +
          "  where.exe node | Select-Object -First 1 | Set-Content `"$hint`"`n`n" +
          "로그: $logFile",
          'HANKUKIN — 발행이 멈춰 있습니다', 'OK', 'Warning') | Out-Null
      } catch { Log "  (알림 창을 띄우지 못했습니다 — 로그만 남깁니다)" }
    }
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
