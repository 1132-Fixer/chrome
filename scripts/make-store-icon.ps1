# Generate a Chrome Web Store-friendly 128x128 store icon by compositing the
# RGBA source onto an opaque dark canvas matching the 1132 popup scheme.
# Web Store rejects icons with low-opacity edges as "image size is incorrect"
# when the bounding box of opaque pixels does not match the declared 128x128.

Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root 'icons/icon128.png'
$dst  = Join-Path $root 'store-assets/icon128-store.png'
if (-not (Test-Path $src)) { throw "Source icon missing: $src" }
$null = New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent)

$srcImg = [System.Drawing.Image]::FromFile($src)
try {
  $bmp = New-Object System.Drawing.Bitmap 128, 128, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $bg = [System.Drawing.Color]::FromArgb(255, 10, 16, 32)  # #0a1020 — popup top
  $brush = New-Object System.Drawing.SolidBrush $bg
  $g.FillRectangle($brush, 0, 0, 128, 128)
  $brush.Dispose()
  $g.DrawImage($srcImg, 0, 0, 128, 128)
  $tmp = "$dst.tmp"
  $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Move-Item -Force $tmp $dst
} finally {
  $srcImg.Dispose()
}

$info = [System.Drawing.Image]::FromFile($dst)
Write-Host ("Wrote {0} ({1}x{2}, {3})" -f $dst, $info.Width, $info.Height, $info.PixelFormat)
$info.Dispose()
