import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme/app_colors.dart';
import '../../core/services/pdf_generator_service.dart';

class ReportDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> reportData;
  final String buildingName;
  final String techName;
  final String shamsiDate;

  const ReportDetailsScreen({
    Key? key,
    required this.reportData,
    required this.buildingName,
    required this.techName,
    required this.shamsiDate,
  }) : super(key: key);

  // ========================================================
  // دیکشنری‌های ترجمه حرفه‌ای برای نمایش دیتای تمیز به کاربر
  // ========================================================
  String _translateStatus(String? status) {
    switch (status) {
      case 'OK': return 'سالم / تایید شد';
      case 'NEEDS_REPAIR': return 'نیاز به تعمیر';
      case 'DEFECTIVE': return 'معیوب / خطرناک';
      default: return 'بررسی نشده';
    }
  }

  String _translatePartAction(String? action) {
    switch (action) {
      case 'CONSUMED': return 'مصرف شده';
      case 'REPLACED': return 'تعویض شده';
      case 'REQUESTED': return 'درخواست خرید';
      default: return 'اقدام نامشخص';
    }
  }

  String _translateChecklistKey(String key) {
    const Map<String, String> keys = {
      'item_01_cabin_light': 'روشنایی کابین',
      'item_02_sill_cleanliness': 'تمیزی پاخور کابین و طبقات',
      'item_03_indicators_fan': 'نمراتور، اعلام طبقات، فن و آژیر',
      'item_04_cabin_vibration': 'لرزش و صدای حرکت کابین',
      'item_05_door_shoes': 'عملکرد لته‌های درب و کفشک درب',
      'item_06_floor_call': 'عملکرد احضار طبقات',
      'item_07_leveling': 'توقف لول طبقات',
      'item_08_safety_circuit': 'تست مدار سری ایمنی کنتاکت‌ها و قفل‌ها',
      'item_09_door_dictator': 'تست عملکرد دیکتاتور و خودبسته شدن',
      'item_10_inspection_movement': 'عملکرد قارچی، رویزیون و حرکت بالا/پایین',
      'item_11_roof_cleanliness': 'تمیزی سقف کابین',
      'item_12_wiring_tidiness': 'مرتب بودن سیم‌های رویزیون و قفل‌ها',
      'item_13_oilers': 'پر بودن روغندان کابین و وزنه',
      'item_14_ropes_attachments': 'درمهره، اشپیل و کرپی سربکسل',
      'item_15_shoes_tightening': 'آچارکشی لرزه‌گیرها و کفشک‌ها',
      'item_16_brackets_tightening': 'آچارکشی پشت‌بندها و براکت‌ها',
      'item_17_sensors_magnets': 'تمیزی سنسور و آهنرباهای دورانداز',
      'item_18_microswitches_parachute': 'تست میکروسوئیچ‌های پاراشوت و حد',
      'item_19_contactors_relays': 'عملکرد کنتاکتورها و رله‌های تابلو',
      'item_20_emergency_rescue': 'تست نجات اضطراری',
      'item_21_motor_brake': 'عملکرد دسته و فک ترمز موتور',
      'item_22_motor_grooves': 'بازدید شیار موتور و قطر سیم‌بکسل',
      'item_23_governor': 'تست گاورنر و میکروسوئیچ گاورنر',
      'item_24_motor_oil': 'چک کردن روغن موتور',
      'item_25_engine_room_ventilation': 'روشنایی و تهویه موتورخانه',
    };
    return keys[key] ?? key.replaceAll('item_', '').replaceAll('_', ' ');
  }

  String _translateBM(String? value) {
    if (value == null) return 'ثبت نشده';
    const Map<String, String> map = {
      // دلایل اعزام
      'MANAGER_DISPATCH': 'اعزام توسط شرکت/مدیر',
      'EMPLOYER_CALL': 'تماس و اعلام خرابی کارفرما',
      'COMPLEMENTARY': 'تکمیل کار ناقص قبلی',
      'QC_REPORT': 'گزارش کنترل کیفیت (QC)',
      // وضعیت رسیدن
      'RUNNING_NORMAL': 'درحال کار (عادی)',
      'RUNNING_ABNORMAL': 'درحال کار (غیرعادی/صدادار)',
      'STOPPED_BY_KEY': 'خاموش شده توسط کلید',
      'NOISE_IN_MOTION': 'لرزش و صدای شدید در حرکت',
      'STOPPED_DOOR_OPEN': 'توقف با درب باز',
      'STOPPED_DOOR_CLOSED': 'توقف با درب بسته',
      'STOPPED_BETWEEN_FLOORS': 'توقف و محبوسی بین طبقات',
      // علت خرابی
      'END_OF_LIFE': 'پایان عمر مفید قطعه',
      'ELECTRICAL_FAULT': 'نقص الکتریکی / نوسان برق',
      'MECHANICAL_FAULT': 'نقص مکانیکی / استهلاک',
      'IMPROPER_USE': 'استفاده نادرست / اضافه‌بار',
      'VANDALISM': 'خرابکاری / ضربه عمدی',
      'EXTERNAL_FAULT': 'عوامل بیرونی (آب‌گرفتگی، نوسان شبکه)',
      'UNKNOWN': 'علت نامشخص',
      'NO_FAULT': 'بدون خرابی (خطای دید کاربر)',
      // اقدام
      'CLEANING': 'نظافت و سرویس',
      'TESTING': 'تست و بررسی',
      'REPLACEMENT': 'تعویض قطعه معیوب',
      'REPAIR': 'تعمیر قطعه معیوب',
      'TROUBLESHOOTING': 'عیب‌یابی',
      'ADJUSTMENT': 'تنظیم و ریگلاژ',
      'RESTART': 'ریست و راه‌اندازی مجدد',
      'CUSTOMER_SUPPORT': 'آموزش و پشتیبانی کارفرما',
      'OTHER': 'سایر اقدامات',
      // وضعیت نهایی
      'RUNNING_OK': 'روشن، ایمن و درحال کار',
      'RUNNING_NEEDS_ACTION': 'درحال کار اما نیازمند اقدام بعدی',
      'STOPPED_NEEDS_ACTION': 'خاموش و نیازمند تعمیرات اساسی',
    };
    return map[value] ?? value;
  }

  @override
  Widget build(BuildContext context) {
    final bool isEmergency = reportData['is_emergency'] ?? false;
    final double? lat = reportData['tech_lat'];
    final double? lng = reportData['tech_lng'];
    final bool hasLocation = lat != null && lng != null && lat != 0.0 && lng != 0.0;

    final Map<String, dynamic>? checklist = reportData['checklist'];
    final List<dynamic> partsUsed = reportData['parts_used'] ?? [];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundWhite,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: AppColors.textBlack, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text("جزئیات گزارش سرویس", style: TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontWeight: FontWeight.bold, fontSize: 18)),
          centerTitle: true,
          actions: [
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: IconButton(
                icon: const Icon(Icons.print_rounded, color: Colors.blue, size: 22),
                tooltip: 'دریافت خروجی PDF',
                onPressed: () {
                  PdfGeneratorService.generateServiceReportPdf(
                    buildingName: buildingName,
                    techName: techName,
                    visitDate: shamsiDate,
                    isEmergency: isEmergency,
                    partsUsed: partsUsed,
                    checklist: checklist,
                    description: reportData['description'],
                  );
                },
              ),
            ),
          ],
        ),
        body: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ---------------------------------------------------
              // بخش نقشه هوشمند (GPS Tracking)
              // ---------------------------------------------------
              if (hasLocation)
                Container(
                  height: 240,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8, offset: const Offset(0, 4))],
                  ),
                  child: FlutterMap(
                    options: MapOptions(
                      initialCenter: LatLng(lat, lng),
                      initialZoom: 16.0,
                      interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.elevator.app', // نام پکیج اپلیکیشن شما
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: LatLng(lat, lng),
                            width: 80,
                            height: 80,
                            child: Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: isEmergency ? Colors.red : AppColors.primaryGreen,
                                    shape: BoxShape.circle,
                                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 6, offset: const Offset(0, 3))],
                                  ),
                                  child: const Icon(Icons.engineering, color: Colors.white, size: 28),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(4)),
                                  child: const Text("محل ثبت", style: TextStyle(color: Colors.white, fontSize: 10, fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold)),
                                )
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              else
                Container(
                  height: 140,
                  width: double.infinity,
                  color: Colors.grey.shade100,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.location_off_rounded, color: Colors.grey.shade400, size: 40),
                        const SizedBox(height: 12),
                        Text("موقعیت مکانی (GPS) در زمان ثبت گزارش ذخیره نشده است", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey.shade600, fontSize: 13)),
                      ],
                    ),
                  ),
                ),

              // ---------------------------------------------------
              // هدر اطلاعات پایه (Premium Design)
              // ---------------------------------------------------
              Transform.translate(
                offset: Offset(0, hasLocation ? -20 : 0),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 15, offset: const Offset(0, 5))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isEmergency ? Colors.red.shade50 : Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Icon(isEmergency ? Icons.warning_amber_rounded : Icons.verified_user_outlined, color: isEmergency ? Colors.red : Colors.blue, size: 28),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(buildingName, style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textBlack)),
                                const SizedBox(height: 4),
                                Text(
                                  isEmergency ? "خرابی و مراجعه اضطراری (BM)" : "سرویس نگهداری دوره‌ای (PM)",
                                  style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Divider()),
                      _buildDetailRow(Icons.engineering_outlined, "تکنسین مسئول:", techName),
                      const SizedBox(height: 12),
                      _buildDetailRow(Icons.calendar_month_outlined, "زمان پایان کار:", shamsiDate),

                      if (reportData['description'] != null && reportData['description'].toString().isNotEmpty) ...[
                        const SizedBox(height: 20),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.speaker_notes_outlined, size: 16, color: Colors.amber),
                                  SizedBox(width: 6),
                                  Text("توضیحات تکمیلی:", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, fontWeight: FontWeight.bold, color: Colors.amber)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(reportData['description'], style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, color: Colors.amber.shade900, height: 1.5)),
                            ],
                          ),
                        )
                      ]
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // ---------------------------------------------------
              // تب‌بندی داخلی: قطعات / چک‌لیست / خرابی
              // ---------------------------------------------------
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: DefaultTabController(
                  length: 2,
                  child: Column(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10)],
                        ),
                        child: TabBar(
                          labelColor: AppColors.primaryGreen,
                          unselectedLabelColor: Colors.grey.shade500,
                          indicatorColor: AppColors.primaryGreen,
                          indicatorWeight: 3,
                          labelStyle: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 14),
                          tabs: [
                            if (!isEmergency) const Tab(text: "چک‌لیست ایمنی") else const Tab(text: "گزارش خرابی (BM)"),
                            Tab(text: "قطعات (${partsUsed.length})"),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      // به جای SizedBox با ارتفاع ثابت، از مکانیزم منعطف استفاده می‌کنیم تا صفحه به اندازه محتوا باز شود
                      SizedBox(
                        height: 500, // حداقل ارتفاع برای اسکرول راحت
                        child: TabBarView(
                          children: [
                            if (!isEmergency) _buildChecklistView(checklist) else _buildEmergencyView(reportData),
                            _buildPartsView(partsUsed),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String title, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade500),
        const SizedBox(width: 8),
        Text(title, style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey.shade600)),
        const SizedBox(width: 8),
        Expanded(child: Text(value, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textBlack), overflow: TextOverflow.ellipsis)),
      ],
    );
  }

  // ویجت نمایش لیست قطعات مصرفی
  Widget _buildPartsView(List<dynamic> parts) {
    if (parts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 50, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text("هیچ قطعه‌ای در این سرویس ثبت نشده است.", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey.shade500, fontSize: 14)),
          ],
        ),
      );
    }
    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      itemCount: parts.length,
      padding: const EdgeInsets.only(bottom: 50),
      itemBuilder: (context, index) {
        final part = parts[index];
        final action = _translatePartAction(part['action_type']);
        return Card(
          elevation: 0,
          color: Colors.white,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.shade200)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.orange.shade50, shape: BoxShape.circle),
                  child: const Icon(Icons.build_circle_outlined, color: Colors.orange, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(part['part_name'], style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textBlack)),
                      const SizedBox(height: 4),
                      Text("وضعیت: $action", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade600)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
                  child: Text("${part['quantity']} عدد", style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, color: Colors.blue, fontSize: 13)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ویجت نمایش چک لیست PM
  Widget _buildChecklistView(Map<String, dynamic>? checklist) {
    if (checklist == null || checklist.isEmpty) {
      return Center(
        child: Text("اطلاعات چک‌لیست از سرور دریافت نشد.", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey.shade500, fontSize: 14)),
      );
    }

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 50),
      children: checklist.entries.map((entry) {
        final status = _translateStatus(entry.value.toString());
        final title = _translateChecklistKey(entry.key);

        Color statusColor = Colors.grey;
        Color bgColor = Colors.grey.shade50;
        IconData statusIcon = Icons.help_outline;

        if (entry.value == 'OK') {
          statusColor = Colors.green.shade700;
          bgColor = Colors.green.shade50;
          statusIcon = Icons.check_circle_rounded;
        } else if (entry.value == 'NEEDS_REPAIR') {
          statusColor = Colors.orange.shade800;
          bgColor = Colors.orange.shade50;
          statusIcon = Icons.build_rounded;
        } else if (entry.value == 'DEFECTIVE') {
          statusColor = Colors.red.shade700;
          bgColor = Colors.red.shade50;
          statusIcon = Icons.cancel_rounded;
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
          child: Row(
            children: [
              Expanded(
                child: Text(title, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textBlack)),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(status, style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: statusColor, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 6),
                    Icon(statusIcon, color: statusColor, size: 16),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  // ویجت نمایش جزئیات خرابی BM
  Widget _buildEmergencyView(Map<String, dynamic> report) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 50),
      children: [
        _buildInfoCard("علت اعزام تکنسین", _translateBM(report['bm_dispatch_reason']), Icons.support_agent_rounded, Colors.purple),
        _buildInfoCard("وضعیت آسانسور هنگام رسیدن", _translateBM(report['bm_arrival_status']), Icons.elevator_rounded, Colors.blue),
        _buildInfoCard("علت ریشه‌ای خرابی (تشخیص)", _translateBM(report['bm_cause']), Icons.search_rounded, Colors.orange),
        _buildInfoCard("اقدام فنی انجام شده", _translateBM(report['bm_action']), Icons.handyman_rounded, AppColors.primaryGreen),
        _buildInfoCard("وضعیت پروژه هنگام ترک", _translateBM(report['project_status']), Icons.fact_check_rounded, Colors.teal),

        if (report['employer_comments'] != null && report['employer_comments'].toString().isNotEmpty)
          _buildInfoCard("نظرات و تاییدیه کارفرما", report['employer_comments'], Icons.record_voice_over_rounded, Colors.indigo),
      ],
    );
  }

  Widget _buildInfoCard(String title, String value, IconData icon, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade500)),
                const SizedBox(height: 6),
                Text(value, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textBlack, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}