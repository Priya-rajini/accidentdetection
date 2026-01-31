
import os

file_path = r"c:\Users\Priya dharshini\OneDrive\Desktop\accident detection\safroute-ai-prototype-main\safroute-ai-prototype-main\src\components\VideoFeedPanel.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# We want to remove lines 863 to 1176 (1-based)
# 0-based: 862 to 1175
# Keep 0..861
# Keep 1176..end

part1 = lines[0:862]
part2 = lines[1176:]

new_content = "".join(part1 + part2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"New total lines: {len(part1) + len(part2)}")
print("Successfully cleaned VideoFeedPanel.tsx")
