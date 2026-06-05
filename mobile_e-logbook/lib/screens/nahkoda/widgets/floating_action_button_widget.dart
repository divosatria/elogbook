import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class FloatingActionButtonWidget extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const FloatingActionButtonWidget({
    super.key,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    String? lottieAsset;
    bool useLottie = false;
    
    switch (icon) {
      case Icons.emergency:
        lottieAsset = 'assets/animations/call.json';
        useLottie = true;
        break;
      case Icons.support_agent:
        lottieAsset = 'assets/animations/wa.json';
        useLottie = true;
        break;
      case Icons.my_location:
        final now = DateTime.now();
        final isNight = now.hour >= 18 || now.hour < 6;
        lottieAsset = isNight 
            ? 'assets/animations/tripmalam.json'
            : 'assets/animations/tripsiang.json';
        useLottie = true;
        break;
    }

    // Special handling for WhatsApp (no border, green shadow)
    final isWhatsApp = icon == Icons.support_agent;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: ResponsiveHelper.width(context, mobile: 56, tablet: 70),
        height: ResponsiveHelper.height(context, mobile: 56, tablet: 70),
        decoration: BoxDecoration(
          color: useLottie ? Colors.transparent : color,
          shape: BoxShape.circle,
          border: (useLottie && !isWhatsApp) ? Border.all(color: color, width: 2.5) : (isWhatsApp ? Border.all(color: Colors.green, width: 2.5) : null),
          boxShadow: [
            BoxShadow(
              color: (isWhatsApp ? Colors.green : color).withOpacity(useLottie ? 0.4 : 0.3),
              blurRadius: useLottie ? 12 : 8,
              offset: const Offset(0, 0),
            ),
          ],
        ),
        child: useLottie
            ? ClipOval(
                child: Lottie.asset(
                  lottieAsset!,
                  fit: BoxFit.cover,
                  repeat: true,
                  animate: true,
                ),
              )
            : Icon(
                icon,
                color: Colors.white,
                size: ResponsiveHelper.width(context, mobile: 24, tablet: 28),
              ),
      ),
    );
  }
}