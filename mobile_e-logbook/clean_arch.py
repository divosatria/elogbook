import os
import re
import shutil

PACKAGE_NAME = "e_logbook"

# Move rules
MOVE_MAP = {
    "lib/config": "lib/core/config",
    "lib/constants": "lib/core/constants",
    "lib/utils": "lib/core/utils",
    "lib/provider": "lib/core/providers",
    "lib/routes": "lib/core/routes",
    "lib/models": "lib/data/models",
    "lib/services": "lib/data/services",
    "lib/widgets": "lib/shared/widgets",
    "lib/screens": "lib/features/screens",
}

def resolve_relative_import(current_file_path, import_path):
    # current_file_path: e.g. lib/screens/home.dart
    # import_path: e.g. ../models/user.dart
    
    # Get the directory of the current file
    current_dir = os.path.dirname(current_file_path)
    
    # Combine and normalize
    target_path = os.path.normpath(os.path.join(current_dir, import_path))
    # Normalize path separators to /
    target_path = target_path.replace(os.sep, '/')
    
    # Must start with lib/
    if target_path.startswith("lib/"):
        return f"package:{PACKAGE_NAME}/{target_path[4:]}"
    return None

def convert_relative_to_package(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to find all imports
    def import_replacer(match):
        full_import = match.group(0)
        import_path = match.group(1)
        
        # Don't touch package: or dart:
        if import_path.startswith("package:") or import_path.startswith("dart:"):
            return full_import
            
        # It's a relative import
        pkg_import = resolve_relative_import(filepath, import_path)
        if pkg_import:
            # Replace the path in the original string
            return full_import.replace(import_path, pkg_import)
        return full_import

    new_content = re.sub(r"import\s+['\"](.*?)['\"]", import_replacer, content)
    
    # Also do exports
    new_content = re.sub(r"export\s+['\"](.*?)['\"]", import_replacer, new_content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

def update_package_imports(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    def path_updater(match):
        full_string = match.group(0)
        import_path = match.group(1)
        
        if not import_path.startswith(f"package:{PACKAGE_NAME}/"):
            return full_string
            
        # Extract the part after package:e_logbook/
        # e.g. models/user.dart
        internal_path = import_path[len(f"package:{PACKAGE_NAME}/"):]
        full_internal = f"lib/{internal_path}"
        
        # Check against MOVE_MAP
        new_internal = full_internal
        for old_prefix, new_prefix in MOVE_MAP.items():
            if full_internal.startswith(old_prefix + "/") or full_internal == old_prefix:
                new_internal = new_prefix + full_internal[len(old_prefix):]
                break
                
        if new_internal != full_internal:
            # new_internal starts with lib/, we remove it
            new_pkg_path = f"package:{PACKAGE_NAME}/{new_internal[4:]}"
            return full_string.replace(import_path, new_pkg_path)
            
        return full_string

    new_content = re.sub(r"(?:import|export)\s+['\"](.*?)['\"]", path_updater, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

def main():
    # Step 1: Convert all relative imports to package imports in their CURRENT locations
    dart_files = []
    for root, dirs, files in os.walk("lib"):
        for file in files:
            if file.endswith(".dart"):
                # Always use forward slashes for internal paths
                filepath = os.path.join(root, file).replace(os.sep, '/')
                dart_files.append(filepath)
                convert_relative_to_package(filepath)
                
    print("Converted relative imports to package imports.")

    # Step 2: Move the files
    for old_dir, new_dir in MOVE_MAP.items():
        if os.path.exists(old_dir):
            os.makedirs(os.path.dirname(new_dir), exist_ok=True)
            shutil.move(old_dir, new_dir)
            print(f"Moved {old_dir} -> {new_dir}")
            
    print("Moved directories.")

    # Step 3: Update package imports in all new locations
    new_dart_files = []
    for root, dirs, files in os.walk("lib"):
        for file in files:
            if file.endswith(".dart"):
                filepath = os.path.join(root, file).replace(os.sep, '/')
                update_package_imports(filepath)
                
    print("Updated package imports with new paths.")

if __name__ == "__main__":
    main()
