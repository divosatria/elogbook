import 'dart:io';

void main() {
  final dir = Directory('lib');
  final files = dir.listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart'));
  
  int updatedFilesCount = 0;
  
  for (var file in files) {
    String content = file.readAsStringSync();
    
    if (content.contains("prefs.getString('auth_token')")) {
      content = content.replaceAll(
        "prefs.getString('auth_token')", 
        "await SecureStorageService.getToken()"
      );
      
      // Hitung kedalaman path untuk import
      final depth = file.path.split(Platform.pathSeparator).length - 2;
      final upPath = List.filled(depth, '..').join('/');
      final importStr = "import '$upPath/services/local/secure_storage_service.dart';\n";
      
      if (!content.contains('secure_storage_service.dart')) {
        // Tambahkan import setelah import flutter atau dart
        int insertIdx = content.lastIndexOf(RegExp(r"import 'package:.*';"));
        if (insertIdx == -1) insertIdx = content.lastIndexOf(RegExp(r"import 'dart:.*';"));
        
        if (insertIdx != -1) {
          int endOfLine = content.indexOf('\n', insertIdx);
          content = content.substring(0, endOfLine + 1) + importStr + content.substring(endOfLine + 1);
        } else {
          content = importStr + content;
        }
      }
      
      file.writeAsStringSync(content);
      updatedFilesCount++;
      print('Fixed token in: ${file.path}');
    }
  }
  
  print('Total files updated: $updatedFilesCount');
}
