// مسیر فایل: lib/core/utils/app_formatters.dart
import 'package:persian_datetime_picker/persian_datetime_picker.dart';

class AppFormatters {
  /// تبدیل ریال دریافتی از دیتابیس به تومان (حذف اعشار و اضافه کردن کاما)
  static String rialToToman(dynamic amountInRial) {
    if (amountInRial == null) return "0";

    // تبدیل امن مقدار ورودی به double
    double val = double.tryParse(amountInRial.toString()) ?? 0.0;

    // تبدیل ریال به تومان و حذف بخش اعشاری با تبدیل به int
    int tomanValue = (val / 10).toInt();

    // اعمال فرمت سه‌رقم سه‌رقم
    return tomanValue.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
            (Match m) => '${m[1]},'
    );
  }

  /// تبدیل انواع فرمت‌های تاریخ میلادی (ISO 8601 و غیره) به شمسی استاندارد (YYYY/MM/DD)
  static String toShamsi(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'نامشخص';
    try {
      // اگر از قبل شمسی بود، فقط خط‌تیره‌ها را به اسلش تبدیل کن
      if (dateStr.startsWith('13') || dateStr.startsWith('14')) {
        return dateStr.replaceAll('-', '/');
      }

      final DateTime dt = DateTime.parse(dateStr);
      final Jalali jalali = Jalali.fromDateTime(dt);

      return '${jalali.year}/${jalali.month.toString().padLeft(2, '0')}/${jalali.day.toString().padLeft(2, '0')}';
    } catch (e) {
      // در صورت خطا، حداقل بخش تاریخ را برگردان
      return dateStr.split('T')[0].replaceAll('-', '/');
    }
  }

  /// ترجمه دوره‌های زمانی پرداخت برای نمایش به کاربر
  static String translatePaymentFrequency(String? frequency) {
    switch (frequency) {
      case 'MONTHLY':
        return 'پرداخت ماهانه';
      case 'QUARTERLY':
        return 'پرداخت سه‌ماهه (فصلی)';
      case 'FLEXIBLE':
        return 'زمان پرداخت منعطف';
      default:
        return 'نامشخص';
    }
  }
}