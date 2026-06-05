import 'package:flutter/material.dart';

class NavigationProvider with ChangeNotifier {
  int _selectedIndex = 0;

  int get selectedIndex => _selectedIndex;

  void setIndex(int index) {
    _selectedIndex = index;
    notifyListeners();
  }
  
  // Reset ke home screen (index 0)
  void resetToHome() {
    _selectedIndex = 0;
    notifyListeners();
  }
}
