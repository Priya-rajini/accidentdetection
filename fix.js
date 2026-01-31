const fs = require('fs');
const path = "c:\\Users\\Priya dharshini\\OneDrive\\Desktop\\accident detection\\safroute-ai-prototype-main\\safroute-ai-prototype-main\\src\\components\\VideoFeedPanel.tsx";

if (!fs.existsSync(path)) {
    console.error("File not found:", path);
    process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

console.log('Total lines:', lines.length);

// Target: lines 863 to 1176 (1-based) -> indices 862 to 1175
// Check if 862 matches "const processVideoFrames"
// We need to be careful with whitespace trimming for check
const targetLine = lines[862];
console.log('Line 863 content:', targetLine);

if (targetLine && targetLine.includes('processVideoFrames')) {
    console.log('Found function start. deleting...');
    // Calculate count: 1176 - 863 + 1 = 314 lines
    // Verify end line 
    const endLine = lines[1175]; // Line 1176
    console.log('Line 1176 content:', endLine);

    // Check if endLine looks like end of function "  };"
    // or close to it.

    lines.splice(862, 314);

    // Join with original line ending if possible, or \n
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('File updated. New line count:', lines.length);
} else {
    console.log('Target not found at index 862. Searching...');
    // Search for line index
    const idx = lines.findIndex(l => l.includes('const processVideoFrames = async'));
    if (idx !== -1) {
        console.log('Found at index:', idx);
    } else {
        console.log('Not found at all.');
    }
}
