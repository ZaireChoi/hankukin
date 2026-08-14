# 요청받은 장소의 사진만 받는다 — 한국관광공사 TourAPI.
#
# 왜 이렇게 바꿨나 (2026-08-14, 운영자 지적):
#   이전에는 12시간마다 궁궐 사진을 다시 받았다. 궁궐 기사는 이미 다 썼는데
#   같은 사진을 계속 받을 이유가 없다. 그리고 정작 필요한 것 —
#   지금 쓰는 기사의 장소 사진 — 은 받지 않고 있었다.
#
#   사진은 시계가 아니라 기사가 요청할 때 받아야 한다.
#
# 흐름:
#   1. 기사를 쓰는 예약작업이 data\photo-requests.json 에 필요한 장소를 적는다
#   2. 이 스크립트(윈도우 10분 작업)가 그것만 받아온다
#   3. 다음 기사 작업이 도착한 사진을 기사에 붙인다
#
#   Claude 는 리눅스 샌드박스에서 돌아 윈도우 PowerShell 을 직접 실행할 수 없다.
#   그래서 파일로 요청을 주고받는다.
#
# 요청 형식 — data\photo-requests.json
#   { "requests": [
#       { "keyword": "광장시장", "expectRegion": "서울", "slug": "gwangjang-market" }
#   ] }

$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo     = Split-Path -Parent $PSScriptRoot
$envFile  = Join-Path $repo '.env.local'
$reqFile  = Join-Path $repo 'data\photo-requests.json'
$outDir   = Join-Path $repo 'src\assets\images\places'
$metaFile = Join-Path $repo 'data\place-images.json'
$base     = 'https://apis.data.go.kr/B551011/KorService2'
$maxWidth = 1600
$maxPerPlace = 6

if (-not (Test-Path $reqFile)) { exit 0 }
$req = Get-Content $reqFile -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $req.requests -or $req.requests.Count -eq 0) { exit 0 }

if (-not (Test-Path $envFile)) { Write-Host "  [중단] .env.local 없음 — 인증키 미설정"; exit 1 }
$key = $null
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  if ($_ -match '^\s*DATA_GO_KR_KEY\s*=\s*(.+?)\s*$') { $key = $Matches[1] }
}
if (-not $key) { Write-Host "  [중단] 인증키 없음"; exit 1 }
if ($key -match '%[0-9A-Fa-f]{2}') { $key = [uri]::UnescapeDataString($key) }
$k = [uri]::EscapeDataString($key)

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
$canResize = [bool]([System.Management.Automation.PSTypeName]'System.Drawing.Bitmap').Type

$AREA = @{ '서울'=1;'인천'=2;'대전'=3;'대구'=4;'광주'=5;'부산'=6;'울산'=7;'세종'=8;
           '경기'=31;'강원'=32;'충북'=33;'충남'=34;'경북'=35;'경남'=36;'전북'=37;'전남'=38;'제주'=39 }
$LICENSE = @{ 'Type1'=@{code='kogl-1';mod=$true}; 'Type3'=@{code='kogl-3';mod=$false} }

# 이미 받은 것은 다시 받지 않는다
$done = @{}
if (Test-Path $metaFile) {
  $prev = Get-Content $metaFile -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($p in $prev.places) { $done[$p.slug] = $true }
} else { $prev = $null }
$records = if ($prev) { @($prev.places) } else { @() }

$fetched = 0; $skipped = 0
foreach ($r in $req.requests) {
  if ($done[$r.slug]) { $skipped++; continue }

  # ① 키워드로 contentId 찾기
  $areaParam = ''
  if ($r.expectRegion -and $AREA[$r.expectRegion]) { $areaParam = "&areaCode=$($AREA[$r.expectRegion])" }
  $searchUrl = "$base/searchKeyword2?serviceKey=$k&MobileOS=ETC&MobileApp=HANKUKIN&_type=json&keyword=$([uri]::EscapeDataString($r.keyword))&numOfRows=10&pageNo=1$areaParam"
  try { $s = Invoke-RestMethod -Uri $searchUrl -TimeoutSec 25 }
  catch { Write-Host ("  [실패] {0}: {1}" -f $r.keyword, $_.Exception.Message); continue }

  $items = $s.response.body.items.item
  if (-not $items) { Write-Host ("  [없음] {0}: 검색 결과 0건" -f $r.keyword); continue }
  if ($items -isnot [array]) { $items = @($items) }

  # 후보가 여럿이면 제목이 정확히 같은 것을 우선. 못 좁히면 건너뛴다 (엉뚱한 장소 방지)
  $exact = @($items | Where-Object { ($_.title -replace '\s','') -eq ($r.keyword -replace '\s','') })
  $pick = if ($exact.Count -eq 1) { $exact[0] } elseif ($items.Count -eq 1) { $items[0] } else { $null }
  if (-not $pick) {
    Write-Host ("  [모호] {0}: 후보 {1}건 — 자동 선택하지 않습니다" -f $r.keyword, $items.Count)
    continue
  }
  $cid = $pick.contentid

  # ② 이미지 + 저작권 유형
  $imgUrl = "$base/detailImage2?serviceKey=$k&MobileOS=ETC&MobileApp=HANKUKIN&_type=json&contentId=$cid&imageYN=Y&numOfRows=20&pageNo=1"
  try { $ires = Invoke-RestMethod -Uri $imgUrl -TimeoutSec 25 } catch { continue }
  $imgs = $ires.response.body.items.item
  if (-not $imgs) { Write-Host ("  [없음] {0}: 등록 이미지 없음" -f $r.keyword); continue }
  if ($imgs -isnot [array]) { $imgs = @($imgs) }

  $files = @(); $i = 0
  foreach ($im in $imgs) {
    if ($i -ge $maxPerPlace) { break }
    $lic = $LICENSE[$im.cpyrhtDivCd]
    if (-not $lic) { continue }
    $src = if ($im.originimgurl) { $im.originimgurl } else { $im.smallimageurl }
    if (-not $src) { continue }
    $i++
    $file = "$($r.slug)-$i.jpg"
    $dest = Join-Path $outDir $file
    try {
      $bytes = (Invoke-WebRequest -Uri $src -TimeoutSec 30 -UseBasicParsing).Content
      if ($bytes.Length -lt 20000 -or -not ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8)) { $i--; continue }
      if ($canResize -and $lic.mod) {
        $ms = New-Object System.IO.MemoryStream(,$bytes); $img = [System.Drawing.Image]::FromStream($ms)
        if ($img.Width -gt $maxWidth) {
          $h = [int]([math]::Round($img.Height * ($maxWidth/$img.Width)))
          $bmp = New-Object System.Drawing.Bitmap($maxWidth,$h)
          $g = [System.Drawing.Graphics]::FromImage($bmp)
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.DrawImage($img,0,0,$maxWidth,$h); $g.Dispose()
          $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
          $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
          $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,82L)
          $bmp.Save($dest,$codec,$ep); $bmp.Dispose()
        } else { [System.IO.File]::WriteAllBytes($dest,$bytes) }
        $img.Dispose(); $ms.Dispose()
      } else { [System.IO.File]::WriteAllBytes($dest,$bytes) }
      $files += [ordered]@{
        file = $file
        frontmatter = [ordered]@{
          src = "../../assets/images/places/$file"
          alt = "$($r.keyword)"
          license = $lic.code
          sourceUrl = "https://api.visitkorea.or.kr/#/detail?cotId=$cid"
          credit = '한국관광공사 (Korea Tourism Organization)'
        }
        canModify = $lic.mod
      }
    } catch { $i-- }
  }

  if ($files.Count -gt 0) {
    $records += [ordered]@{
      slug = $r.slug; keyword = $r.keyword; title = $pick.title
      address = $pick.addr1; contentId = $cid
      images = $files; fetchedAt = (Get-Date -Format 'yyyy-MM-dd')
    }
    $fetched++
    Write-Host ("  [받음] {0} ({1}) — {2}장" -f $r.keyword, $pick.title, $files.Count)
  } else {
    Write-Host ("  [제외] {0}: 저작권 유형을 확인할 수 있는 이미지가 없습니다" -f $r.keyword)
  }
}

if ($fetched -gt 0) {
  @{
    _comment = @(
      '기사가 요청한 장소의 사진. 저작권 유형(cpyrhtDivCd)이 확인된 것만 담는다.',
      'kogl-3 은 변경금지이므로 리사이즈하지 않고, 화면에서도 원본 그대로 내보낸다.',
      '출처 표기 의무: 한국관광공사'
    )
    generatedAt = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
    places = $records
  } | ConvertTo-Json -Depth 10 | Set-Content -Path $metaFile -Encoding UTF8
}
Write-Host ("  요청 {0}건 · 새로 받음 {1}곳 · 이미 있음 {2}곳" -f $req.requests.Count, $fetched, $skipped)
exit 0
