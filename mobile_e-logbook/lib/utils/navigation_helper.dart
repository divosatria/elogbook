import 'package:flutter/material.dart';

/// Helper untuk navigasi tanpa transisi/bayangan
class NavigationHelper {
  /// Push page tanpa animasi transisi
  static Future<T?> pushNoTransition<T>(
    BuildContext context,
    Widget page,
  ) {
    return Navigator.push<T>(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => page,
        transitionDuration: Duration.zero,
        reverseTransitionDuration: Duration.zero,
      ),
    );
  }

  /// Push named route tanpa animasi transisi
  static Future<T?> pushNamedNoTransition<T>(
    BuildContext context,
    String routeName, {
    Object? arguments,
  }) {
    return Navigator.pushNamed<T>(
      context,
      routeName,
      arguments: arguments,
    );
  }

  /// Push replacement tanpa animasi transisi
  static Future<T?> pushReplacementNoTransition<T, TO>(
    BuildContext context,
    Widget page,
  ) {
    return Navigator.pushReplacement<T, TO>(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => page,
        transitionDuration: Duration.zero,
        reverseTransitionDuration: Duration.zero,
      ),
    );
  }

  /// Push and remove until tanpa animasi transisi
  static Future<T?> pushAndRemoveUntilNoTransition<T>(
    BuildContext context,
    Widget page,
    bool Function(Route<dynamic>) predicate,
  ) {
    return Navigator.pushAndRemoveUntil<T>(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => page,
        transitionDuration: Duration.zero,
        reverseTransitionDuration: Duration.zero,
      ),
      predicate,
    );
  }
}
