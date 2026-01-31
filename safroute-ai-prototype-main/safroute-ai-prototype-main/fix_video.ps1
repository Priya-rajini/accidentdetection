$path = "c:\Users\Priya dharshini\OneDrive\Desktop\accident detection\safroute-ai-prototype-main\safroute-ai-prototype-main\src\components\VideoFeedPanel.tsx"
$lines = Get-Content -Path $path
Write-Host "Total lines: $($lines.Count)"

# Indices are 0-based. 
# Keep lines 1-862 (indices 0-861)
# Remove lines 863-1176 (indices 862-1175)
# Keep lines 1177-end (indices 1176-end)

if ($lines.Count -lt 1176) {
    Write-Error "File is smaller than expected."
    exit 1
}

$part1 = $lines[0..861]
$part2 = $lines[1176..($lines.Count - 1)]
$newContent = $part1 + $part2

$newContent | Set-Content -Path $path -Encoding UTF8
Write-Host "File updated. New line count: $($newContent.Count)"
