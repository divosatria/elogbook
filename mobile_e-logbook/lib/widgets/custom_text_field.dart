import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';

class CustomTextField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final String hint;
  final TextInputType? keyboardType;
  final int maxLines;
  final bool required;
  final bool readOnly;
  final bool obscureText;
  final Function(String)? onChanged;
  final Widget? suffixWidget;
  final String? Function(String?)? validator;
  final VoidCallback? onTap;

  const CustomTextField({
    super.key,
    required this.controller,
    required this.label,
    required this.icon,
    required this.hint,
    this.keyboardType,
    this.maxLines = 1,
    this.required = true,
    this.readOnly = false,
    this.obscureText = false,
    this.onChanged,
    this.suffixWidget,
    this.validator,
    this.onTap,
  });

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField> {
  bool _isFocused = false;
  bool _hasError = false;
  String? _errorText;

  @override
  Widget build(BuildContext context) {
    final isTablet = ResponsiveHelper.isTablet(context);
    final hasValue = widget.controller.text.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label with icon
        Row(
          children: [
            Container(
              padding: EdgeInsets.all(isTablet ? 8 : 6),
              decoration: BoxDecoration(
                color: _hasError
                    ? Colors.red.withOpacity(0.1)
                    : _isFocused
                        ? const Color(0xFF1B4F9C).withOpacity(0.1)
                        : Colors.grey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(isTablet ? 8 : 6),
              ),
              child: Icon(
                widget.icon,
                color: _hasError
                    ? Colors.red
                    : _isFocused
                        ? const Color(0xFF1B4F9C)
                        : Colors.grey.shade600,
                size: isTablet ? 20 : 18,
              ),
            ),
            SizedBox(width: isTablet ? 12 : 10),
            Text(
              widget.label,
              style: TextStyle(
                fontSize: isTablet ? 16 : 14,
                fontWeight: FontWeight.w600,
                color: _hasError
                    ? Colors.red
                    : _isFocused
                        ? const Color(0xFF1B4F9C)
                        : Colors.black87,
              ),
            ),
            if (widget.required) ...[
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
        
        // Text Field
        Focus(
          onFocusChange: (hasFocus) {
            setState(() {
              _isFocused = hasFocus;
            });
          },
          child: TextFormField(
            controller: widget.controller,
            keyboardType: widget.keyboardType,
            maxLines: widget.maxLines,
            readOnly: widget.readOnly,
            obscureText: widget.obscureText,
            onChanged: (value) {
              if (_hasError && value.isNotEmpty) {
                setState(() {
                  _hasError = false;
                  _errorText = null;
                });
              }
              widget.onChanged?.call(value);
            },
            onTap: widget.onTap,
            style: TextStyle(
              fontSize: isTablet ? 16 : 14,
              color: Colors.black87,
              fontWeight: hasValue ? FontWeight.w500 : FontWeight.normal,
            ),
            decoration: InputDecoration(
              hintText: widget.hint,
              hintStyle: TextStyle(
                fontSize: isTablet ? 16 : 14,
                color: Colors.grey.shade600,
              ),
              suffixIcon: widget.suffixWidget,
              filled: true,
              fillColor: _hasError
                  ? Colors.red.withOpacity(0.05)
                  : _isFocused
                      ? const Color(0xFF1B4F9C).withOpacity(0.05)
                      : Colors.grey.shade50,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                borderSide: BorderSide(
                  color: _hasError
                      ? Colors.red.withOpacity(0.3)
                      : hasValue
                          ? const Color(0xFF1B4F9C).withOpacity(0.3)
                          : Colors.grey.shade300,
                  width: hasValue ? 1.5 : 1,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                borderSide: BorderSide(
                  color: _hasError ? Colors.red : const Color(0xFF1B4F9C),
                  width: 2,
                ),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                borderSide: const BorderSide(
                  color: Colors.red,
                  width: 2,
                ),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                borderSide: const BorderSide(
                  color: Colors.red,
                  width: 2,
                ),
              ),
              contentPadding: EdgeInsets.symmetric(
                horizontal: isTablet ? 16 : 14,
                vertical: isTablet ? 16 : 14,
              ),
              errorStyle: const TextStyle(height: 0),
            ),
            validator: (value) {
              String? error;
              if (widget.validator != null) {
                error = widget.validator!(value);
              } else if (widget.required && (value == null || value.isEmpty)) {
                error = '${widget.label} harus diisi';
              }
              
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) {
                  setState(() {
                    _hasError = error != null;
                    _errorText = error;
                  });
                }
              });
              
              return error;
            },
          ),
        ),
        
        // Error message
        if (_hasError && _errorText != null) ...[
          SizedBox(height: isTablet ? 8 : 6),
          Row(
            children: [
              Icon(
                Icons.error_outline,
                color: Colors.red,
                size: isTablet ? 16 : 14,
              ),
              SizedBox(width: isTablet ? 8 : 6),
              Expanded(
                child: Text(
                  _errorText!,
                  style: TextStyle(
                    fontSize: isTablet ? 14 : 12,
                    color: Colors.red,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}