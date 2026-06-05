import re
import os

with open('analyze.txt', 'r', encoding='utf-16') as f:
    lines = f.readlines()

warnings = {}
for line in lines:
    if 'use_build_context_synchronously' in line:
        parts = line.split(' - ')
        if len(parts) >= 3:
            file_info = parts[2].strip()
            if ':' in file_info:
                file_parts = file_info.split(':')
                path = file_parts[0]
                line_num = int(file_parts[1])
                if path not in warnings:
                    warnings[path] = []
                warnings[path].append(line_num)

for path, line_nums in warnings.items():
    norm_path = os.path.normpath(path)
    if not os.path.exists(norm_path):
        continue
    
    with open(norm_path, 'r', encoding='utf-8') as f:
        content = f.readlines()
    
    # Sort line numbers descending so inserting lines doesn't offset subsequent line numbers
    line_nums.sort(reverse=True)
    
    for line_num in line_nums:
        idx = line_num - 1 # 0-based index
        if idx >= len(content):
            continue
            
        # Look backwards to find the start of the statement
        # A statement start is typically the first line after a line ending with ;, {, }, or empty
        start_idx = idx
        while start_idx > 0:
            prev_line = content[start_idx - 1].strip()
            if prev_line == '' or prev_line.endswith(';') or prev_line.endswith('{') or prev_line.endswith('}') or prev_line.startswith('//'):
                break
            start_idx -= 1
            
        # Special case: if we found a line starting with 'return', it's likely the start of the statement
        
        # Determine indentation from start_idx
        indent_match = re.match(r'^(\s*)', content[start_idx])
        indent = indent_match.group(1) if indent_match else ''
        
        # Check if it's already guarded by if (!mounted) return;
        already_guarded = False
        check_idx = start_idx - 1
        while check_idx >= 0 and content[check_idx].strip() == '':
            check_idx -= 1
        if check_idx >= 0 and 'if (!mounted) return;' in content[check_idx] or 'if (!context.mounted) return;' in content[check_idx]:
            already_guarded = True
            
        if not already_guarded:
            content.insert(start_idx, f'{indent}if (!mounted) return;\n')
            
    with open(norm_path, 'w', encoding='utf-8') as f:
        f.writelines(content)

print(f"Fixed {sum(len(v) for v in warnings.values())} warnings.")
