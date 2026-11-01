import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';

// کلاس فرمت‌کننده برای جدا کردن اعداد به صورت 3 رقم 3 رقم (کاما)
class CurrencyInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    if (newValue.text.isEmpty) return newValue;
    String numericOnly = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (numericOnly.isEmpty) return newValue;

    String formatted = '';
    int count = 0;
    for (int i = numericOnly.length - 1; i >= 0; i--) {
      if (count != 0 && count % 3 == 0) formatted = ',' + formatted;
      formatted = numericOnly[i] + formatted;
      count++;
    }
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class CustomTextField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final IconData? icon;
  final bool isNumber;
  final bool isCurrency;
  final bool readOnly;
  final bool isRequired;
  final VoidCallback? onTap;
  final Widget? suffixIcon;
  final String? Function(String?)? validator;

  const CustomTextField({
    super.key,
    required this.controller,
    required this.hint,
    this.icon,
    this.isNumber = false,
    this.isCurrency = false,
    this.readOnly = false,
    this.isRequired = false, // اگر true باشد، فیلد الزامی می‌شود
    this.onTap,
    this.suffixIcon,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        readOnly: readOnly,
        onTap: onTap,
        keyboardType: isNumber || isCurrency ? TextInputType.number : TextInputType.text,
        inputFormatters: isCurrency ? [CurrencyInputFormatter()] : [],
        style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14),
        // اعتبارسنجی خودکار فرم
        validator: validator ?? (value) {
          if (isRequired && (value == null || value.trim().isEmpty)) {
            return 'این فیلد الزامی است';
          }
          return null;
        },
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey),
          filled: true,
          fillColor: Colors.grey.shade100,
          prefixIcon: icon != null ? Icon(icon, color: Colors.grey, size: 20) : null,
          suffixIcon: suffixIcon,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),

          // استایل‌های مربوط به حالت خطا (ارور قرمز)
          errorStyle: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.red),
          focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.red, width: 1.5)),
          errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.red, width: 1)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primaryGreen, width: 1.5)),
        ),
      ),
    );
  }
}