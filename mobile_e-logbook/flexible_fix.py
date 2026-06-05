import re
import os

def flexible_replace(path, pattern, replacement):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content, count = re.subn(pattern, replacement, content, flags=re.DOTALL)
    if count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {path} ({count} replacements)')
    else:
        print(f'Pattern not found in {path}')

flexible_replace('lib/screens/crew/widgets/crew_tracking_button.dart',
    r'Navigator\.pushReplacement\(\s*context,\s*MaterialPageRoute\(\s*builder: \(context\) => PreTripForm\(',
    r'if (!mounted) return;\n    Navigator.pushReplacement(\n      context,\n      MaterialPageRoute(\n        builder: (context) => PreTripForm(')

flexible_replace('lib/screens/crew/widgets/crew_tracking_button.dart',
    r'Navigator\.pushReplacement\(\s*context,\s*MaterialPageRoute\(\s*builder: \(context\) => WaitingApprovalScreen\(',
    r'if (!mounted) return;\n    Navigator.pushReplacement(\n      context,\n      MaterialPageRoute(\n        builder: (context) => WaitingApprovalScreen(')

flexible_replace('lib/screens/crew/widgets/crew_tracking_button.dart',
    r'Navigator\.pushReplacement\(\s*context,\s*MaterialPageRoute\(\s*builder: \(context\) => ActiveTrackingScreen\(',
    r'if (!mounted) return;\n    Navigator.pushReplacement(\n      context,\n      MaterialPageRoute(\n        builder: (context) => ActiveTrackingScreen(')

flexible_replace('lib/screens/main_screen.dart',
    r'if \(context\.mounted\) \{\s*Navigator\.pushAndRemoveUntil\(\s*context,\s*PageRouteBuilder\(',
    r'if (!mounted) return;\n                                        if (context.mounted) {\n                                          Navigator.pushAndRemoveUntil(\n                                            context,\n                                            PageRouteBuilder(')

flexible_replace('lib/screens/main_screen.dart',
    r'if \(mounted\) \{\s*showDialog\(\s*context: context,\s*builder: \(context\) => AlertDialog\(',
    r'if (!mounted) return;\n          if (mounted) {\n            showDialog(\n              context: context,\n              builder: (context) => AlertDialog(')

flexible_replace('lib/screens/main_screen.dart',
    r'Navigator\.pushNamed\(\s*context,\s*AppRoutes\.createCatch,\s*arguments: tripId,',
    r'if (!mounted) return;\n          Navigator.pushNamed(\n            context,\n            AppRoutes.createCatch,\n            arguments: tripId,')

flexible_replace('lib/screens/main_screen.dart',
    r'if \(mounted\) \{\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*SnackBar\(\s*content: Text\(\'Failed to open create catch form:',
    r'if (!mounted) return;\n      if (mounted) {\n        ScaffoldMessenger.of(context).showSnackBar(\n          SnackBar(\n            content: Text(\'Failed to open create catch form:')

flexible_replace('lib/screens/nahkoda/widgets/nahkoda_tracking_button.dart',
    r'NahkodaRoutes\.navigateToActiveTracking\(\s*context,\s*vesselName: tripData\[\'vesselName\'\] \?\? \'Kapal\',',
    r'if (!mounted) return;\n    NahkodaRoutes.navigateToActiveTracking(\n      context,\n      vesselName: tripData[\'vesselName\'] ?? \'Kapal\',')

flexible_replace('lib/screens/nahkoda/widgets/nahkoda_tracking_button.dart',
    r'Navigator\.pushReplacement\(\s*context,\s*MaterialPageRoute\(\s*builder: \(context\) => PreTripForm\(',
    r'if (!mounted) return;\n    Navigator.pushReplacement(\n      context,\n      MaterialPageRoute(\n        builder: (context) => PreTripForm(')

flexible_replace('lib/screens/notification_screen.dart',
    r'await _updateUnreadCounts\(\);\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*const SnackBar\(\s*content: Text\(\'Semua notifikasi telah ditandai dibaca\'\),',
    r'if (!mounted) return;\n    await _updateUnreadCounts();\n    ScaffoldMessenger.of(context).showSnackBar(\n      const SnackBar(\n        content: Text(\'Semua notifikasi telah ditandai dibaca\'),')

flexible_replace('lib/screens/notification_screen.dart',
    r'await _updateUnreadCounts\(\);\s*NavigationHelper\.pushNamedNoTransition\(\s*context,\s*\'/notification-detail\',',
    r'if (!mounted) return;\n                  await _updateUnreadCounts();\n                  NavigationHelper.pushNamedNoTransition(\n                    context,\n                    \'/notification-detail\',')

flexible_replace('lib/screens/notification_screen.dart',
    r'if \(_documentRequirements\.isNotEmpty\) \{\s*NavigationHelper\.pushNamedNoTransition\(\s*context,\s*\'/nahkoda-document-upload\',',
    r'if (!mounted) return;\n                  if (_documentRequirements.isNotEmpty) {\n                    NavigationHelper.pushNamedNoTransition(\n                      context,\n                      \'/nahkoda-document-upload\',')

flexible_replace('lib/screens/schedules/trip_info_screen.dart',
    r'showDialog\(\s*context: context,\s*barrierDismissible: false,\s*builder: \(context\) => const Center\(',
    r'if (!mounted) return;\n    showDialog(\n      context: context,\n      barrierDismissible: false,\n      builder: (context) => const Center(')

flexible_replace('lib/screens/tracking/pre_trip_form.dart',
    r'if \(result != null && result is Map<String, dynamic>\) \{\s*setState\(\(\) => _fuelData = result\);\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*SnackBar\(\s*content: Text\(\'Data bahan bakar tersimpan\'\),',
    r'if (!mounted) return;\n    if (result != null && result is Map<String, dynamic>) {\n      setState(() => _fuelData = result);\n      ScaffoldMessenger.of(context).showSnackBar(\n        SnackBar(\n          content: Text(\'Data bahan bakar tersimpan\'),')

flexible_replace('lib/screens/tracking/pre_trip_form.dart',
    r'if \(result != null && result is Map<String, dynamic>\) \{\s*setState\(\(\) => _iceData = result\);\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*SnackBar\(\s*content: Text\(\'Data es tersimpan\'\),',
    r'if (!mounted) return;\n    if (result != null && result is Map<String, dynamic>) {\n      setState(() => _iceData = result);\n      ScaffoldMessenger.of(context).showSnackBar(\n        SnackBar(\n          content: Text(\'Data es tersimpan\'),')

flexible_replace('lib/screens/tracking/pre_trip_form.dart',
    r'final file = result\.files\.single;\s*if \(file\.size > 10 \* 1024 \* 1024\) \{\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*SnackBar\(\s*content: Text\(\'Ukuran file maksimal 10MB\'\),',
    r'if (!mounted) return;\n        final file = result.files.single;\n        if (file.size > 10 * 1024 * 1024) {\n          ScaffoldMessenger.of(context).showSnackBar(\n            SnackBar(\n              content: Text(\'Ukuran file maksimal 10MB\'),')

flexible_replace('lib/screens/tracking/pre_trip_form.dart',
    r'\} catch \(e\) \{\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*SnackBar\(\s*content: Text\(\'Gagal memilih dokumen\'\),',
    r'} catch (e) {\n      if (!mounted) return;\n      ScaffoldMessenger.of(context).showSnackBar(\n        SnackBar(\n          content: Text(\'Gagal memilih dokumen\'),')

flexible_replace('lib/screens/tracking/pre_trip_form.dart',
    r'\}\);\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*SnackBar\(\s*content: Text\(\'Data crew berhasil diperbarui\'\),',
    r'});\n\n    if (!mounted) return;\n    ScaffoldMessenger.of(context).showSnackBar(\n      SnackBar(\n        content: Text(\'Data crew berhasil diperbarui\'),')

flexible_replace('lib/screens/tracking/pre_trip_form.dart',
    r'\}\);\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*SnackBar\(\s*content: Text\(\'Dokumen berhasil diupload\'\),',
    r'});\n\n      if (!mounted) return;\n      ScaffoldMessenger.of(context).showSnackBar(\n        SnackBar(\n          content: Text(\'Dokumen berhasil diupload\'),')

flexible_replace('lib/screens/tracking/pre_trip_form.dart',
    r'\} catch \(e\) \{\s*print\(\'[^\']*Error uploading crew data: \$e\'\);\s*ScaffoldMessenger\.of\(context\)\.showSnackBar\(\s*SnackBar\(\s*content: Text\(\'Gagal mengupload dokumen: \$e\'\),',
    r'} catch (e) {\n      print(\'❌ Error uploading crew data: $e\');\n      if (!mounted) return;\n      ScaffoldMessenger.of(context).showSnackBar(\n        SnackBar(\n          content: Text(\'Gagal mengupload dokumen: $e\'),')
