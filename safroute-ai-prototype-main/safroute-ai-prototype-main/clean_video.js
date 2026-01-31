const fs = require('fs');
const path = require('path');

const filePath = 'src/components/VideoFeedPanel.tsx';
const absolutePath = path.resolve(filePath);

console.log(`Reading file: ${absolutePath}`);

try {
    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);

    console.log(`Total lines: ${lines.length}`);

    // Indices to keep: 0 to 861 (Line 1 to 862)
    // Indices to keep: 1176 to end (Line 1177 to end)

    if (lines.length < 1177) {
        console.error('File has fewer lines than expected. Aborting.');
        process.exit(1);
    }

    const part1 = lines.slice(0, 862);
    const part2 = lines.slice(1176);

    console.log(`Part 1 length: ${part1.length}`);
    console.log(`Part 2 length: ${part2.length}`);
    console.log(`Last line of Part 1: "${part1[part1.length - 1]}"`);
    console.log(`First line of Part 2: "${part2[0]}"`);

    const newContent = [...part1, ...part2].join('\n');

    fs.writeFileSync(absolutePath, newContent);
    console.log('File updated successfully.');

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
