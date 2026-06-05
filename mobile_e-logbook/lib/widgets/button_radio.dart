import 'package:flutter/material.dart';

enum ButtonRadio { email, phone }

class ButtonRadioController extends ValueNotifier<ButtonRadio> {
  ButtonRadioController([ButtonRadio value = ButtonRadio.email]) : super(value);
}

class ButtonRadioSelector extends StatelessWidget {
  final ButtonRadioController controller;

  const ButtonRadioSelector({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ButtonRadio>(
      valueListenable: controller,
      builder: (context, value, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            GestureDetector(
              onTap: () => controller.value = ButtonRadio.email,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Radio<ButtonRadio>(
                    value: ButtonRadio.email,
                    groupValue: value,
                    activeColor: const Color(0xFF1B4F9C),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                    onChanged: (val) => controller.value = val!,
                  ),
                  const Text('Email', style: TextStyle(fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => controller.value = ButtonRadio.phone,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Radio<ButtonRadio>(
                    value: ButtonRadio.phone,
                    groupValue: value,
                    activeColor: const Color(0xFF1B4F9C),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                    onChanged: (val) => controller.value = val!,
                  ),
                  const Text('Phone', style: TextStyle(fontSize: 12)),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}