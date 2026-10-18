# Export Windows/macOS icon containers from the generated PNG master.
# Run on Windows: powershell -File tools/export-agent-stage-icon.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Image]::FromFile((Join-Path $root 'build/agent-stage.png'))
function Get-IconPng([int]$size) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $stream = New-Object System.IO.MemoryStream
    try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($source, 0, 0, $size, $size)
        $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        return ,$stream.ToArray()
    } finally {
        $stream.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
function Write-BigEndian($writer, [int]$value) {
    $bytes = [BitConverter]::GetBytes($value)
    if ([BitConverter]::IsLittleEndian) { [Array]::Reverse($bytes) }
    $writer.Write($bytes)
}
try {
    $sizes = @(16, 24, 32, 48, 64, 128, 256)
    $images = @{}
    foreach ($size in $sizes) { $images[$size] = Get-IconPng $size }
    $ico = [IO.BinaryWriter]::new([IO.File]::Create((Join-Path $root 'build/agent-stage.ico')))
    try {
        $ico.Write([uint16]0); $ico.Write([uint16]1); $ico.Write([uint16]$sizes.Count)
        $offset = 6 + 16 * $sizes.Count
        foreach ($size in $sizes) {
            $dimension = if ($size -eq 256) { 0 } else { $size }
            $ico.Write([byte]$dimension); $ico.Write([byte]$dimension)
            $ico.Write([byte]0); $ico.Write([byte]0)
            $ico.Write([uint16]1); $ico.Write([uint16]32)
            $ico.Write([uint32]$images[$size].Length); $ico.Write([uint32]$offset)
            $offset += $images[$size].Length
        }
        foreach ($size in $sizes) { $ico.Write([byte[]]$images[$size]) }
    } finally { $ico.Dispose() }
    $entries = @(@('icp4',16), @('icp5',32), @('icp6',64), @('ic07',128), @('ic08',256), @('ic09',512), @('ic10',1024))
    $images[512] = Get-IconPng 512
    $images[1024] = Get-IconPng 1024
    $length = 8
    foreach ($entry in $entries) { $length += 8 + $images[$entry[1]].Length }
    $icns = [IO.BinaryWriter]::new([IO.File]::Create((Join-Path $root 'build/agent-stage.icns')))
    try {
        $icns.Write([Text.Encoding]::ASCII.GetBytes('icns'))
        Write-BigEndian $icns $length
        foreach ($entry in $entries) {
            $icns.Write([Text.Encoding]::ASCII.GetBytes($entry[0]))
            Write-BigEndian $icns (8 + $images[$entry[1]].Length)
            $icns.Write([byte[]]$images[$entry[1]])
        }
    } finally { $icns.Dispose() }
} finally { $source.Dispose() }
