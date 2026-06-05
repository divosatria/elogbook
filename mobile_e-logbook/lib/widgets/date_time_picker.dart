import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';

class DateTimePickerField extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  final bool isRequired;
  final String? hintText;

  const DateTimePickerField({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
    this.isRequired = false,
    this.hintText,
  });

  @override
  Widget build(BuildContext context) {
    final isTablet = ResponsiveHelper.isTablet(context);
    final isEmpty = value.isEmpty || value == 'Pilih tanggal' || value == 'Pilih waktu';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label with icon
        Row(
          children: [
            Container(
              padding: EdgeInsets.all(isTablet ? 8 : 6),
              decoration: BoxDecoration(
                color: const Color(0xFF1B4F9C).withOpacity(0.1),
                borderRadius: BorderRadius.circular(isTablet ? 8 : 6),
              ),
              child: Icon(
                icon,
                color: const Color(0xFF1B4F9C),
                size: isTablet ? 20 : 18,
              ),
            ),
            SizedBox(width: isTablet ? 12 : 10),
            Text(
              label,
              style: TextStyle(
                fontSize: isTablet ? 16 : 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            if (isRequired) ...[
              SizedBox(width: isTablet ? 6 : 4),
              Text(
                '*',
                style: TextStyle(
                  fontSize: isTablet ? 16 : 14,
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ],
        ),
        
        SizedBox(height: isTablet ? 12 : 10),
        
        // Input field
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: isTablet ? 16 : 14,
              vertical: isTablet ? 16 : 14,
            ),
            decoration: BoxDecoration(
              border: Border.all(
                color: isEmpty ? Colors.grey.shade300 : const Color(0xFF1B4F9C).withOpacity(0.3),
                width: isEmpty ? 1 : 1.5,
              ),
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              color: isEmpty ? Colors.grey.shade50 : const Color(0xFF1B4F9C).withOpacity(0.05),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    isEmpty ? (hintText ?? 'Pilih $label') : value,
                    style: TextStyle(
                      fontSize: isTablet ? 16 : 14,
                      color: isEmpty ? Colors.grey.shade600 : Colors.black87,
                      fontWeight: isEmpty ? FontWeight.normal : FontWeight.w500,
                    ),
                  ),
                ),
                Container(
                  padding: EdgeInsets.all(isTablet ? 8 : 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1B4F9C).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(isTablet ? 8 : 6),
                  ),
                  child: Icon(
                    Icons.keyboard_arrow_down,
                    color: const Color(0xFF1B4F9C),
                    size: isTablet ? 20 : 18,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class CustomDatePicker {
  static Future<DateTime?> show({
    required BuildContext context,
    DateTime? initialDate,
    DateTime? firstDate,
    DateTime? lastDate,
    String title = 'Pilih Tanggal',
  }) async {
    final isTablet = ResponsiveHelper.isTablet(context);
    
    return showDialog<DateTime>(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(isTablet ? 20 : 16),
        ),
        child: Container(
          width: isTablet ? 400 : double.infinity,
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.7,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: EdgeInsets.all(isTablet ? 24 : 20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(isTablet ? 20 : 16),
                    topRight: Radius.circular(isTablet ? 20 : 16),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(isTablet ? 12 : 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                      ),
                      child: Icon(
                        Icons.calendar_today,
                        color: Colors.white,
                        size: isTablet ? 24 : 20,
                      ),
                    ),
                    SizedBox(width: isTablet ? 16 : 12),
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: isTablet ? 20 : 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Calendar
              Flexible(
                child: Container(
                  padding: EdgeInsets.all(isTablet ? 20 : 16),
                  child: Theme(
                    data: Theme.of(context).copyWith(
                      colorScheme: Theme.of(context).colorScheme.copyWith(
                        primary: const Color(0xFF1B4F9C),
                        onPrimary: Colors.white,
                        surface: Colors.white,
                        onSurface: Colors.black87,
                      ),
                    ),
                    child: CalendarDatePicker(
                      initialDate: initialDate ?? DateTime.now(),
                      firstDate: firstDate ?? DateTime(1900),
                      lastDate: lastDate ?? DateTime(2100),
                      onDateChanged: (date) => Navigator.pop(context, date),
                    ),
                  ),
                ),
              ),
              
              // Actions
              Container(
                padding: EdgeInsets.all(isTablet ? 20 : 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(isTablet ? 20 : 16),
                    bottomRight: Radius.circular(isTablet ? 20 : 16),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.symmetric(
                        vertical: isTablet ? 14 : 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(isTablet ? 10 : 8),
                      ),
                      side: const BorderSide(color: Colors.grey),
                    ),
                    child: Text(
                      'Batal',
                      style: TextStyle(
                        fontSize: isTablet ? 16 : 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CustomTimePicker {
  static Future<TimeOfDay?> show({
    required BuildContext context,
    TimeOfDay? initialTime,
    String title = 'Pilih Waktu',
  }) async {
    final isTablet = ResponsiveHelper.isTablet(context);
    
    return showDialog<TimeOfDay>(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(isTablet ? 20 : 16),
        ),
        child: Container(
          width: isTablet ? 400 : double.infinity,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: EdgeInsets.all(isTablet ? 24 : 20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(isTablet ? 20 : 16),
                    topRight: Radius.circular(isTablet ? 20 : 16),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(isTablet ? 12 : 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                      ),
                      child: Icon(
                        Icons.access_time,
                        color: Colors.white,
                        size: isTablet ? 24 : 20,
                      ),
                    ),
                    SizedBox(width: isTablet ? 16 : 12),
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: isTablet ? 20 : 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Time Picker
              Container(
                padding: EdgeInsets.all(isTablet ? 20 : 16),
                child: Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: Theme.of(context).colorScheme.copyWith(
                      primary: const Color(0xFF1B4F9C),
                      onPrimary: Colors.white,
                      surface: Colors.white,
                      onSurface: Colors.black87,
                    ),
                  ),
                  child: TimePickerDialog(
                    initialTime: initialTime ?? TimeOfDay.now(),
                  ),
                ),
              ),
              
              // Actions
              Container(
                padding: EdgeInsets.all(isTablet ? 20 : 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(isTablet ? 20 : 16),
                    bottomRight: Radius.circular(isTablet ? 20 : 16),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.symmetric(
                        vertical: isTablet ? 14 : 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(isTablet ? 10 : 8),
                      ),
                      side: const BorderSide(color: Colors.grey),
                    ),
                    child: Text(
                      'Batal',
                      style: TextStyle(
                        fontSize: isTablet ? 16 : 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}