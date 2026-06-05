import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class EmergencyButtonWidget extends StatelessWidget {
  final VoidCallback onPressed;

  const EmergencyButtonWidget({
    super.key,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: SizedBox(
        width: ResponsiveHelper.width(context, mobile: 100, tablet: 120),
        height: ResponsiveHelper.height(context, mobile: 100, tablet: 120),
        child: Lottie.asset(
          'assets/animations/alert.json',
          repeat: true,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}
