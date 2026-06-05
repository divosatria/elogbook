import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:e_logbook/provider/catch_provider.dart';
import 'package:e_logbook/provider/user_provider.dart';
import 'package:e_logbook/provider/zone_alert.dart';
import 'package:e_logbook/provider/navigation_provider.dart';
import 'package:e_logbook/provider/notification_provider.dart';
import 'package:e_logbook/provider/tracking_minimize_provider.dart';
import 'package:e_logbook/config/app_initializer.dart';
import 'package:e_logbook/routes/route_generator.dart';
import 'package:e_logbook/screens/splash_screen.dart';
import 'package:e_logbook/widgets/initialization_error_screen.dart';
import 'package:e_logbook/widgets/tracking_minimized_overlay.dart';
import 'package:e_logbook/services/fcm/fcm_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize FCM
  await FCMService.initialize();
  
  // Force unlock all orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  final initialized = await AppInitializer.initialize();

  runApp(
    initialized
        ? MultiProvider(
            providers: [
              ChangeNotifierProvider(create: (_) => UserProvider()),
              ChangeNotifierProvider(create: (_) => CatchProvider()),
              ChangeNotifierProvider(create: (_) => ZoneAlertProvider()),
              ChangeNotifierProvider(create: (_) => NavigationProvider()),
              ChangeNotifierProvider(create: (_) => NotificationProvider()),
              ChangeNotifierProvider(create: (_) => TrackingMinimizeProvider()),
            ],
            child: const MyApp(),
          )
        : const InitializationErrorScreen(),
  );
}



class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    // Set navigator key ke provider
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TrackingMinimizeProvider>(context, listen: false)
          .setNavigatorKey(navigatorKey);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.grey[50],
      ),
      home: const SplashScreen(),
      onGenerateRoute: RouteGenerator.generateRoute,
      builder: (context, child) {
        return Stack(
          children: [
            child ?? const SizedBox(),
            Consumer<TrackingMinimizeProvider>(
              builder: (context, provider, _) {
                if (provider.isMinimized && provider.isTracking) {
                  return TrackingMinimizedOverlay();
                }
                return const SizedBox();
              },
            ),
          ],
        );
      },
    );
  }
}
