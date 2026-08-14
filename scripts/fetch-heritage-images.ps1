# 궁궐 사진 받기 — PowerShell 전용. 외부 도구가 필요 없다.
#
# 왜 PowerShell 인가 (2026-08-13):
#   ① GitHub Actions(미국)에서는 .go.kr 사이트에 접속이 되지 않는다.
#      TourAPI 도 궁능유적본부도 전부 'fetch failed' 였다. 그래서 한국에 있는 이 PC 에서 받아야 한다.
#   ② 그런데 이 PC 의 cmd 에서는 node 를 찾을 수 없었다.
#      사진 14장 내려받는 데 node 가 필요할 이유가 없다.
#      PowerShell 은 윈도우에 이미 있고, Invoke-WebRequest 로 충분하다.
#
#   의존성을 하나 없앨 때마다 실패할 자리가 하나 줄어든다.
#
# 출처: 국가유산청 궁능유적본부 — 공공누리 제1유형 (출처표시 + 상업적 이용가능 + 변형가능)

$ErrorActionPreference = 'Continue'
$repo   = Split-Path -Parent $PSScriptRoot
$dataFile = Join-Path $repo 'data\heritage-images.json'
$outDir = Join-Path $repo 'src\assets\images\heritage'
$metaFile = Join-Path $repo 'data\heritage-images.result.json'
$base   = 'https://royal.khs.go.kr/afile/previewThumbnail/'
$minBytes = 20000

if (-not (Test-Path $dataFile)) { Write-Host "  [실패] $dataFile 이 없습니다."; exit 1 }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$doc = Get-Content $dataFile -Raw -Encoding UTF8 | ConvertFrom-Json
$records = @()
$ok = 0; $failed = 0

function Slug($s) { ($s.ToLower() -replace '[^a-z0-9]+', '-').Trim('-') }

# 원본은 한 장에 4MB 를 넘기도 한다. 14장이면 저장소에 40MB 가 들어간다.
# .NET 의 System.Drawing 으로 줄인다 — 윈도우에 이미 있어서 새로 설치할 것이 없다.
# 공공누리 제1유형은 변형을 허용하므로 리사이즈해도 된다 (제3유형이면 하면 안 된다).
Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
$canResize = [bool]([System.Management.Automation.PSTypeName]'System.Drawing.Bitmap').Type
$maxWidth = 1600

function Resize-Jpeg([byte[]]$bytes, [string]$dest, [int]$maxW) {
  $ms = New-Object System.IO.MemoryStream(,$bytes)
  $img = [System.Drawing.Image]::FromStream($ms)
  try {
    if ($img.Width -le $maxW) { [System.IO.File]::WriteAllBytes($dest, $bytes); return $bytes.Length }
    $h = [int]([math]::Round($img.Height * ($maxW / $img.Width)))
    $bmp = New-Object System.Drawing.Bitmap($maxW, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $maxW, $h)
    $g.Dispose()
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $p = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 82L)
    $bmp.Save($dest, $codec, $p)
    $bmp.Dispose()
    return (Get-Item $dest).Length
  } finally { $img.Dispose(); $ms.Dispose() }
}

foreach ($siteName in $doc.sites.PSObject.Properties.Name) {
  $site = $doc.sites.$siteName
  foreach ($b in $site.buildings) {
    $url = $base + $b.id
    $file = "$(Slug $site.en)-$(Slug $b.en).jpg"
    $dest = Join-Path $outDir $file
    try {
      $resp = Invoke-WebRequest -Uri $url -TimeoutSec 30 -UseBasicParsing
      $bytes = $resp.Content

      if ($bytes.Length -lt $minBytes) {
        Write-Host ("  [건너뜀] {0}: 응답이 너무 작습니다 ({1}B)" -f $b.ko, $bytes.Length); $failed++; continue
      }
      # JPEG 시그니처 확인 — 오류 페이지를 사진으로 저장하지 않는다
      if (-not ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8)) {
        Write-Host ("  [건너뜀] {0}: JPEG 이 아닙니다" -f $b.ko); $failed++; continue
      }

      $savedBytes = $bytes.Length
      if ($canResize) {
        try { $savedBytes = Resize-Jpeg $bytes $dest $maxWidth }
        catch { [System.IO.File]::WriteAllBytes($dest, $bytes); $savedBytes = $bytes.Length }
      } else {
        [System.IO.File]::WriteAllBytes($dest, $bytes)
      }
      $ok++
      $kb = [math]::Round($savedBytes / 1024)
      $orig = [math]::Round($bytes.Length / 1024)
      $note = if ($savedBytes -lt $bytes.Length) { " (원본 ${orig}KB)" } else { "" }
      Write-Host ("  [받음] {0,-8} -> {1} ({2}KB){3}" -f $b.ko, $file, $kb, $note)

      $records += [ordered]@{
        site = $siteName; siteEn = $site.en
        buildingKo = $b.ko; buildingEn = $b.en; id = $b.id; file = $file
        frontmatter = [ordered]@{
          src = "../../assets/images/heritage/$file"
          alt = "$($b.en) at $($site.en), Seoul"
          license = $doc.license
          sourceUrl = $site.sourceUrl
          credit = $doc.credit
        }
        bytes = $savedBytes
        originalBytes = $bytes.Length
        resized = ($savedBytes -lt $bytes.Length)
        fetchedAt = (Get-Date -Format 'yyyy-MM-dd')
      }
    } catch {
      Write-Host ("  [실패] {0}: {1}" -f $b.ko, $_.Exception.Message)
      $failed++
    }
  }
}

Write-Host ""
Write-Host ("  받음 {0}장 · 실패 {1}장" -f $ok, $failed)

if ($ok -eq 0) {
  Write-Host "  [중단] 한 장도 받지 못했습니다. 인터넷 연결이나 사이트 상태를 확인하세요."
  exit 1
}

$meta = [ordered]@{
  _comment = @(
    '궁능유적본부 사진 수집 결과. 공공누리 제1유형 — 출처표시 시 상업적 이용·변형 가능.',
    'frontmatter 블록은 기사에 그대로 붙여 넣을 수 있다.',
    'alt 는 기본값이므로 기사 맥락에 맞게 고쳐 쓰는 편이 낫다.',
    '출처 표기 의무: 국가유산청 궁능유적본부'
  )
  generatedAt = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
  stats = [ordered]@{ ok = $ok; failed = $failed }
  images = $records
}
$meta | ConvertTo-Json -Depth 8 | Set-Content -Path $metaFile -Encoding UTF8
Write-Host "  메타데이터: data\heritage-images.result.json"
exit 0
