# Generates store-assets/promo-440x280.png using the 1132 dark/amber scheme.
# Run from project root: powershell -ExecutionPolicy Bypass -File scripts/make-promo.ps1
# Pure System.Drawing; no external dependencies, no network, no Zoom logo.

Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root 'icons/icon128.png'
$dst  = Join-Path $root 'store-assets/promo-440x280.png'
if (-not (Test-Path $src)) { throw "Source icon missing: $src" }
$null = New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent)

$W = 440
$H = 280

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint  = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1132 palette: dark blue → near-black gradient background, matches popup.css.
$bgTop = [System.Drawing.Color]::FromArgb(255, 10, 16, 32)   # #0a1020
$bgMid = [System.Drawing.Color]::FromArgb(255, 8, 16, 24)    # #081018
$bgBot = [System.Drawing.Color]::FromArgb(255, 5, 10, 20)    # #050a14
$rect  = New-Object System.Drawing.Rectangle 0, 0, $W, $H
$grad  = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $bgTop, $bgBot, 110
$g.FillRectangle($grad, $rect)

# Amber glow accent in the upper-right corner.
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(220, -80, 320, 320)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(120, 245, 166, 35)   # amber
$pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 245, 166, 35))
$g.FillPath($pgb, $glowPath)
$pgb.Dispose()
$glowPath.Dispose()

# Hazard stripe along the bottom edge — same motif as the popup footer.
$stripeH = 10
$y = $H - $stripeH
$yellow = [System.Drawing.Color]::FromArgb(255, 245, 197, 24)   # #f5c518
$black  = [System.Drawing.Color]::FromArgb(255, 26, 26, 26)     # #1a1a1a
$slice  = 14
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
$iconSize = 96
$iconX    = 28
$iconY    = [int](($H - $stripeH - $iconSize) / 2)
$g.DrawImage($iconImg, $iconX, $iconY, $iconSize, $iconSize)
$iconImg.Dispose()

# Wordmark "1132 FIXER" right of the icon.
$titleColor = [System.Drawing.Color]::FromArgb(255, 255, 215, 0)  # gold
$titleFont  = New-Object System.Drawing.Font 'Segoe UI', 38, ([System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush $titleColor
$g.DrawString('1132 FIXER', $titleFont, $titleBrush, 140, 72)
$titleFont.Dispose()
$titleBrush.Dispose()

# Accent rule under the wordmark.
$rulePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 140, 0)), 3
$g.DrawLine($rulePen, 144, 134, 320, 134)
$rulePen.Dispose()

# Tagline.
$subColor = [System.Drawing.Color]::FromArgb(255, 207, 230, 255)  # cool light blue
$subFont  = New-Object System.Drawing.Font 'Segoe UI', 14, ([System.Drawing.FontStyle]::Regular)
$subBrush = New-Object System.Drawing.SolidBrush $subColor
$g.DrawString('Fix Zoom site data in one click.', $subFont, $subBrush, 144, 148)
$subFont.Dispose()
$subBrush.Dispose()

# Small unaffiliated disclaimer.
$discColor = [System.Drawing.Color]::FromArgb(255, 140, 164, 192) # text-dim
$discFont  = New-Object System.Drawing.Font 'Segoe UI', 9
$discBrush = New-Object System.Drawing.SolidBrush $discColor
$g.DrawString('Cookies. Storage. Cache. IndexedDB. Reload.', $discFont, $discBrush, 144, 184)
$g.DrawString('Independent project. Not affiliated with Zoom.', $discFont, $discBrush, 144, 200)
$discFont.Dispose()
$discBrush.Dispose()

$bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

$info = [System.Drawing.Image]::FromFile($dst)
Write-Host ("Wrote {0} ({1}x{2})" -f $dst, $info.Width, $info.Height)
$info.Dispose()
