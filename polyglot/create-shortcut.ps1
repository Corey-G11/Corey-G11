# Creates a "Polyglot" shortcut on the Desktop that launches start.bat.
# Run once via "Setup Desktop Shortcut.bat" (which invokes this with the
# right execution policy). Safe to run again if the shortcut ever goes missing.

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$targetPath = Join-Path $scriptDir "start.bat"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Polyglot.lnk"
$iconPath = Join-Path $scriptDir "polyglot.ico"

if (-not (Test-Path $targetPath)) {
    Write-Host "Couldn't find start.bat next to this script. Is it still in the polyglot folder?" -ForegroundColor Red
    exit 1
}

# Draw a simple icon so the shortcut doesn't use a generic one. If anything
# about icon generation fails, skip it rather than failing the whole setup.
$haveIcon = $false
try {
    Add-Type -AssemblyName System.Drawing

    $bmp = New-Object -TypeName System.Drawing.Bitmap -ArgumentList 256, 256
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 17, 23))

    $brush = New-Object -TypeName System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(255, 110, 168, 254))
    $font = New-Object -TypeName System.Drawing.Font -ArgumentList "Segoe UI", 150, ([System.Drawing.FontStyle]::Bold)
    $format = New-Object -TypeName System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object -TypeName System.Drawing.RectangleF -ArgumentList 0, 0, 256, 256
    $g.DrawString("P", $font, $brush, $rect, $format)

    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $fs = New-Object -TypeName System.IO.FileStream -ArgumentList $iconPath, ([System.IO.FileMode]::Create)
    $icon.Save($fs)
    $fs.Close()

    $g.Dispose()
    $bmp.Dispose()
    $icon.Dispose()
    $haveIcon = $true
} catch {
    Write-Host "(Skipping custom icon: $($_.Exception.Message))"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $scriptDir
$shortcut.Description = "Launch Polyglot - free, local AI code generator"
if ($haveIcon) {
    $shortcut.IconLocation = $iconPath
}
$shortcut.Save()

Write-Host ""
Write-Host "Done! A 'Polyglot' shortcut has been added to your Desktop." -ForegroundColor Green
Write-Host "Double-click it any time to start Polyglot."
