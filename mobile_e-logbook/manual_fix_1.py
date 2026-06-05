import os

def replace_in_file(path, old_text, new_text):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_text in content:
        content = content.replace(old_text, new_text)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"Text not found in {path}")

# 1. login_screen.dart
replace_in_file(
    'lib/screens/Login/login_screen.dart',
    '''          Navigator.pushAndRemoveUntil(
            context,''',
    '''          if (!mounted) return;
          Navigator.pushAndRemoveUntil(
            context,'''
)

# 2. create_catch_screen.dart
replace_in_file(
    'lib/screens/crew/screens/create_catch_screen.dart',
    '''      final catchData = {
        'id': catchId,''',
    '''      if (!mounted) return;
      final catchData = {
        'id': catchId,'''
)
replace_in_file(
    'lib/screens/crew/screens/create_catch_screen.dart',
    '''      final result = await CatchSubmissionService.submitCatch(
        catchData: catchData,''',
    '''      if (!mounted) return;
      final result = await CatchSubmissionService.submitCatch(
        catchData: catchData,'''
)

# 3. crew_floating_menu.dart
replace_in_file(
    'lib/screens/crew/widgets/crew_floating_menu.dart',
    '''    final success = await showSosAlertDialog(context);''',
    '''    if (!mounted) return;
    final success = await showSosAlertDialog(context);'''
)

# 4. crew_tracking_button.dart
replace_in_file(
    'lib/screens/crew/widgets/crew_tracking_button.dart',
    '''        final minimizeProvider = Provider.of<TrackingMinimizeProvider>(context, listen: false);''',
    '''        if (!mounted) return;
        final minimizeProvider = Provider.of<TrackingMinimizeProvider>(context, listen: false);'''
)
replace_in_file(
    'lib/screens/crew/widgets/crew_tracking_button.dart',
    '''    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => PreTripForm(
          vesselId: tripData['vesselId'] ?? '',
          vesselName: tripData['vesselName'] ?? 'Kapal',
        ),
      ),
    );''',
    '''    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => PreTripForm(
          vesselId: tripData['vesselId'] ?? '',
          vesselName: tripData['vesselName'] ?? 'Kapal',
        ),
      ),
    );'''
)
replace_in_file(
    'lib/screens/crew/widgets/crew_tracking_button.dart',
    '''    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => WaitingApprovalScreen(
          vesselName: tripData['vesselName'] ?? 'Kapal',
        ),
      ),
    );''',
    '''    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => WaitingApprovalScreen(
          vesselName: tripData['vesselName'] ?? 'Kapal',
        ),
      ),
    );'''
)
replace_in_file(
    'lib/screens/crew/widgets/crew_tracking_button.dart',
    '''    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => ActiveTrackingScreen(
          vesselName: tripData['vesselName'] ?? 'Kapal',
        ),
      ),
    );''',
    '''    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => ActiveTrackingScreen(
          vesselName: tripData['vesselName'] ?? 'Kapal',
        ),
      ),
    );'''
)

# 5. document_status_helper.dart
replace_in_file(
    'lib/screens/documents/document_status_helper.dart',
    '''    NavigationHelper.pushNoTransition(context, screen);''',
    '''    if (!context.mounted) return;
    NavigationHelper.pushNoTransition(context, screen);'''
)

# 6. document_upload_stepper.dart
replace_in_file(
    'lib/screens/documents/document_upload_stepper.dart',
    '''        Navigator.pop(context);
        return;''',
    '''        if (!mounted) return;
        Navigator.pop(context);
        return;'''
)
replace_in_file(
    'lib/screens/documents/document_upload_stepper.dart',
    '''        Navigator.pop(context);
      }''',
    '''        if (!mounted) return;
        Navigator.pop(context);
      }'''
)
replace_in_file(
    'lib/screens/documents/document_upload_stepper.dart',
    '''      Navigator.pop(context);
    }''',
    '''      if (!mounted) return;
      Navigator.pop(context);
    }'''
)

# 7. ktp_scanner_screen.dart
replace_in_file(
    'lib/screens/documents/widgets/ocr/ktp_scanner_screen.dart',
    '''      // Get screen dimensions
      final screenWidth = MediaQuery.of(context).size.width;
      final screenHeight = MediaQuery.of(context).size.height;''',
    '''      if (!mounted) return;
      // Get screen dimensions
      final screenWidth = MediaQuery.of(context).size.width;
      final screenHeight = MediaQuery.of(context).size.height;'''
)

# 8. main_screen.dart
replace_in_file(
    'lib/screens/main_screen.dart',
    '''                                        if (context.mounted) {
                                          Navigator.pushAndRemoveUntil(
                                            context,
                                            PageRouteBuilder(
                                              pageBuilder: (context, animation, secondaryAnimation) =>
                                                  const LoginScreen(),
                                              transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                                return FadeTransition(opacity: animation, child: child);
                                              },
                                              transitionDuration: const Duration(milliseconds: 300),
                                            ),
                                            (route) => false,
                                          );
                                        }''',
    '''                                        if (!mounted) return;
                                        if (context.mounted) {
                                          Navigator.pushAndRemoveUntil(
                                            context,
                                            PageRouteBuilder(
                                              pageBuilder: (context, animation, secondaryAnimation) =>
                                                  const LoginScreen(),
                                              transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                                return FadeTransition(opacity: animation, child: child);
                                              },
                                              transitionDuration: const Duration(milliseconds: 300),
                                            ),
                                            (route) => false,
                                          );
                                        }'''
)
replace_in_file(
    'lib/screens/main_screen.dart',
    '''          if (mounted) {
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Invalid Area'),
                content: Text(result['message'] ?? 'You are outside the designated fishing zone.'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('OK'),
                  ),
                ],
              ),
            );
          }''',
    '''          if (!mounted) return;
          if (mounted) {
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Invalid Area'),
                content: Text(result['message'] ?? 'You are outside the designated fishing zone.'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('OK'),
                  ),
                ],
              ),
            );
          }'''
)
replace_in_file(
    'lib/screens/main_screen.dart',
    '''          // Gunakan named route dengan tripId
          Navigator.pushNamed(
            context,
            AppRoutes.createCatch,
            arguments: tripId,
          );''',
    '''          if (!mounted) return;
          // Gunakan named route dengan tripId
          Navigator.pushNamed(
            context,
            AppRoutes.createCatch,
            arguments: tripId,
          );'''
)
replace_in_file(
    'lib/screens/main_screen.dart',
    '''      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to open create catch form: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }''',
    '''      if (!mounted) return;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to open create catch form: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }'''
)

# 9. nahkoda_floating_menu.dart
replace_in_file(
    'lib/screens/nahkoda/widgets/nahkoda_floating_menu.dart',
    '''    // Show SOS dialog
    final success = await showSosAlertDialog(context);''',
    '''    if (!mounted) return;
    // Show SOS dialog
    final success = await showSosAlertDialog(context);'''
)

# 10. nahkoda_tracking_button.dart
replace_in_file(
    'lib/screens/nahkoda/widgets/nahkoda_tracking_button.dart',
    '''        // Cek apakah tracking sedang minimize
        final minimizeProvider = Provider.of<TrackingMinimizeProvider>(context, listen: false);''',
    '''        if (!mounted) return;
        // Cek apakah tracking sedang minimize
        final minimizeProvider = Provider.of<TrackingMinimizeProvider>(context, listen: false);'''
)
replace_in_file(
    'lib/screens/nahkoda/widgets/nahkoda_tracking_button.dart',
    '''    NahkodaRoutes.navigateToActiveTracking(
      context,
      vesselName: tripData['vesselName'] ?? 'Kapal',
    );''',
    '''    if (!mounted) return;
    NahkodaRoutes.navigateToActiveTracking(
      context,
      vesselName: tripData['vesselName'] ?? 'Kapal',
    );'''
)
replace_in_file(
    'lib/screens/nahkoda/widgets/nahkoda_tracking_button.dart',
    '''    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => PreTripForm(
          vesselId: tripData['vesselId'] ?? '',
          vesselName: tripData['vesselName'] ?? 'Kapal',
        ),
      ),
    );''',
    '''    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => PreTripForm(
          vesselId: tripData['vesselId'] ?? '',
          vesselName: tripData['vesselName'] ?? 'Kapal',
        ),
      ),
    );'''
)

print("Done phase 1")
