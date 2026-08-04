# Generates store-assets/<OutName> using the 1132 dark/amber scheme.
# Defaults: 440x280 small promo tile (Chrome Web Store requirement).
# Override: -W 1400 -H 560 -OutName promo-1400x560.png for the marquee.
# Pure System.Drawing, no external dependencies, no network, no Zoom logo.
# Output is 24-bit PNG (no alpha) — Web Store rejects ARGB for promo tiles.

param(
  [int]$W = 440,
  [int]$H = 280,
  [string]$OutName = 'promo-440x280.png'
)

Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root 'icons/icon128.png'
$dst  = Join-Path $root ('store-assets/' + $OutName)
if (-not (Test-Path $src)) { throw "Source icon missing: $src" }
$null = New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent)

$bmp = New-Object System.Drawing.Bitmap $W, $H, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint  = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Scale layout for the requested canvas size.
$scale = [Math]::Min($W / 440.0, $H / 280.0)
function S([double]$v) { [int]([Math]::Round($v * $scale)) }

# 1132 palette: dark blue → near-black gradient background, matches popup.css.
$bgTop = [System.Drawing.Color]::FromArgb(255, 10, 16, 32)   # #0a1020
$bgBot = [System.Drawing.Color]::FromArgb(255, 5, 10, 20)    # #050a14
$rect  = New-Object System.Drawing.Rectangle 0, 0, $W, $H
$grad  = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $bgTop, $bgBot, 110
$g.FillRectangle($grad, $rect)

# Amber glow accent in the upper-right corner.
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse((S 220), (S -80), (S 320), (S 320))
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(120, 245, 166, 35)
$pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 245, 166, 35))
$g.FillPath($pgb, $glowPath)
$pgb.Dispose()
$glowPath.Dispose()

# Hazard stripe along the bottom edge.
$stripeH = S 10
$y = $H - $stripeH
$yellow = [System.Drawing.Color]::FromArgb(255, 245, 197, 24)
$black  = [System.Drawing.Color]::FromArgb(255, 26, 26, 26)
$slice  = S 14
for ($x = -$stripeH; $x -lt $W; $x += $slice) {
  $pts = @(
    (New-Object System.Drawing.Point ($x), $y),
    (New-Object System.Drawing.Point ($x + [int]($slice/2)), $y),
    (New-Object System.Drawing.Point ($x + [int]($slice/2) + $stripeH), ($y + $stripeH)),
    (New-Object System.Drawing.Point ($x + $stripeH), ($y + $stripeH))
  )
  $brush = New-Object System.Drawing.SolidBrush $yellow
  $g.FillPolygon($brush, $pts)
  $brush.Dispose()
  $pts2 = @(
    (New-Object System.Drawing.Point ($x + [int]($slice/2)), $y),
    (New-Object System.Drawing.Point ($x + $slice), $y),
    (New-Object System.Drawing.Point ($x + $slice + $stripeH), ($y + $stripeH)),
    (New-Object System.Drawing.Point ($x + [int]($slice/2) + $stripeH), ($y + $stripeH))
  )
  $brush2 = New-Object System.Drawing.SolidBrush $black
  $g.FillPolygon($brush2, $pts2)
  $brush2.Dispose()
}

# Icon on the left.
$iconImg  = [System.Drawing.Image]::FromFile($src)
$iconSize = S 96
$iconX    = S 28
$iconY    = [int](($H - $stripeH - $iconSize) / 2)
$g.DrawImage($iconImg, $iconX, $iconY, $iconSize, $iconSize)
$iconImg.Dispose()

# Wordmark "1132 FIXER".
$titleColor = [System.Drawing.Color]::FromArgb(255, 255, 215, 0)
$titleFont  = New-Object System.Drawing.Font 'Segoe UI', ([float](38 * $scale)), ([System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush $titleColor
$g.DrawString('1132 FIXER', $titleFont, $titleBrush, (S 140), (S 72))
$titleFont.Dispose()
$titleBrush.Dispose()

# Accent rule under the wordmark.
$rulePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 140, 0)), ([float](3 * $scale))
$g.DrawLine($rulePen, (S 144), (S 134), (S 320), (S 134))
$rulePen.Dispose()

# Tagline.
$subColor = [System.Drawing.Color]::FromArgb(255, 207, 230, 255)
$subFont  = New-Object System.Drawing.Font 'Segoe UI', ([float](14 * $scale)), ([System.Drawing.FontStyle]::Regular)
$subBrush = New-Object System.Drawing.SolidBrush $subColor
$g.DrawString('Fix Zoom cookies in one click.', $subFont, $subBrush, (S 144), (S 148))
$subFont.Dispose()
$subBrush.Dispose()

# Disclaimer.
$discColor = [System.Drawing.Color]::FromArgb(255, 140, 164, 192)
$discFont  = New-Object System.Drawing.Font 'Segoe UI', ([float](9 * $scale))
$discBrush = New-Object System.Drawing.SolidBrush $discColor
$g.DrawString('One button. Zoom cookies only. Reload.', $discFont, $discBrush, (S 144), (S 184))
$g.DrawString('Independent project. Not affiliated with Zoom.', $discFont, $discBrush, (S 144), (S 200))
$discFont.Dispose()
$discBrush.Dispose()

$tmp = "$dst.tmp"
$bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Move-Item -Force $tmp $dst

$info = [System.Drawing.Image]::FromFile($dst)
Write-Host ("Wrote {0} ({1}x{2}, {3})" -f $dst, $info.Width, $info.Height, $info.PixelFormat)
$info.Dispose()
