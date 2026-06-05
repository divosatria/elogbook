import 'package:flutter/material.dart';

class AnimatedVesselMarke extends StatefulWidget {
  final bool isViolating;

  const AnimatedVesselMarke({required this.isViolating});

  @override
  State<AnimatedVesselMarke> createState() => AnimatedVesselMarkeState();
}

class AnimatedVesselMarkeState extends State<AnimatedVesselMarke>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.scale(
          scale: widget.isViolating ? _animation.value : 1.0,
          child: Container(
            decoration: BoxDecoration(
              color: widget.isViolating ? Colors.red : Colors.green,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: (widget.isViolating ? Colors.red : Colors.green)
                      .withOpacity(0.5),
                  blurRadius: 10,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.directions_boat,
              color: Colors.white,
              size: 24,
            ),
          ),
        );
      },
    );
  }
}