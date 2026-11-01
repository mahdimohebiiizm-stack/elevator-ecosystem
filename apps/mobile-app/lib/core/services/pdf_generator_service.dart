import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class PdfGeneratorService {

  // ========================================================
  // ۱. متد تولید فاکتور / قرارداد
  // ========================================================
  static Future<void> generateContractPdf({
    required String contractNumber,
    required String employerName,
    required String buildingName,
    required String startDate,
    required String endDate,
    required String totalAmount,
    required String paymentFrequency,
  }) async {
    final pdf = pw.Document();

    final fontData = await rootBundle.load("assets/fonts/Vazirmatn-Regular.ttf");
    final ttf = pw.Font.ttf(fontData);

    final boldFontData = await rootBundle.load("assets/fonts/Vazirmatn-Bold.ttf");
    final ttfBold = pw.Font.ttf(boldFontData);

    final ByteData imageByteData = await rootBundle.load('assets/images/logo.png');
    final Uint8List imageUint8List = imageByteData.buffer.asUint8List();
    final logoImage = pw.MemoryImage(imageUint8List);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        theme: pw.ThemeData.withFont(base: ttf, bold: ttfBold),
        textDirection: pw.TextDirection.rtl,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              _buildHeader(logoImage, ttf, ttfBold),
              pw.SizedBox(height: 30),
              pw.Center(child: pw.Text('قرارداد سرویس و نگهداری', style: pw.TextStyle(font: ttfBold, fontSize: 20))),
              pw.SizedBox(height: 20),
              pw.Container(
                padding: const pw.EdgeInsets.all(15),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey100,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(10)),
                  border: pw.Border.all(color: PdfColors.grey300),
                ),
                child: pw.Column(
                  children: [
                    _buildInfoRow('شماره قرارداد:', contractNumber, ttfBold, ttf),
                    pw.Divider(color: PdfColors.grey300),
                    _buildInfoRow('نام کارفرما:', employerName, ttfBold, ttf),
                    pw.Divider(color: PdfColors.grey300),
                    _buildInfoRow('نام ساختمان / پروژه:', buildingName, ttfBold, ttf),
                    pw.Divider(color: PdfColors.grey300),
                    _buildInfoRow('تاریخ شروع:', startDate, ttfBold, ttf),
                    pw.Divider(color: PdfColors.grey300),
                    _buildInfoRow('تاریخ پایان:', endDate, ttfBold, ttf),
                  ],
                ),
              ),
              pw.SizedBox(height: 30),
              pw.Text('اطلاعات مالی و پرداخت:', style: pw.TextStyle(font: ttfBold, fontSize: 16)),
              pw.SizedBox(height: 10),
              pw.Container(
                padding: const pw.EdgeInsets.all(15),
                decoration: pw.BoxDecoration(
                  color: PdfColors.blue50,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(10)),
                  border: pw.Border.all(color: PdfColors.blue200),
                ),
                child: pw.Column(
                  children: [
                    _buildInfoRow('مبلغ کل قرارداد:', '$totalAmount تومان', ttfBold, ttf),
                    pw.Divider(color: PdfColors.blue200),
                    _buildInfoRow('دوره پرداخت:', paymentFrequency, ttfBold, ttf),
                  ],
                ),
              ),
              pw.Spacer(),
              _buildSignatures(ttf, ttfBold),
              pw.SizedBox(height: 40),
              _buildFooter(ttf),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Contract_$contractNumber.pdf',
    );
  }

  // ========================================================
  // ۲. متد جدید: تولید گزارش کار تکنسین (سرویس و قطعات)
  // ========================================================
  static Future<void> generateServiceReportPdf({
    required String buildingName,
    required String techName,
    required String visitDate,
    required bool isEmergency,
    required List<dynamic> partsUsed,
    required Map<String, dynamic>? checklist,
    required String? description,
  }) async {
    final pdf = pw.Document();

    final fontData = await rootBundle.load("assets/fonts/Vazirmatn-Regular.ttf");
    final ttf = pw.Font.ttf(fontData);

    final boldFontData = await rootBundle.load("assets/fonts/Vazirmatn-Bold.ttf");
    final ttfBold = pw.Font.ttf(boldFontData);

    final ByteData imageByteData = await rootBundle.load('assets/images/logo.png');
    final Uint8List imageUint8List = imageByteData.buffer.asUint8List();
    final logoImage = pw.MemoryImage(imageUint8List);

    // استخراج آیتم‌های خراب از چک‌لیست
    List<MapEntry<String, dynamic>> defectiveItems = [];
    if (checklist != null) {
      defectiveItems = checklist.entries.where((e) => e.value == 'NEEDS_REPAIR' || e.value == 'DEFECTIVE').toList();
    }

    pdf.addPage(
      pw.MultiPage( // پشتیبانی از چند صفحه در صورت طولانی شدن لیست
        pageFormat: PdfPageFormat.a4,
        theme: pw.ThemeData.withFont(base: ttf, bold: ttfBold),
        textDirection: pw.TextDirection.rtl,
        build: (pw.Context context) {
          return [
            _buildHeader(logoImage, ttf, ttfBold),
            pw.SizedBox(height: 20),
            pw.Center(child: pw.Text('گزارش رسمی بازدید و سرویس آسانسور', style: pw.TextStyle(font: ttfBold, fontSize: 18))),
            pw.SizedBox(height: 20),

            // اطلاعات پایه
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: pw.BoxDecoration(
                color: isEmergency ? PdfColors.red50 : PdfColors.blue50,
                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                border: pw.Border.all(color: isEmergency ? PdfColors.red200 : PdfColors.blue200),
              ),
              child: pw.Column(
                children: [
                  _buildInfoRow('ساختمان / پروژه:', buildingName, ttfBold, ttf),
                  pw.Divider(color: PdfColors.grey300),
                  _buildInfoRow('تکنسین مسئول:', techName, ttfBold, ttf),
                  pw.Divider(color: PdfColors.grey300),
                  _buildInfoRow('تاریخ و زمان بازدید:', visitDate, ttfBold, ttf),
                  pw.Divider(color: PdfColors.grey300),
                  _buildInfoRow('نوع بازدید:', isEmergency ? 'خرابی و مراجعه اضطراری (BM)' : 'سرویس دوره‌ای نگهداری (PM)', ttfBold, ttf),
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            // جدول قطعات مصرفی
            pw.Text('قطعات مصرفی / تعویضی:', style: pw.TextStyle(font: ttfBold, fontSize: 14)),
            pw.SizedBox(height: 8),
            if (partsUsed.isEmpty)
              pw.Text('هیچ قطعه‌ای در این بازدید تعویض یا مصرف نشده است.', style: pw.TextStyle(font: ttf, fontSize: 12, color: PdfColors.grey700))
            else
              pw.TableHelper.fromTextArray(
                context: context,
                cellAlignment: pw.Alignment.centerRight,
                headerDecoration: const pw.BoxDecoration(color: PdfColors.grey200),
                headerStyle: pw.TextStyle(font: ttfBold, fontSize: 12),
                cellStyle: pw.TextStyle(font: ttf, fontSize: 12),
                data: <List<String>>[
                  ['ردیف', 'نام قطعه', 'اقدام', 'تعداد'],
                  ...List.generate(partsUsed.length, (index) {
                    final part = partsUsed[index];
                    String action = 'مصرف شده';
                    if (part['action_type'] == 'REPLACED') action = 'تعویض شده';
                    if (part['action_type'] == 'REQUESTED') action = 'درخواست خرید';
                    return [(index + 1).toString(), part['part_name'], action, part['quantity'].toString()];
                  }),
                ],
              ),

            pw.SizedBox(height: 20),

            // لیست خرابی‌ها یا نیاز به تعمیر
            pw.Text('موارد نیازمند توجه (خرابی یا تعمیر):', style: pw.TextStyle(font: ttfBold, fontSize: 14)),
            pw.SizedBox(height: 8),
            if (defectiveItems.isEmpty)
              pw.Text('تمامی موارد بررسی شده در وضعیت سالم قرار دارند.', style: pw.TextStyle(font: ttf, fontSize: 12, color: PdfColors.green700))
            else
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: defectiveItems.map((e) {
                  final status = e.value == 'DEFECTIVE' ? 'معیوب' : 'نیاز به تعمیر';
                  final name = e.key.replaceAll('item_', '').replaceAll('_', ' '); // کلید خام
                  return pw.Padding(
                    padding: const pw.EdgeInsets.only(bottom: 4),
                    child: pw.Text('- $name : $status', style: pw.TextStyle(font: ttf, fontSize: 12, color: PdfColors.red800)),
                  );
                }).toList(),
              ),

            // توضیحات تکمیلی
            if (description != null && description.isNotEmpty) ...[
              pw.SizedBox(height: 20),
              pw.Text('توضیحات تکمیلی تکنسین:', style: pw.TextStyle(font: ttfBold, fontSize: 14)),
              pw.SizedBox(height: 4),
              pw.Text(description, style: pw.TextStyle(font: ttf, fontSize: 12)),
            ],

            pw.SizedBox(height: 40),
            _buildSignatures(ttf, ttfBold),
            pw.SizedBox(height: 30),
            _buildFooter(ttf),
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'ServiceReport_${DateTime.now().millisecondsSinceEpoch}.pdf',
    );
  }

  // ========================================================
  // ویجت‌های مشترک برای طراحی (Components)
  // ========================================================
  static pw.Widget _buildHeader(pw.MemoryImage logo, pw.Font ttf, pw.Font ttfBold) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(10),
      decoration: const pw.BoxDecoration(
        border: pw.Border(bottom: pw.BorderSide(color: PdfColors.blue900, width: 2)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Image(logo, width: 60, height: 60),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              pw.Text('آسانرو اطمینان امیر کرمان', style: pw.TextStyle(font: ttfBold, fontSize: 20, color: PdfColors.blue900)),
              pw.Text('خدمات نصب، سرویس و نگهداری آسانسور', style: pw.TextStyle(font: ttf, fontSize: 11, color: PdfColors.grey700)),
            ],
          ),
        ],
      ),
    );
  }

  static pw.Widget _buildInfoRow(String title, String value, pw.Font fontBold, pw.Font fontRegular) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(title, style: pw.TextStyle(font: fontRegular, fontSize: 13, color: PdfColors.grey800)),
          pw.Text(value, style: pw.TextStyle(font: fontBold, fontSize: 13, color: PdfColors.black)),
        ],
      ),
    );
  }

  static pw.Widget _buildSignatures(pw.Font ttf, pw.Font ttfBold) {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.center,
          children: [
            pw.Text('امضا و تایید تکنسین', style: pw.TextStyle(font: ttfBold, fontSize: 12)),
            pw.SizedBox(height: 30),
            pw.Text('.............................', style: pw.TextStyle(font: ttf, fontSize: 12)),
          ],
        ),
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.center,
          children: [
            pw.Text('امضا و تایید کارفرما / مدیر ساختمان', style: pw.TextStyle(font: ttfBold, fontSize: 12)),
            pw.SizedBox(height: 30),
            pw.Text('.............................', style: pw.TextStyle(font: ttf, fontSize: 12)),
          ],
        ),
      ],
    );
  }

  static pw.Widget _buildFooter(pw.Font ttf) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.symmetric(vertical: 10),
      decoration: const pw.BoxDecoration(
        border: pw.Border(top: pw.BorderSide(color: PdfColors.grey300)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.center,
        children: [
          pw.Text('تلفن پشتیبانی: ۰۹۱۳۳۹۸۲۶۹۵', style: pw.TextStyle(font: ttf, fontSize: 10, color: PdfColors.grey700)),
          pw.SizedBox(width: 20),
          pw.Text('ایمیل: etminannamirrelee@gmail.com', style: pw.TextStyle(font: ttf, fontSize: 10, color: PdfColors.grey700)),
        ],
      ),
    );
  }
}