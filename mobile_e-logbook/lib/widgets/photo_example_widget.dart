import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';

class PhotoExampleWidget extends StatelessWidget {
  final String title;
  final String goodImagePath;
  final String badImagePath;
  final String goodDescription;
  final String badDescription;

  const PhotoExampleWidget({
    super.key,
    required this.title,
    required this.goodImagePath,
    required this.badImagePath,
    required this.goodDescription,
    required this.badDescription,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(
        bottom: ResponsiveHelper.height(context, mobile: 20, tablet: 24),
      ),
      padding: EdgeInsets.all(
        ResponsiveHelper.width(context, mobile: 16, tablet: 20),
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 18, tablet: 20),
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A1A),
            ),
          ),
          SizedBox(height: ResponsiveHelper.height(context, mobile: 16, tablet: 20)),
          Row(
            children: [
              // Good Example
              Expanded(
                child: Column(
                  children: [
                    Container(
                      height: ResponsiveHelper.height(context, mobile: 120, tablet: 144),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green, width: 2),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.check_circle,
                              color: Colors.green,
                              size: ResponsiveHelper.width(context, mobile: 32, tablet: 36),
                            ),
                            SizedBox(height: ResponsiveHelper.height(context, mobile: 8, tablet: 10)),
                            Text(
                              'BAIK',
                              style: TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.bold,
                                fontSize: ResponsiveHelper.font(context, mobile: 14, tablet: 16),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(height: ResponsiveHelper.height(context, mobile: 8, tablet: 10)),
                    Text(
                      goodDescription,
                      style: TextStyle(
                        fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14),
                        color: Color(0xFF666666),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              SizedBox(width: ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
              // Bad Example
              Expanded(
                child: Column(
                  children: [
                    Container(
                      height: ResponsiveHelper.height(context, mobile: 120, tablet: 144),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red, width: 2),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.cancel,
                              color: Colors.red,
                              size: ResponsiveHelper.width(context, mobile: 32, tablet: 36),
                            ),
                            SizedBox(height: ResponsiveHelper.height(context, mobile: 8, tablet: 10)),
                            Text(
                              'BURUK',
                              style: TextStyle(
                                color: Colors.red,
                                fontWeight: FontWeight.bold,
                                fontSize: ResponsiveHelper.font(context, mobile: 14, tablet: 16),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(height: ResponsiveHelper.height(context, mobile: 8, tablet: 10)),
                    Text(
                      badDescription,
                      style: TextStyle(
                        fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14),
                        color: Color(0xFF666666),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}