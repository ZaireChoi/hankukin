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

  # ── 1. 변경이 없으면 조용히 끝낸다 ────────────────────────────
  $status = & $git status --porcelain
  if (-not $status) { Log "실행: 변경 없음"; exit 0 }

  $changed = ($status | Measure-Object -Line).Lines
  Log "실행: 변경 $changed 건 — 검증 시작"

  # ── 2. 단위 테스트 ────────────────────────────────────────────
  $c = Get-Command node -ErrorAction SilentlyContinue
  $node = if ($c) { $c.Source } else { $null }
  if ($node) {
    $failed = $false
    Get-ChildItem (Join-Path $repo 'scripts\__tests__\*.test.mjs') | ForEach-Object {
      & $node $_.FullName *> $null
      if ($LASTEXITCODE -ne 0) { Log "  테스트 실패: $($_.Name)"; $failed = $true }
    }
    if ($failed) { Log "중단: 테스트 실패 — 올리지 않습니다"; exit 1 }
  } else {
    Log "  경고: node 를 찾지 못해 테스트를 건너뜁니다"
  }

  # ── 3. 빌드 (스키마 위반·이미지 누락이 여기서 걸린다) ─────────
  if ($npm) {
    & $npm run build *> $null
    if ($LASTEXITCODE -ne 0) { Log "중단: 빌드 실패 — 올리지 않습니다"; exit 1 }
  } else {
    Log "  경고: npm 을 찾지 못해 빌드를 건너뜁니다"
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
  $msg = "auto($area): $changed files - verified"

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
