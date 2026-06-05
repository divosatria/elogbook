import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';

class SectionTitle extends StatelessWidget {
  final String title;
  final IconData? icon;
  final Color? color;

  const SectionTitle({
    super.key,
    required this.title,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(
            icon,
            color: color ?? const Color(0xFF1B4F9C),
            size: ResponsiveHelper.width(context, mobile: 22, tablet: 26),
          ),
          SizedBox(width: ResponsiveHelper.width(context, mobile: 8, tablet: 10)),
        ],
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 18, tablet: 20),
              fontWeight: FontWeight.bold,
              color: color ?? const Color(0xFF1B4F9C),
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}