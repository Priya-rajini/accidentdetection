$path = "c:\Users\Priya dharshini\OneDrive\Desktop\accident detection\safroute-ai-prototype-main\safroute-ai-prototype-main\src\components\VideoFeedPanel.tsx"

if (-not (Test-Path $path)) {
    Write-Error "File not found: $path"
    exit 1
}

$content = Get-Content -Path $path -Encoding UTF8
$count = $content.Count
Write-Host "Original line count: $count"

# We want to keep 0..861 (inclusive)
# And 1176..End (inclusive)
# Skip 862..1175
# Note: Line 863 in file is index 862.
# We commented it out. So it's "// function removed". We want to remove that too.
# So keep 0..861.
# Line 864 was index 863.
# The block ended at index 1175 (Line 1176).
# So we want indices 1176 onwards.

$indices = (0..861) + (1176..($count - 1))
$newContent = $indices | ForEach-Object { $content[$_] }

$newContent | Set-Content -Path $path -Encoding UTF8
Write-Host "New line count: $($newContent.Count)"
Write-Host "Successfully rewrote file."
