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

# 응답 본문을 UTF-8 로 읽는다.
#
# 2026-08-14, 로그를 켜고 나서야 보인 것:
#   [Text.Encoding]::UTF8.GetString($resp.Content) 는 19건 전부에서 터지고 있었다.
#   PowerShell 5.1 의 Invoke-WebRequest 는 응답이 텍스트면 .Content 를 이미
#   **문자열로** 준다. GetString 은 byte[] 를 요구하므로 형변환 오류가 난다.
#   게다가 그 문자열은 charset 헤더가 없어 ISO-8859-1 로 디코딩된 상태라
#   "청계광장" 이 "ì²­ê³ê´ì¥" 로 이미 깨져 있다 — 되살릴 수 없다.
#
#   원본 바이트는 RawContentStream 에만 남아 있다. 거기서 UTF-8 로 직접 읽는다.
function Read-Utf8Body {
  param($resp)
  if ($resp.PSObject.Properties['RawContentStream'] -and $resp.RawContentStream) {
    $ms = $resp.RawContentStream
    $ms.Position = 0
    return [Text.Encoding]::UTF8.GetString($ms.ToArray())
  }
  if ($resp.Content -is [byte[]]) { return [Text.Encoding]::UTF8.GetString($resp.Content) }
  return [string]$resp.Content
}

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
  # Invoke-RestMethod 가 charset 헤더 없는 응답을 ISO-8859-1 로 읽어
  # 한글 제목이 깨져 저장됐다 (2026-08-14). 바이트를 받아 UTF-8 로 직접 디코딩한다.
  try {
    $raw = Invoke-WebRequest -Uri $searchUrl -TimeoutSec 25 -UseBasicParsing
    $s = (Read-Utf8Body $raw) | ConvertFrom-Json
  }
  catch { Write-Host ("  [실패] {0}: {1}" -f $r.keyword, $_.Exception.Message); continue }

  $items = $s.response.body.items.item
  if (-not $items) { Write-Host ("  [없음] {0}: 검색 결과 0건" -f $r.keyword); continue }
  if ($items -isnot [array]) { $items = @($items) }

  # 후보 고르기 (2026-08-14 수정)
  #   처음에는 '제목 완전일치' 만 허용했더니 한 곳도 못 골랐다.
  #   "홍대" 의 등재명은 "홍대거리", "명동" 은 "명동거리" 라 완전일치가 안 된다.
  #   그렇다고 아무거나 집으면 엉뚱한 장소가 들어온다 (경복궁 검색에 울산 업소가 섞인 적 있다).
  #
  #   그래서 3단계로 좁힌다:
  #     ① 제목 완전일치가 하나면 그것
  #     ② 없으면, 제목에 키워드가 들어가고 기대 지역과 맞는 것 중 첫 번째
  #        (TourAPI 는 관련도순으로 준다)
  #     ③ 그것도 없으면 건너뛴다
  $kw = $r.keyword -replace '\s',''
  $pick = $null
  $how = ''

  # 요청서가 등재명을 직접 지정했으면 그것만 쓴다.
  # 사람이 후보 목록을 보고 고른 것이므로 추측할 이유가 없다.
  if ($r.exactTitle) {
    $want = $r.exactTitle -replace '\s',''
    $pick = @($items | Where-Object { ($_.title -replace '\s','') -eq $want })[0]
    if ($pick) { $how = '등재명 지정' }
    else {
      $names = ($items | Select-Object -First 6 | ForEach-Object { "$($_.title)" }) -join ' / '
      Write-Host ("  [불일치] {0}: exactTitle '{1}' 이 결과에 없습니다 — {2}" -f $r.keyword, $r.exactTitle, $names)
      continue
    }
  }

  $exact = @($items | Where-Object { ($_.title -replace '\s','') -eq $kw })
  if (-not $pick -and $exact.Count -eq 1) { $pick = $exact[0]; $how = '제목 완전일치' }
  if (-not $pick -and $items.Count -eq 1) { $pick = $items[0]; $how = '결과 1건' }
  if (-not $pick) {
    # "서울역" 이 "서울역사박물관" 에 매칭됐다 (2026-08-14 실측).
    # 접두사 포함만으로는 부족하다. 키워드 뒤에 다른 글자가 이어붙으면
    # 대개 다른 장소다 — 시장·거리·공항처럼 접미어가 붙는 경우만 허용한다.
    $okSuffix = '^' + [regex]::Escape($kw) + '(역|점|관|장|거리|시장|공원|타워|공항|터미널|광장|마을|길|천|산|성|문|궁|사|원|리|동|가|
                                                 관광특구|디자인플라자|국제공항)?$'
    $okSuffix = $okSuffix -replace '\s',''
    $contains = @($items | Where-Object { ($_.title -replace '\s','') -match $okSuffix })
    if ($contains.Count -eq 0) {
      # 그래도 없으면 '키워드로 시작하고 2글자 이내로 끝나는 것' 까지만 허용
      $contains = @($items | Where-Object {
        $t = ($_.title -replace '\s','')
        $t.StartsWith($kw) -and ($t.Length - $kw.Length) -le 2
      })
    }
    if ($r.expectRegion) {
      $inRegion = @($contains | Where-Object { $_.addr1 -and $_.addr1.StartsWith($r.expectRegion) })
      if ($inRegion.Count -gt 0) { $contains = $inRegion }
    }
    if ($contains.Count -gt 0) { $pick = $contains[0]; $how = "제목 포함 + 지역 일치 ($($contains.Count)건 중 첫째)" }
  }
  if (-not $pick) {
    # 후보 이름을 찍지 않으면 왜 버렸는지 알 수 없다 (2026-08-14).
    #   "창덕궁: 후보 4건 중 없음" 만 보고는 손 쓸 방법이 없었다.
    #   TourAPI 등재명은 '창덕궁과 후원' 처럼 우리가 부르는 이름과 다르다.
    #   이름을 보여주면, 맞는 것을 골라 요청서의 exactTitle 에 적어 넣을 수 있다.
    #   기계가 추측해서 엉뚱한 곳을 집는 것보다 사람이 고르는 편이 안전하다.
    $names = ($items | Select-Object -First 6 | ForEach-Object { "$($_.title)" }) -join ' / '
    Write-Host ("  [모호] {0}: 아래 중 맞는 것을 exactTitle 에 적으십시오 — {1}" -f $r.keyword, $names)
    continue
  }
  Write-Host ("  [선택] {0} → {1} ({2})" -f $r.keyword, $pick.title, $how)
  $cid = $pick.contentid

  # ② 이미지 + 저작권 유형
  $imgUrl = "$base/detailImage2?serviceKey=$k&MobileOS=ETC&MobileApp=HANKUKIN&_type=json&contentId=$cid&imageYN=Y&numOfRows=20&pageNo=1"
  try {
    $rawi = Invoke-WebRequest -Uri $imgUrl -TimeoutSec 25 -UseBasicParsing
    $ires = (Read-Utf8Body $rawi) | ConvertFrom-Json
  } catch { continue }
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
      # 여기도 .Content 를 그냥 믿지 않는다. 위 JSON 에서 이미 당했다.
      # 이미지가 문자열로 오면 아래 JPEG 시그니처 검사가 조용히 전부 탈락시킨다 —
      # 실패가 아니라 '이미지 없음' 으로 보여서 원인을 못 찾는다.
      $resp = Invoke-WebRequest -Uri $src -TimeoutSec 30 -UseBasicParsing
      $bytes = if ($resp.PSObject.Properties['RawContentStream'] -and $resp.RawContentStream) {
        $resp.RawContentStream.Position = 0; $resp.RawContentStream.ToArray()
      } elseif ($resp.Content -is [byte[]]) { $resp.Content }
      else { [Text.Encoding]::GetEncoding(28591).GetBytes([string]$resp.Content) }
      if ($bytes.Length -lt 20000 -or -not ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8)) {
        Write-Host ("  [건너뜀] {0}-{1}: JPEG 아님 또는 너무 작음 ({2} 바이트)" -f $r.slug, $i, $bytes.Length)
        $i--; continue
      }
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
    # 같은 slug 가 이미 있으면 덮어쓴다.
    # 이전 버전은 그냥 append 해서 'Key already added: slug' 로 죽었다 (2026-08-14).
    $records = @($records | Where-Object { $_.slug -ne $r.slug })
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
  } | ConvertTo-Json -Depth 10 |
    ForEach-Object { [IO.File]::WriteAllText($metaFile, $_, (New-Object Text.UTF8Encoding $false)) }
}
Write-Host ("  요청 {0}건 · 새로 받음 {1}곳 · 이미 있음 {2}곳" -f $req.requests.Count, $fetched, $skipped)
exit 0
