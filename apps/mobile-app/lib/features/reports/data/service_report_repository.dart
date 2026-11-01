import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/sync_manager.dart';
import '../models/service_report_request.dart';
import '../models/checklist_item_model.dart';

/// مخزن داده ماژول گزارش‌های سرویس و خرابی تکنسین آسانسور
/// تفکیک عملیات شبکه، فشرده‌سازی مدیا، ژئولوکیشن و ذخیره‌سازی آفلاین
class ServiceReportRepository {
  final ApiClient _apiClient;
  final SyncManager _syncManager;

  ServiceReportRepository({
    ApiClient? apiClient,
    SyncManager? syncManager,
  })  : _apiClient = apiClient ?? ApiClient(),
        _syncManager = syncManager ?? SyncManager();

  /// ایجاد دسته‌بندی‌ها و آیتم‌های ۲۵ گانه استاندارد چک‌لیست سرویس ماهانه
  List<ChecklistCategoryModel> getDefaultCategories() {
    return [
      const ChecklistCategoryModel(
        title: "کابین و طبقات (آیتم ۱ تا ۷)",
        icon: Icons.elevator_outlined,
        isExpanded: true,
        items: [
          ChecklistItemModel(keyName: "item_01_cabin_light", title: "۱. روشنایی کابین"),
          ChecklistItemModel(keyName: "item_02_sill_cleanliness", title: "۲. تمیزی پاخور کابین و طبقات"),
          ChecklistItemModel(keyName: "item_03_indicators_fan", title: "۳. نمراتور، اعلام طبقات، فن و آژیر"),
          ChecklistItemModel(keyName: "item_04_cabin_vibration", title: "۴. لرزش و صدای حرکت کابین"),
          ChecklistItemModel(keyName: "item_05_door_shoes", title: "۵. عملکرد لته‌های درب و کفشک درب"),
          ChecklistItemModel(keyName: "item_06_floor_call", title: "۶. عملکرد احضار طبقات"),
          ChecklistItemModel(keyName: "item_07_leveling", title: "۷. توقف لول طبقات"),
        ],
      ),
      const ChecklistCategoryModel(
        title: "چاهک، سقف و ایمنی (آیتم ۸ تا ۱۸)",
        icon: Icons.settings_input_component_outlined,
        isExpanded: false,
        items: [
          ChecklistItemModel(keyName: "item_08_safety_circuit", title: "۸. تست مدار سری ایمنی کنتاکت‌ها و قفل‌ها"),
          ChecklistItemModel(keyName: "item_09_door_dictator", title: "۹. تست عملکرد دیکتاتور و خودبسته شدن"),
          ChecklistItemModel(keyName: "item_10_inspection_movement", title: "۱۰. عملکرد قارچی، رویزیون و حرکت بالا/پایین"),
          ChecklistItemModel(keyName: "item_11_roof_cleanliness", title: "۱۱. تمیزی سقف کابین"),
          ChecklistItemModel(keyName: "item_12_wiring_tidiness", title: "۱۲. مرتب بودن سیم‌های رویزیون و قفل‌ها"),
          ChecklistItemModel(keyName: "item_13_oilers", title: "۱۳. پر بودن روغندان کابین و وزنه"),
          ChecklistItemModel(keyName: "item_14_ropes_attachments", title: "۱۴. درمهره، اشپیل و کرپی سربکسل"),
          ChecklistItemModel(keyName: "item_15_shoes_tightening", title: "۱۵. آچارکشی لرزه‌گیرها و کفشک‌ها"),
          ChecklistItemModel(keyName: "item_16_brackets_tightening", title: "۱۶. آچارکشی پشت‌بندها و براکت‌ها"),
          ChecklistItemModel(keyName: "item_17_sensors_magnets", title: "۱۷. تمیزی سنسور و آهنرباهای دورانداز"),
          ChecklistItemModel(keyName: "item_18_microswitches_parachute", title: "۱۸. تست میکروسوئیچ‌های پاراشوت و حد"),
        ],
      ),
      const ChecklistCategoryModel(
        title: "موتورخانه (آیتم ۱۹ تا ۲۵)",
        icon: Icons.engineering_outlined,
        isExpanded: false,
        items: [
          ChecklistItemModel(keyName: "item_19_contactors_relays", title: "۱۹. عملکرد کنتاکتورها و رله‌های تابلو"),
          ChecklistItemModel(keyName: "item_20_emergency_rescue", title: "۲۰. تست نجات اضطراری"),
          ChecklistItemModel(keyName: "item_21_motor_brake", title: "۲۱. عملکرد دسته و فک ترمز موتور"),
          ChecklistItemModel(keyName: "item_22_motor_grooves", title: "۲۲. بازدید شیار موتور و قطر سیم‌‌بکسل"),
          ChecklistItemModel(keyName: "item_23_governor", title: "۲۳. تست گاورنر و میکروسوئیچ گاورنر"),
          ChecklistItemModel(keyName: "item_24_motor_oil", title: "۲۴. چک کردن روغن موتور"),
          ChecklistItemModel(keyName: "item_25_engine_room_ventilation", title: "۲۵. روشنایی و تهویه موتورخانه"),
        ],
      ),
    ];
  }

  /// دریافت موقعیت جغرافیایی تکنسین با مدیریت خطا و هندل کردن پرمیشن‌ها
  Future<Position?> getCurrentLocation() async {
    try {
      final bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint("ServiceReportRepository: Location services are disabled.");
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        const LocationSettings locationSettings = LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 5),
        );
        return await Geolocator.getCurrentPosition(locationSettings: locationSettings);
      } else {
        debugPrint("ServiceReportRepository: Location permission denied: $permission");
        return null;
      }
    } catch (e) {
      debugPrint("ServiceReportRepository: Failed to get current location: $e");
      return null;
    }
  }

  /// فشرده‌سازی تصویر برای بهینه‌سازی مصرف پهنای باند آپلود با بازگشت فایل امن
  Future<String> compressImage(String originalFilePath) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final String targetPath =
          '${tempDir.absolute.path}/compressed_${DateTime.now().millisecondsSinceEpoch}.jpg';

      final XFile? compressed = await FlutterImageCompress.compressAndGetFile(
        originalFilePath,
        targetPath,
        quality: 70,
        minWidth: 1080,
        minHeight: 1080,
      );

      return compressed?.path ?? originalFilePath;
    } catch (e) {
      debugPrint("ServiceReportRepository: Image compression failed ($e), using original file.");
      return originalFilePath;
    }
  }

  /// بررسی اتصال شبکه اینترنت با لایه سینک
  Future<bool> hasInternet() async {
    try {
      return await _syncManager.hasInternet();
    } catch (e) {
      debugPrint("ServiceReportRepository: Connectivity check error: $e");
      return false;
    }
  }

  /// ذخیره مستقیم گزارش در صف محلی آفلاین
  Future<void> saveReportOffline({
    required ServiceReportRequest request,
    required List<String> mediaFilePaths,
  }) async {
    try {
      await _syncManager.saveReportOffline(request, mediaFilePaths);
    } catch (e) {
      debugPrint("ServiceReportRepository: Error saving report offline: $e");
      rethrow;
    }
  }

  /// ارسال گزارش سرویس یا خرابی (ارسال آنلاین در صورت وجود شبکه یا ذخیره آفلاین در صف محلی)
  Future<ServiceReportSubmissionResult> submitReport({
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
              debugPrint("ServiceReportRepository: Media upload failed: $mediaError");
              // ثبت گزارش موفق بوده است، اما مدیا ناقص مانده است
            }
          }

          return ServiceReportSubmissionResult(
            isSuccess: true,
            isOfflineSaved: false,
            reportId: reportId,
            message: "گزارش با موفقیت ثبت شد!",
          );
        } else {
          throw Exception("شناسه گزارش از سمت سرور بازگردانده نشد.");
        }
      } catch (networkError) {
        debugPrint("ServiceReportRepository: Network submission failed ($networkError), saving to offline queue.");
        await saveReportOffline(
          request: request,
          mediaFilePaths: mediaFilePaths,
        );
        return const ServiceReportSubmissionResult(
          isSuccess: true,
          isOfflineSaved: true,
          message: "سرور در دسترس نبود. گزارش شما در صف آفلاین ذخیره شد.",
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
        message: "اینترنت قطع است. گزارش شما در صف آفلاین ذخیره شد.",
      );
    }
  }
}
