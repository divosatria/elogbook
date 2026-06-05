import 'dart:async';
import 'package:flutter/material.dart';


class CatchCarousel extends StatefulWidget {
  const CatchCarousel({super.key});

  @override
  State<CatchCarousel> createState() => _CatchCarouselState();
}

class _CatchCarouselState extends State<CatchCarousel> {
  final PageController _controller = PageController(
    viewportFraction: 1.0,
    initialPage: 1000, // Mulai dari tengah untuk infinite scroll
  );
  Timer? _timer;
  int _currentPage = 0;
  double _currentPageValue = 0.0;

  final List<String> dummyImages = [
    'assets/fish.jpeg',
    'assets/fish1.jpg',
    'assets/fish2.jpeg',
  ];

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            setState(() {
              _currentPageValue = _controller.page ?? 0.0;
              // Update current page berdasarkan modulo
              _currentPage = (_controller.page?.round() ?? 0) % dummyImages.length;
            });
          }
        });
      }
    });
    _startAutoScroll();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _startAutoScroll() {
    _timer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!mounted) return;

      final nextPage = (_controller.page?.round() ?? 0) + 1;

      _controller.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    if (dummyImages.isEmpty) return const SizedBox.shrink();
    
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final isTablet = screenWidth > 600;
    final isLandscape = screenWidth > screenHeight;
    
    // Adaptive height: landscape tablet lebih besar untuk tampilkan gambar penuh
    final carouselHeight = isTablet 
        ? (isLandscape ? screenHeight * 0.40 : screenHeight * 0.35)
        : screenHeight * 0.22;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: carouselHeight,
          child: PageView.builder(
            controller: _controller,
            itemCount: null,
            onPageChanged: (i) {
              setState(() {
                _currentPage = i % dummyImages.length;
              });
            },
            itemBuilder: (context, index) {
              final imageIndex = index % dummyImages.length;
              
              double scale = 1.0;
              if (_currentPageValue >= index - 1 && _currentPageValue <= index + 1) {
                scale = 1.0 - ((_currentPageValue - index).abs() * 0.03);
              }

              return Transform.scale(
                scale: scale,
                child: AnimatedOpacity(
                  opacity: _currentPage == imageIndex ? 1.0 : 0.7,
                  duration: const Duration(milliseconds: 300),
                  child: Container(
                    margin: EdgeInsets.symmetric(
                      horizontal: screenWidth * 0.015,
                      vertical: carouselHeight * 0.03,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.15),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Image.asset(
                        dummyImages[imageIndex],
                        fit: BoxFit.contain,
                        width: double.infinity,
                        height: double.infinity,
                        alignment: Alignment.center,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        
        const SizedBox(height: 12),
        
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            dummyImages.length,
            (index) {
              bool isActive = _currentPage == index;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                height: 8,
                width: isActive ? 24 : 8,
                decoration: BoxDecoration(
                  color: isActive 
                      ? Theme.of(context).primaryColor 
                      : Colors.white,
                  borderRadius: BorderRadius.circular(4),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}