import os

file_path = r"c:\Users\Priya dharshini\OneDrive\Desktop\accident detection\safroute-ai-prototype-main\safroute-ai-prototype-main\src\components\VideoFeedPanel.tsx"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Lines to delete: 863 to 1176 (1-based)
# Indices: 862 to 1175 (0-based)
# We keep 0..861 and 1176..end

start_idx = 862
end_idx = 1176 # Slice end is exclusive, but we want to SKIP up to 1175. So next start is 1176.

# Verify start
print(f"Line 863 starts with: {lines[start_idx][:50]}")
# Verify end
print(f"Line 1176 ends with: {lines[end_idx-1][:50]}")

new_lines = lines[:start_idx] + lines[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"New line count: {len(new_lines)}")
print("Successfully deleted lines.")
