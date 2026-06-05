import os
import re

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if no http import
    if "import 'package:http/http.dart'" not in content:
        return

    # Replace import
    content = re.sub(r"import 'package:http/http\.dart' as http;", r"import 'package:dio/dio.dart';", content)
    
    # Replace http.get(Uri.parse(url), headers: headers).timeout(...)
    # Note: Regex parsing for nested brackets is hard, so we do simpler string replacements
    
    # Let's do string replaces for common patterns
    content = content.replace("json.decode(response.body)", "(response.data is String ? json.decode(response.data) : response.data)")
    content = content.replace("response.body", "response.data.toString()")
    
    # Replace http.post
    content = re.sub(
        r"await http\.post\(\s*Uri\.parse\((.*?)\),\s*headers:\s*(\{.*?\}),\s*body:\s*json\.encode\((.*?)\),\s*\)(?:\.timeout\(.*?\))?",
        r"await Dio().post(\1, data: \3, options: Options(headers: \2, sendTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 15)))",
        content,
        flags=re.DOTALL
    )

    # Replace http.get
    content = re.sub(
        r"await http\.get\(\s*Uri\.parse\((.*?)\),\s*headers:\s*(\{.*?\}),\s*\)(?:\.timeout\(.*?\))?",
        r"await Dio().get(\1, options: Options(headers: \2, sendTimeout: const Duration(seconds: 30), receiveTimeout: const Duration(seconds: 30)))",
        content,
        flags=re.DOTALL
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Migrated {filepath}")

def main():
    lib_dir = "lib"
    for root, dirs, files in os.walk(lib_dir):
        for file in files:
            if file.endswith(".dart"):
                migrate_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
