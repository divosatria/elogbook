import 'package:flutter/material.dart';

class PlaceholderScreen extends StatelessWidget {
  final String title;
  final IconData? icon;
  final String? description;

  const PlaceholderScreen({
    super.key, 
    required this.title,
    this.icon,
    this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) Icon(icon, size: 48, color: Colors.grey),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(fontSize: 24)),
          if (description != null) ...[
            const SizedBox(height: 8),
            Text(description!, style: const TextStyle(color: Colors.grey)),
          ],
        ],
      ),
    );
  }
}
