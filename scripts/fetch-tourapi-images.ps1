# 촬영지 사진 받기 — 한국관광공사 TourAPI.
#
# 왜 이 PC 에서 도는가 (2026-08-13 확인):
#   GitHub Actions(미국)에서는 .go.kr 사이트가 전부 'fetch failed' 였다.
#   같은 사이트가 이 PC(한국)에서는 정상이었다. 그래서 한국 소스는 여기서 받는다.
#
# 인증키:
#   저장소에 넣지 않는다. .env.local 에 두고, 그 파일은 .gitignore 로 제외돼 있다.
#   형식 — DATA_GO_KR_KEY=발급받은키
#
# 저작권:
#   이미지마다 cpyrhtDivCd 를 확인한다. Type1(출처표시)·Type3(변경금지)만 쓴다.
#   Type3 은 리사이즈하지 않는다. 줄이는 것도 '변경' 이다.
#   그 외·누락은 버린다. 모르면 안 쓴다.

$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo     = Split-Path -Parent $PSScriptRoot
$envFile  = Join-Path $repo '.env.local'
$locFile  = Join-Path $repo 'data\locations.json'
$outDir   = Join-Path $repo 'src\assets\images\scenes'
$metaFile = Join-Path $repo 'data\tourapi-images.result.json'
$base     = 'https://apis.data.go.kr/B551011/KorService2'
$maxWidth = 1600

# ── 인증키 ────────────────────────────────────────────────────
if (-not (Test-Path $envFile)) {
  Write-Host ""
  Write-Host "  [필요] 인증키가 없습니다."
  Write-Host ""
  Write-Host "  다음 파일을 만들고 한 줄을 적어 주세요:"
  Write-Host "      $envFile"
  Write-Host ""
  Write-Host "      DATA_GO_KR_KEY=여기에_디코딩키를_붙여넣기"
  Write-Host ""
  Write-Host "  * 이 파일은 GitHub 에 올라가지 않습니다 (.gitignore 에 등록됨)."
  Write-Host "  * 키는 공공데이터포털 마이페이지에서 확인할 수 있습니다."
  exit 1
}
$key = $null
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  if ($_ -match '^\s*DATA_GO_KR_KEY\s*=\s*(.+?)\s*$') { $key = $Matches[1] }
}
if (-not $key) { Write-Host "  [실패] .env.local 에 DATA_GO_KR_KEY 가 없습니다."; exit 1 }
# Encoding 키가 들어와도 동작하도록 (%2F 등이 있으면 디코딩)
if ($key -match '%[0-9A-Fa-f]{2}') { $key = [uri]::UnescapeDataString($key) }

# ── 대상 장소 ─────────────────────────────────────────────────
$doc = Get-Content $locFile -Raw -Encoding UTF8 | ConvertFrom-Json
$targets = @()
foreach ($workName in $doc.works.PSObject.Properties.Name) {
  foreach ($p in $doc.works.$workName.places) {
    if ($p.tourapi -and $p.tourapi.contentId) {
      $targets += [pscustomobject]@{
        work = $workName; name = $p.name; nameKo = $p.nameKo; contentId = "$($p.tourapi.contentId)"
      }
    }
  }
}
if ($targets.Count -eq 0) { Write-Host "  [중단] contentId 가 있는 장소가 없습니다."; exit 1 }
Write-Host ("  대상 장소 {0}곳" -f $targets.Count)

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
$canResize = [bool]([System.Management.Automation.PSTypeName]'System.Drawing.Bitmap').Type

function Slug($s) { ($s.ToLower() -replace '[^a-z0-9]+', '-').Trim('-') }

$LICENSE = @{ 'Type1' = @{ code='kogl-1'; canModify=$true }
              'Type3' = @{ code='kogl-3'; canModify=$false } }

$records = @(); $ok = 0; $rejected = 0; $apiFail = 0

foreach ($t in $targets) {
  $url = "$base/detailImage2?serviceKey=$([uri]::EscapeDataString($key))&MobileOS=ETC&MobileApp=HANKUKIN&_type=json&contentId=$($t.contentId)&imageYN=Y&numOfRows=20&pageNo=1"
  try {
    $r = Invoke-RestMethod -Uri $url -TimeoutSec 25
  } catch {
    Write-Host ("  [실패] {0}: {1}" -f $t.name, $_.Exception.Message); $apiFail++; continue
  }
  $items = $r.response.body.items.item
  if (-not $items) { Write-Host ("  [없음] {0}: 등록된 이미지가 없습니다" -f $t.name); continue }
  if ($items -isnot [array]) { $items = @($items) }

  $i = 0
  foreach ($im in $items) {
    $lic = $LICENSE[$im.cpyrhtDivCd]
    if (-not $lic) {
      $rejected++
      Write-Host ("  [제외] {0}: 저작권 유형 '{1}' — 사용하지 않습니다" -f $t.name, $im.cpyrhtDivCd)
      continue
    }
    $src = if ($im.originimgurl) { $im.originimgurl } else { $im.smallimageurl }
    if (-not $src) { continue }
    $i++
    $file = "$(Slug $t.name)-$i.jpg"
    $dest = Join-Path $outDir $file
    try {
      $resp = Invoke-WebRequest -Uri $src -TimeoutSec 30 -UseBasicParsing
      $bytes = $resp.Content
      if ($bytes.Length -lt 20000 -or -not ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8)) {
        Write-Host ("  [건너뜀] {0}: 이미지가 아닙니다" -f $t.name); continue
      }
      # 변경금지(Type3)는 원본 그대로 저장한다
      if ($canResize -and $lic.canModify) {
        $ms = New-Object System.IO.MemoryStream(,$bytes)
        $img = [System.Drawing.Image]::FromStream($ms)
        if ($img.Width -gt $maxWidth) {
          $h = [int]([math]::Round($img.Height * ($maxWidth / $img.Width)))
          $bmp = New-Object System.Drawing.Bitmap($maxWidth, $h)
          $g = [System.Drawing.Graphics]::FromImage($bmp)
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.DrawImage($img, 0, 0, $maxWidth, $h); $g.Dispose()
          $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
          $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
          $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 82L)
          $bmp.Save($dest, $codec, $ep); $bmp.Dispose()
        } else { [System.IO.File]::WriteAllBytes($dest, $bytes) }
        $img.Dispose(); $ms.Dispose()
      } else {
        [System.IO.File]::WriteAllBytes($dest, $bytes)
      }
      $ok++
      $kb = [math]::Round((Get-Item $dest).Length / 1024)
      Write-Host ("  [받음] {0,-22} -> {1} ({2}KB, {3})" -f $t.name, $file, $kb, $lic.code)

      $records += [ordered]@{
        work = $t.work; place = $t.name; placeKo = $t.nameKo; contentId = $t.contentId; file = $file
        frontmatter = [ordered]@{
          src = "../../assets/images/scenes/$file"
          alt = "$($t.name), a filming location in Korea"
          license = $lic.code
          sourceUrl = "https://api.visitkorea.or.kr/#/detail?cotId=$($t.contentId)"
          credit = '한국관광공사 (Korea Tourism Organization)'
        }
        canModify = $lic.canModify
        fetchedAt = (Get-Date -Format 'yyyy-MM-dd')
      }
    } catch {
      Write-Host ("  [실패] {0}: {1}" -f $t.name, $_.Exception.Message)
    }
  }
}

Write-Host ""
Write-Host ("  받음 {0}장 · 저작권 미확인 제외 {1}장 · API 실패 {2}곳" -f $ok, $rejected, $apiFail)

if ($ok -eq 0) {
  Write-Host ""
  Write-Host "  [중단] 한 장도 받지 못했습니다."
  Write-Host "  API 실패가 대부분이면 인증키 또는 공공데이터포털 상태를 확인하세요."
  exit 1
}

@{
  _comment = @(
    '한국관광공사 TourAPI 이미지. cpyrhtDivCd 를 확인해 Type1/Type3 만 담는다.',
    'kogl-3 은 변경금지이므로 리사이즈하지 않고 원본 그대로 저장한다.',
    '출처 표기 의무: 한국관광공사'
  )
  generatedAt = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
  stats = @{ ok = $ok; rejected = $rejected; apiFail = $apiFail }
  images = $records
} | ConvertTo-Json -Depth 8 | Set-Content -Path $metaFile -Encoding UTF8

Write-Host "  메타데이터: data\tourapi-images.result.json"
exit 0
