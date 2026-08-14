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
  $stamp = Join-Path $repo '.last-media-fetch'
  $due = $true
  if (Test-Path $stamp) {
    $last = (Get-Item $stamp).LastWriteTime
    if ((Get-Date) - $last -lt [TimeSpan]::FromHours(12)) { $due = $false }
  }
  if ($due) {
    Log "사진 수집 시작 (12시간 주기)"
    $ps1 = Join-Path $PSScriptRoot 'fetch-heritage-images.ps1'
    if (Test-Path $ps1) {
      try { & $ps1 *> $null; Log "  궁궐 사진: 완료" }
      catch { Log "  궁궐 사진 실패: $($_.Exception.Message)" }
    }
    $ps2 = Join-Path $PSScriptRoot 'fetch-tourapi-images.ps1'
    if (Test-Path $ps2) {
      if (Test-Path (Join-Path $repo '.env.local')) {
        try { & $ps2 *> $null; Log "  촬영지 사진: 완료" }
        catch { Log "  촬영지 사진 실패: $($_.Exception.Message)" }
      } else {
        Log "  촬영지 사진: 건너뜀 (.env.local 없음 — 인증키 미설정)"
      }
    }
    Set-Content -Path $stamp -Value (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') -Encoding UTF8
  }

  # ── 1. 변경이 없으면 조용히 끝낸다 ────────────────────────────
  $status = & $git status --porcelain
  if (-not $status) { Log "실행: 변경 없음"; exit 0 }

  $changed = ($status | Measure-Object -Line).Lines
  Log "실행: 변경 $changed 건 — 검증 시작"

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
  & $git add -A
  & $git commit -m $msg *> $null
  if ($LASTEXITCODE -ne 0) { Log "중단: 커밋할 것이 없습니다"; exit 0 }

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
