import os
import re

mapping = {
    'app_colors.dart': 'package:test_lora/core/theme/app_colors.dart',
    'lora_api_server.dart': 'package:test_lora/data/api/lora_api_server.dart',
    'lora_database.dart': 'package:test_lora/data/database/lora_database.dart',
    'lora_record.dart': 'package:test_lora/data/models/lora_record.dart',
    'lora_provider.dart': 'package:test_lora/shared/providers/lora_provider.dart',
    'elogbook_sync_service.dart': 'package:test_lora/shared/services/elogbook_sync_service.dart',
    'lora_serial_service.dart': 'package:test_lora/shared/services/lora_serial_service.dart',
    'api_screen.dart': 'package:test_lora/features/api_server/screens/api_screen.dart',
    'main_shell.dart': 'package:test_lora/features/dashboard/screens/main_shell.dart',
    'dashboard_screen.dart': 'package:test_lora/features/dashboard/screens/dashboard_screen.dart',
    'database_screen.dart': 'package:test_lora/features/database/screens/database_screen.dart',
    'packets_screen.dart': 'package:test_lora/features/packets/screens/packets_screen.dart',
    'port_screen.dart': 'package:test_lora/features/settings/screens/port_screen.dart',
    'app_sidebar.dart': 'package:test_lora/shared/widgets/app_sidebar.dart',
    'app_topbar.dart': 'package:test_lora/shared/widgets/app_topbar.dart',
    'confirm_dialog.dart': 'package:test_lora/shared/widgets/confirm_dialog.dart',
    'packet_log_card.dart': 'package:test_lora/shared/widgets/packet_log_card.dart',
    'status_card.dart': 'package:test_lora/shared/widgets/status_card.dart',
    'placeholder_screen.dart': 'package:test_lora/features/dashboard/screens/placeholder_screen.dart', # wait I didn't move this, wait, it's deleted? Let me check.
}

for root, _, files in os.walk('lib'):
    for file in files:
        if file.endswith('.dart'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for line in content.split('\n'):
                if line.strip().startswith('import') or line.strip().startswith('export'):
                    match = re.search(r"['\"](.*?)['\"]", line)
                    if match:
                        import_path = match.group(1)
                        # Avoid replacing already formatted package: imports incorrectly if they share a basename
                        # Actually just replace the whole path with the new one
                        basename = import_path.split('/')[-1]
                        if basename in mapping:
                            new_line = line.replace(import_path, mapping[basename])
                            new_content = new_content.replace(line, new_line)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

print('Imports fixed.')
