import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class MenuToggleButton extends StatelessWidget {
  final bool isMenuOpen;
  final VoidCallback onToggle;

  const MenuToggleButton({
    super.key,
    required this.isMenuOpen,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onToggle,
      child: Container(
        width: ResponsiveHelper.width(context, mobile: 56, tablet: 70),
        height: ResponsiveHelper.height(context, mobile: 56, tablet: 70),
        decoration: BoxDecoration(
          color: Colors.transparent,
          shape: BoxShape.circle,
          border: Border.all(
            color: const Color(0xFF1B4F9C),
            width: 2.5,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1B4F9C).withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 0),
            ),
          ],
        ),
        child: isMenuOpen
            ? Icon(
                Icons.close,
                color: const Color(0xFF1B4F9C),
                size: ResponsiveHelper.width(context, mobile: 30, tablet: 38),
              )
            :Lottie.asset(
                  'assets/animations/listfitur.json',
                  fit: BoxFit.contain,
                  repeat: true,
                  animate: true,
                  errorBuilder: (context, error, stackTrace) {
                    return Icon(
                      Icons.menu,
                      color: const Color(0xFF1B4F9C),
                      size: ResponsiveHelper.width(context, mobile: 28, tablet: 35),
                    );
                  },
                ),
              ),
    );
  }
}