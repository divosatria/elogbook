import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import '../../../routes/nahkoda_routes.dart';
import 'floating_action_button_widget.dart';

class NahkodaMenuItems extends StatelessWidget {
  final Animation<double> animation;
  final VoidCallback onMenuToggle;

  const NahkodaMenuItems({
    super.key,
    required this.animation,
    required this.onMenuToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Customer Service (WhatsApp) - paling bawah
        Positioned(
          right: ResponsiveHelper.width(context, mobile: 28, tablet: 32),
          bottom: ResponsiveHelper.height(context, mobile: 150, tablet: 190),
          child: ScaleTransition(
            scale: animation,
            child: FloatingActionButtonWidget(
              icon: Icons.support_agent,
              color: Colors.orange,
              onTap: () {
                onMenuToggle();
                NahkodaRoutes.navigateToCustomerService(context);
              },
            ),
          ),
        ),
        // Info Trip
        Positioned(
          right: ResponsiveHelper.width(context, mobile: 28, tablet: 32),
          bottom: ResponsiveHelper.height(context, mobile: 220, tablet: 290),
          child: ScaleTransition(
            scale: animation,
            child: FloatingActionButtonWidget(
              icon: Icons.sailing,
              color: Colors.blue,
              onTap: () {
                onMenuToggle();
                NahkodaRoutes.navigateToTripInfo(context);
              },
            ),
          ),
        ),
        // Jadwal Tugas
        Positioned(
          right: ResponsiveHelper.width(context, mobile: 28, tablet: 32),
          bottom: ResponsiveHelper.height(context, mobile: 290, tablet: 390),
          child: ScaleTransition(
            scale: animation,
            child: FloatingActionButtonWidget(
              icon: Icons.calendar_today,
              color: Colors.purple,
              onTap: () {
                onMenuToggle();
                NahkodaRoutes.navigateToMySchedules(context);
              },
            ),
          ),
        ),
      ],
    );
  }
}