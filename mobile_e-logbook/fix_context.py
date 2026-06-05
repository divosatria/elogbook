import re
import os

with open('context_warnings.txt', 'r', encoding='utf-16') as f:
    lines = f.readlines()

warnings = []
for line in lines:
    match = re.search(r' - (lib\\[^:]+\.dart):(\d+):\d+ - use_build_context_synchronously', line)
    if match:
        warnings.append((match.group(1), int(match.group(2))))

# Group by file
file_warnings = {}
for filepath, linenum in warnings:
    if filepath not in file_warnings:
        file_warnings[filepath] = []
    file_warnings[filepath].append(linenum)

for filepath, linenums in file_warnings.items():
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        file_lines = f.readlines()
        
    # Sort descending so insertions don't affect subsequent line numbers
    linenums = sorted(list(set(linenums)), reverse=True)
    
    modified = False
    for linenum in linenums:
        idx = linenum - 1
        if 0 <= idx < len(file_lines):
            # Check if there's already a mounted check nearby
            already_checked = False
            for i in range(max(0, idx - 5), idx + 1):
                if 'mounted' in file_lines[i]:
                    already_checked = True
                    break
            
            if not already_checked:
                # Get the indentation of the target line
                target_line = file_lines[idx]
                indent = len(target_line) - len(target_line.lstrip())
                indent_str = ' ' * indent
                
                # Check if it's returning a value
                if 'return ' in target_line and not 'return;' in target_line:
                    # It's a return statement returning a value. 
                    # Try to return null if possible, or just skip
                    print(f"Skipping {filepath}:{linenum} because it has a return value.")
                    continue
                
                # Insert the check on the line before
                file_lines.insert(idx, f"{indent_str}if (!context.mounted) return;\n")
                modified = True
                
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(file_lines)
        print(f"Fixed {filepath}")
