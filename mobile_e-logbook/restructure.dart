import 'dart:io';

void main() async {
  // Create directories
  final dirs = [
    'lib/core/config',
    'lib/core/constants',
    'lib/core/theme',
    'lib/core/utils',
    'lib/core/extensions',
    'lib/core/errors',
    'lib/core/network',
    'lib/data/models',
    'lib/data/datasources',
    'lib/data/services',
    'lib/features',
    'lib/shared/widgets',
    'lib/shared/dialogs',
    'lib/shared/components',
  ];

  for (final dir in dirs) {
    await Directory(dir).create(recursive: true);
  }

  print('✅ Folders created.');

  // Mappings for moving files
  final moveMap = {
    'lib/config': 'lib/core/config',
    'lib/constants': 'lib/core/constants',
    'lib/utils': 'lib/core/utils',
    'lib/models': 'lib/data/models',
    // Special handling needed for screens -> features, widgets -> shared/widgets
  };

  // We will move directories if they exist
  for (final entry in moveMap.entries) {
    final source = Directory(entry.key);
    final target = Directory(entry.value);
    
    if (await source.exists()) {
      // Move contents
      final entities = source.listSync(recursive: true);
      for (final entity in entities) {
        if (entity is File) {
          final relativePath = entity.path.substring(source.path.length + 1);
          final newPath = '${target.path}/$relativePath';
          await File(newPath).parent.create(recursive: true);
          await entity.rename(newPath);
        }
      }
      await source.delete(recursive: true);
      print('Moved ${entry.key} to ${entry.value}');
    }
  }

  print('✅ Files moved.');
  
  // Note: Rewriting imports automatically is too risky in a simple script because of relative paths like ../../utils/etc.
  // It's better to let IDE tools handle it or use a proper AST parser.
}
