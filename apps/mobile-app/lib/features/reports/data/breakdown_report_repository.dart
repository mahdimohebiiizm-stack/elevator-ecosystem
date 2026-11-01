import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/sync_manager.dart';
import '../models/service_report_request.dart';
import '../models/checklist_item_model.dart';

/// مخزن داده ماژول گزارش‌های خرابی و تعمیرات اضطراری آسانسور (BM)
/// تفکیک عملیات شبکه، ژئولوکیشن، فشرده‌سازی و صف آفلاین
class BreakdownReportRepository {
  final ApiClient _apiClient;
  final SyncManager _syncManager;

  BreakdownReportRepository({
    ApiClient? apiClient,
    SyncManager? syncManager,
  })  : _apiClient = apiClient ?? ApiClient(),
        _syncManager = syncManager ?? SyncManager();

  /// نقشه‌های مقادیر فارسی به کلیدهای استاندارد بک‌اند
  static const Map<String, String> dispatchReasons = {
    "اعزام توسط مدیر اجرایی": "MANAGER_DISPATCH",
    "تماس کارفرما": "EMPLOYER_CALL",
    "عملیات تکمیلی": "COMPLEMENTARY",
    "گزارش QC": "QC_REPORT",
  };

  static const Map<String, String> arrivalStatuses = {
    "در حال کار، نرمال": "RUNNING_NORMAL",
    "در حال کار، غیرنرمال": "RUNNING_ABNORMAL",
    "توقف توسط کلید": "STOPPED_BY_KEY",
    "صدا در هنگام حرکت": "NOISE_IN_MOTION",
    "توقف با درب باز": "STOPPED_DOOR_OPEN",
    "توقف با درب بسته": "STOPPED_DOOR_CLOSED",
    "توقف بین طبقات": "STOPPED_BETWEEN_FLOORS",
  };

  static const Map<String, String> causes = {
    "پایان عمر قطعه": "END_OF_LIFE",
    "ایراد الکتریکی": "ELECTRICAL_FAULT",
    "ایراد مکانیکی": "MECHANICAL_FAULT",
    "استفاده نامناسب": "IMPROPER_USE",
    "خرابکاری": "VANDALISM",
    "ایراد خارجی": "EXTERNAL_FAULT",
    "نامشخص": "UNKNOWN",
    "بدون ایراد": "NO_FAULT",
  };

  static const Map<String, String> actions = {
    "نظافت": "CLEANING",
    "تست": "TESTING",
    "تعویض قطعه": "REPLACEMENT",
    "تعمیر": "REPAIR",
    "عیب‌یابی": "TROUBLESHOOTING",
    "تنظیم": "ADJUSTMENT",
    "راه‌اندازی مجدد": "RESTART",
    "پشتیبانی": "CUSTOMER_SUPPORT",
    "سایر": "OTHER",
  };

  static const Map<String, String> projectStatuses = {
    "در حال کار / بدون ایراد": "RUNNING_OK",
    "در حال کار / نیاز به اقدام تکمیلی": "RUNNING_NEEDS_ACTION",
    "متوقف / نیاز به اقدام تکمیلی": "STOPPED_NEEDS_ACTION",
  };

  /// دریافت موقعیت جغرافیایی با بررسی دسترسی‌های لازم
  Future<Position?> getCurrentLocation() async {
    try {
      final bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint("BreakdownReportRepository: Location service disabled.");
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        const LocationSettings locationSettings = LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 5),
        );
        return await Geolocator.getCurrentPosition(
          locationSettings: locationSettings,
        );
      } else {
        debugPrint("BreakdownReportRepository: Location permission denied: $permission");
        return null;
      }
    } catch (e) {
      debugPrint("BreakdownReportRepository: Error fetching location: $e");
      return null;
    }
  }

  /// فشرده‌سازی تصویر برای ارسال در گزارش خرابی
  Future<String> compressImage(String originalFilePath) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final String targetPath =
          '${tempDir.absolute.path}/bm_compressed_${DateTime.now().millisecondsSinceEpoch}.jpg';

      final XFile? compressed = await FlutterImageCompress.compressAndGetFile(
        originalFilePath,
        targetPath,
        quality: 70,
        minWidth: 1080,
        minHeight: 1080,
      );

      return compressed?.path ?? originalFilePath;
    } catch (e) {
      debugPrint("BreakdownReportRepository: Image compression error: $e");
      return originalFilePath;
    }
  }

  /// بررسی وضعیت اتصال اینترنت
  Future<bool> hasInternet() async {
    try {
      return await _syncManager.hasInternet();
    } catch (e) {
      debugPrint("BreakdownReportRepository: Connectivity check error: $e");
      return false;
    }
  }

  /// ذخیره گزارش خرابی در صف آفلاین محلی
  Future<void> saveReportOffline({
    required ServiceReportRequest request,
    required List<String> mediaFilePaths,
  }) async {
    try {
      await _syncManager.saveReportOffline(request, mediaFilePaths);
    } catch (e) {
      debugPrint("BreakdownReportRepository: Error saving offline: $e");
      rethrow;
    }
  }

  /// ارسال گزارش خرابی (ارسال به سرور یا ذخیره در صف محلی در صورت عدم دسترسی)
  Future<ServiceReportSubmissionResult> submitBreakdownReport({
    required ServiceReportRequest request,
    required List<String> mediaFilePaths,
  }) async {
    final bool online = await hasInternet();

    if (online) {
      try {
        final String? reportId = await _apiClient.submitServiceReport(request);

        if (reportId != null) {
          if (mediaFilePaths.isNotEmpty) {
            try {
              await _apiClient.uploadReportMedia(reportId, mediaFilePaths);
            } catch (mediaError) {
              debugPrint("BreakdownReportRepository: Media upload failed: $mediaError");
            }
          }

          return ServiceReportSubmissionResult(
            isSuccess: true,
            isOfflineSaved: false,
            reportId: reportId,
            message: "گزارش خرابی با موفقیت ثبت شد!",
          );
        } else {
          throw Exception("شناسه گزارش از سمت سرور بازگردانده نشد.");
        }
      } catch (networkError) {
        debugPrint("BreakdownReportRepository: Network error ($networkError), saving offline.");
        await saveReportOffline(
          request: request,
          mediaFilePaths: mediaFilePaths,
        );
        return const ServiceReportSubmissionResult(
          isSuccess: true,
          isOfflineSaved: true,
          message: "سرور در دسترس نبود. گزارش خرابی در صف آفلاین ذخیره شد.",
        );
      }
    } else {
      await saveReportOffline(
        request: request,
        mediaFilePaths: mediaFilePaths,
      );
      return const ServiceReportSubmissionResult(
        isSuccess: true,
        isOfflineSaved: true,
        message: "اینترنت قطع است. گزارش خرابی در صف آفلاین ذخیره شد.",
      );
    }
  }
}
