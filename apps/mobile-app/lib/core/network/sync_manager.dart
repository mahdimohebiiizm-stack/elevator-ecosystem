import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'api_client.dart';
import '../../features/reports/models/service_report_request.dart';

class SyncManager {
  static final SyncManager _instance = SyncManager._internal();
  factory SyncManager() => _instance;
  SyncManager._internal();

  static const String _queueKey = 'offline_reports_queue';

  // بررسی وضعیت شبکه
  Future<bool> hasInternet() async {
    try {
      final List<ConnectivityResult> connectivityResult = await (Connectivity().checkConnectivity());
      if (connectivityResult.contains(ConnectivityResult.none)) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // ذخیره امن در دیتابیس لوکال گوشی
  Future<void> saveReportOffline(ServiceReportRequest request, List<String> mediaPaths) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> queue = prefs.getStringList(_queueKey) ?? [];

    Map<String, dynamic> offlineData = {
      'request': request.toJson(),
      'media_paths': mediaPaths,
      'timestamp': DateTime.now().toIso8601String(),
    };

    queue.add(jsonEncode(offlineData));
    await prefs.setStringList(_queueKey, queue);
    debugPrint("گزارش آفلاین ذخیره شد. تعداد فعلی صف: ${queue.length}");
  }

  // 🌟 متد جدید: خواندن تعداد گزارش‌های معلق برای آپدیت زنده UI
  Future<int> getPendingReportsCount() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> queue = prefs.getStringList(_queueKey) ?? [];
    return queue.length;
  }

  // موتور همگام‌سازی هوشمند (Fail-Safe)
  Future<int> syncOfflineReports() async {
    if (!await hasInternet()) return 0;

    final prefs = await SharedPreferences.getInstance();
    List<String> queue = prefs.getStringList(_queueKey) ?? [];

    if (queue.isEmpty) return 0;

    int syncedCount = 0;
    List<String> remainingQueue = []; // لیست گزارش‌هایی که نتوانستند ارسال شوند

    for (String item in queue) {
      try {
        Map<String, dynamic> data = jsonDecode(item);
        Map<String, dynamic> reqData = data['request'];

        ServiceReportRequest request = ServiceReportRequest(
          elevatorId: reqData['elevator_id'].toString(),
          isEmergency: reqData['is_emergency'] == true,
          techLat: reqData['tech_lat'] != null ? double.tryParse(reqData['tech_lat'].toString()) : null,
          techLng: reqData['tech_lng'] != null ? double.tryParse(reqData['tech_lng'].toString()) : null,
          description: reqData['description'],
          bmDispatchReason: reqData['bm_dispatch_reason'],
          bmArrivalStatus: reqData['bm_arrival_status'],
          bmCause: reqData['bm_cause'],
          bmAction: reqData['bm_action'],
          projectStatus: reqData['project_status'],
          employerComments: reqData['employer_comments'],
          checklist: reqData['checklist'] != null ? Map<String, String>.from(reqData['checklist']) : null,
          partsUsed: reqData['parts_used'] != null
              ? (reqData['parts_used'] as List).map((p) => ReportPart(
            partName: p['part_name'] ?? 'نامشخص',
            quantity: p['quantity'] ?? 1,
            actionType: p['action_type'] ?? 'CONSUMED',
          )).toList()
              : [],
        );

        List<String> mediaPaths = List<String>.from(data['media_paths'] ?? []);

        // ارسال به سرور
        String? reportId = await ApiClient().submitServiceReport(request);

        if (reportId != null) {
          // اگر کد ۲۰۰ از سرور گرفتیم، عکس‌ها را هم می‌فرستیم
          if (mediaPaths.isNotEmpty) {
            await ApiClient().uploadReportMedia(reportId, mediaPaths);
          }
          syncedCount++;
          // 👈 گزارش موفقیت‌آمیز بود، پس به remainingQueue اضافه نمی‌شود تا پاک شود
        } else {
          // 👈 اگر پاسخ سرور نامعتبر بود، گزارش در صف بماند
          remainingQueue.add(item);
        }

      } catch (e) {
        // 🌟 رفع باگ اصلی: هر اروری (سرور خاموش، تایم‌اوت، باگ پارس کردن) رخ داد،
        // به جای پاک کردن، گزارش باید در صف باقی بماند تا در تلاش بعدی ارسال شود!
        debugPrint("خطا در ارسال آفلاین (گزارش در صف باقی ماند): $e");
        remainingQueue.add(item);
      }
    }

    // جایگزین کردن صف با گزارش‌هایی که نتوانستند ارسال شوند
    await prefs.setStringList(_queueKey, remainingQueue);
    return syncedCount;
  }
}