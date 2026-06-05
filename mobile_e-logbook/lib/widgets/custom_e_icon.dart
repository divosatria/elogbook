import 'package:flutter/material.dart';

class CustomEIcon extends StatelessWidget {
  final double size;
  final Color backgroundColor;
  final Color textColor;
  final double borderWidth;
  final Color? borderColor;

  const CustomEIcon({
    super.key,
    this.size = 24,
    this.backgroundColor = const Color(0xFF1B4F9C),
    this.textColor = Colors.white,
    this.borderWidth = 0,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: backgroundColor,
        border: borderWidth > 0
            ? Border.all(
                color: borderColor ?? Colors.white,
                width: borderWidth,
              )
            : null,
      ),
      child: Center(
        child: Text(
          'E',
          style: TextStyle(
            fontSize: size * 0.5,
            fontWeight: FontWeight.bold,
            color: textColor,
          ),
        ),
      ),
    );
  }
}