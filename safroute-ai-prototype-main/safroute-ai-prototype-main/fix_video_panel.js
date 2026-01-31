const fs = require('fs');
const path = require('path');

const filePath = "c:\\Users\\Priya dharshini\\OneDrive\\Desktop\\accident detection\\safroute-ai-prototype-main\\safroute-ai-prototype-main\\src\\components\\VideoFeedPanel.tsx";

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    // We want to remove lines 863 to 1176 (1-based)
    // 0-based index: 862 to 1175

    const startLine = 863;
    const endLine = 1176;
    const startIndex = startLine - 1;
    const deleteCount = endLine - startLine + 1;

    console.log(`Total lines before: ${lines.length}`);
    console.log(`Removing lines ${startLine} to ${endLine} (${deleteCount} lines)`);
    console.log(`Line ${startLine} content: "${lines[startIndex]}"`);
    console.log(`Line ${endLine} content: "${lines[startIndex + deleteCount - 1]}"`);

    if (lines.length < endLine) {
        console.error("File is shorter than expected!");
        process.exit(1);
    }

    // Double check the content of the boundary lines to ensure we are deleting the right thing
    // Line 863 should be "  // function removed"
    // Line 1176 should be "};"

    const firstLine = lines[startIndex].trim();
    const lastLine = lines[startIndex + deleteCount - 1].trim();

    if (firstLine !== '// function removed' && firstLine !== '') {
        console.warn(`Warning: Line ${startLine} content "${firstLine}" does not match expected "// function removed".`);
        // It might have spaces
    }
    if (lastLine !== '};') {
        console.warn(`Warning: Line ${endLine} content "${lastLine}" does not match expected "};".`);
    }

    lines.splice(startIndex, deleteCount);

    console.log(`Total lines after: ${lines.length}`);

    const newContent = lines.join('\n'); // Unix style endings, or maintain original?
    // split used /\r?\n/, so we lost the original line endings.
    // We can just use \n or \r\n. Windows usually \r\n.

    fs.writeFileSync(filePath, lines.join('\r\n'));
    console.log("File updated successfully.");

} catch (err) {
    console.error("Error:", err);
    process.exit(1);
}
