# Letterbox the four popup-state screenshots from native popup size to the
# Chrome Web Store-preferred 1280x800 canvas, on the 1132 dark background.
# Preserves aspect ratio; centers the popup capture; never upscales beyond
# the available 800px vertical room.
# Screenshot #04 is already a full Chrome window capture (2560x1600 retina)
# and is downscaled to 1280x800 in one shot.

Add-Type -AssemblyName System.Drawing

$root      = Split-Path $PSScriptRoot -Parent
$assets    = Join-Path $root 'store-assets'
$canvasW   = 1280
$canvasH   = 800
$bgColor   = [System.Drawing.Color]::FromArgb(255, 5, 10, 20)   # #050a14

function Resize-WithCanvas {
  param([string]$srcPath, [string]$dstPath, [int]$maxW, [int]$maxH)

  $src = [System.Drawing.Image]::FromFile($srcPath)
  try {
    $scaleW = $maxW / $src.Width
    $scaleH = $maxH / $src.Height
    $scale  = [Math]::Min($scaleW, $scaleH)
    if ($scale -gt 1.0) { $scale = 1.0 }
    $newW = [int]($src.Width  * $scale)
    $newH = [int]($src.Height * $scale)

    $canvas = New-Object System.Drawing.Bitmap $canvasW, $canvasH, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.CompositingQuality= [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $brush = New-Object System.Drawing.SolidBrush $bgColor
    $g.FillRectangle($brush, 0, 0, $canvasW, $canvasH)
    $brush.Dispose()

    $x = [int](($canvasW - $newW) / 2)
    $y = [int](($canvasH - $newH) / 2)
    $g.DrawImage($src, $x, $y, $newW, $newH)

    $tmp = "$dstPath.tmp"
    $canvas.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $canvas.Dispose()
  } finally {
    $src.Dispose()
  }
  Move-Item -Force $tmp $dstPath
}

$popupShots = '01-zoom-detected.png','02-fix-complete.png','03-non-zoom-safe.png','05-manual-picker.png'

# Available height inside the 1280x800 canvas after a 24px top/bottom margin.
$availH = $canvasH - 48
# Cap the popup width so it never dominates the 1280x800 frame.
$availW = 720

foreach ($name in $popupShots) {
  $p = Join-Path $assets $name
  if (-not (Test-Path $p)) { continue }
  Resize-WithCanvas -srcPath $p -dstPath $p -maxW $availW -maxH $availH
}

# Screenshot 04 (extension details) was captured at the natural Chrome window
# size; downscale to the canvas without letterboxing if it already fills.
$ext = Join-Path $assets '04-extension-details-permissions.png'
if (Test-Path $ext) {
  Resize-WithCanvas -srcPath $ext -dstPath $ext -maxW $canvasW -maxH $canvasH
}

Get-ChildItem $assets/*.png | ForEach-Object {
  $i = [System.Drawing.Image]::FromFile($_.FullName)
  Write-Host ("{0,-44}  {1}x{2}" -f $_.Name, $i.Width, $i.Height)
  $i.Dispose()
}
