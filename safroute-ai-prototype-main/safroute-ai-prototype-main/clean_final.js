const fs = require('fs');
const path = require('path');

const filePath = 'src/components/VideoFeedPanel.tsx';
const absolutePath = path.resolve(filePath);

console.log(`Starting cleanup of: ${absolutePath}`);

try {
    if (!fs.existsSync(absolutePath)) {
        console.error('File does not exist!');
        process.exit(1);
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);

    console.log(`Original line count: ${lines.length}`);

    // Target: index 862 to 1175 (lines 863-1176)
    // Keep 0-861
    // Keep 1176-end

    if (lines.length < 1177) {
        console.error('File too short. Aborting.');
        process.exit(1);
    }

    const part1 = lines.slice(0, 862);
    const part2 = lines.slice(1176);

    console.log(`Keeping top ${part1.length} lines.`);
    console.log(`Keeping bottom ${part2.length} lines.`);

    const newContent = [...part1, ...part2].join('\n'); // using LF for consistency

    fs.writeFileSync(absolutePath, newContent);
    console.log('File successfully rewritten.');

} catch (err) {
    console.error('An error occurred:', err);
    process.exit(1);
}
