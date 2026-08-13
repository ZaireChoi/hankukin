# 자동 푸시 — 검증을 통과한 변경만 올린다.
#
# 왜 만들었나 (2026-08-13):
#   하루에 "푸시했어" 를 열 번 치셨다. 사람이 매번 붙어야 하는 것은 자동화가 아니다.
#
# 왜 지금 수동 푸시보다 안전한가:
#   지금은 검증 없이 올린다. 이 스크립트는 테스트와 빌드를 먼저 돌리고,
#   하나라도 깨지면 **올리지 않는다.** 깨진 코드가 배포로 나가는 것을 막는다.
#
# 설치: Windows 작업 스케줄러에서 10분마다 실행
#   프로그램: powershell.exe
#   인수:     -ExecutionPolicy Bypass -File "C:\Users\user\hankukin\scripts\auto-push.ps1"
#
# 로그: hankukin\.auto-push.log (저장소에는 올라가지 않음)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$logFile = Join-Path $repo '.auto-push.log'

function Log($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $logFile -Value $line -Encoding UTF8
}

Set-Location $repo

# ── 1. 변경이 없으면 아무것도 하지 않는다 ──────────────────────
$status = git status --porcelain
if (-not $status) { exit 0 }

$changed = ($status | Measure-Object -Line).Lines
Log "변경 $changed 건 감지 — 검증 시작"

# ── 2. 단위 테스트 ─────────────────────────────────────────────
$failed = $false
Get-ChildItem "scripts\__tests__\*.test.mjs" | ForEach-Object {
  & node $_.FullName *> $null
  if ($LASTEXITCODE -ne 0) { Log "테스트 실패: $($_.Name)"; $failed = $true }
}
if ($failed) { Log "테스트 실패 — 푸시하지 않습니다"; exit 1 }

# ── 3. 빌드 ────────────────────────────────────────────────────
# 스키마 위반(출처 누락·점수 미달·이미지 파일 없음)은 여기서 걸린다.
& npm run build *> $null
if ($LASTEXITCODE -ne 0) { Log "빌드 실패 — 푸시하지 않습니다"; exit 1 }

# ── 4. 커밋 메시지를 변경 내용에서 만든다 ──────────────────────
$files = git status --porcelain | ForEach-Object { ($_ -split '\s+', 3)[-1] }
$area =
  if     ($files -match '^src/content/')        { 'content' }
  elseif ($files -match '^scripts/')            { 'scripts' }
  elseif ($files -match '^src/')                { 'site' }
  elseif ($files -match '^\.github/')           { 'ci' }
  elseif ($files -match '^data/')               { 'data' }
  else                                          { 'chore' }
$msg = "auto($area): $changed files — verified by tests+build"

# ── 5. 올린다 ──────────────────────────────────────────────────
try {
  git add -A
  git commit -m $msg | Out-Null
  git pull --rebase 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Log "rebase 충돌 — 사람이 확인해야 합니다"; exit 1 }
  git push 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Log "푸시 실패 — 인증 또는 네트워크 확인"; exit 1 }
  Log "푸시 완료: $msg"
} catch {
  Log "예외: $($_.Exception.Message)"
  exit 1
}
