import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../features/reports/models/service_report_request.dart';
import 'dart:convert';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late Dio dio;
  final storage = const FlutterSecureStorage();

  /// ناظر تغییر وضعیت احراز هویت برای خروج امن هنگام انقضای نشست (401)
  static final ValueNotifier<bool> authStateNotifier = ValueNotifier<bool>(true);

  // ⚠️ مهم: اگر روی گوشی واقعی تست می‌کنی، این آی‌پی باید دقیقاً آی‌پی IPv4 لپ‌تاپت در شبکه وای‌فای باشه.
  // در CMD دستور ipconfig رو بزن و مطمئن شو تغییر نکرده باشه.
  final String baseUrl = "http://192.168.1.139:8000";

  ApiClient._internal() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10), // زمان معقول برای اتصال
      receiveTimeout: const Duration(seconds: 10),
    ));

    dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) async {
          String? token = await storage.read(key: 'jwt_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          if (kDebugMode) {
            print("🚀 Request: [${options.method}] ${options.uri}");
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (kDebugMode) {
            print("❌ DioError: [${e.type}] - ${e.message}");
          }
          // مدیریت خطای انقضای نشست کاربری یا عدم احراز هویت (401 Unauthorized)
          if (e.response?.statusCode == 401) {
            if (kDebugMode) {
              print("🔒 401 Unauthorized detected: Flushing invalid JWT token from Secure Storage.");
            }
            await storage.delete(key: 'jwt_token');
            authStateNotifier.value = false;
          }
          return handler.next(e);
        }
    ));
  }

  // متد کمکی برای تشخیص قطعی اینترنت یا در دسترس نبودن سرور از روی ارورهای Dio
  bool _isNetworkError(DioException e) {
    return e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError ||
        (e.error != null && e.error.toString().contains('SocketException'));
  }

  // ==========================================
  // متدهای احراز هویت
  // ==========================================
  Future<bool> login(String phone, String password) async {
    try {
      var formData = FormData.fromMap({
        'username': phone,
        'password': password,
      });

      var response = await dio.post('/api/v1/auth/login', data: formData);

      if (response.statusCode == 200) {
        String token = response.data['access_token'];
        String role = response.data['role'] ?? 'TECHNICIAN';
        String name = response.data['full_name'] ?? 'تکنسین سیستم';

        await storage.write(key: 'jwt_token', value: token);
        await storage.write(key: 'user_role', value: role);
        await storage.write(key: 'user_name', value: name);
        await storage.write(key: 'username', value: phone);

        return true;
      }
      return false;

    } on DioException catch (e) {
      if (e.response != null) {
        final serverMessage = e.response?.data['detail'] ?? "خطای سرور";
        throw Exception(serverMessage);
      } else {
        throw Exception("عدم اتصال به سرور. لطفا اتصال اینترنت یا آدرس IP سرور را بررسی کنید.");
      }
    } catch (e) {
      throw Exception("خطای نامشخص رخ داده است.");
    }
  }

  Future<void> logout() async {
    await storage.delete(key: 'jwt_token');
    await storage.delete(key: 'user_role');
    await storage.delete(key: 'user_name');
    await storage.delete(key: 'username');
  }

  Future<String?> getUserRole() async {
    return await storage.read(key: 'user_role');
  }

  Future<String?> getUserName() async {
    return await storage.read(key: 'user_name');
  }

  // ==========================================
  // متدهای داشبورد تکنسین (همراه با کش آفلاین)
  // ==========================================
  Future<List<dynamic>> getTodayTasks() async {
    try {
      var response = await dio.get('/api/v1/analytics/technician-tasks');
      await storage.write(key: 'cached_today_tasks', value: jsonEncode(response.data));
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (_isNetworkError(e)) {
        String? cachedData = await storage.read(key: 'cached_today_tasks');
        if (cachedData != null) {
          return jsonDecode(cachedData) as List<dynamic>;
        }
      }
      if (e.response != null) {
        throw Exception(e.response?.data['detail'] ?? "خطا در دریافت اطلاعات");
      }
      throw Exception("مشکل در ارتباط با سرور");
    }
  }

  // ==========================================
  // متدهای ثبت گزارش (آفلاین‌فرست)
  // ==========================================
  Future<String?> submitServiceReport(ServiceReportRequest request) async {
    try {
      final response = await dio.post(
        '/api/v1/reports/',
        data: request.toJson(),
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.data['id'].toString();
      } else {
        throw Exception('خطا در ثبت اطلاعات: کد ${response.statusCode}');
      }
    } on DioException catch (e) {
      // تشخیص دقیق قطعی اینترنت یا در دسترس نبودن سرور برای انتقال به صف آفلاین
      if (_isNetworkError(e)) {
        throw Exception('NETWORK_ERROR');
      }
      if (e.response != null) {
        throw Exception('خطای سرور: ${e.response?.data['detail'] ?? e.message}');
      } else {
        throw Exception('NETWORK_ERROR');
      }
    } catch (e) {
      throw Exception('خطای نامشخص: $e');
    }
  }

  Future<bool> uploadReportMedia(String reportId, List<String> filePaths) async {
    if (filePaths.isEmpty) return true;

    try {
      var formData = FormData();

      for (var path in filePaths) {
        String fileName = path.split('/').last;
        formData.files.add(MapEntry(
          'files',
          await MultipartFile.fromFile(path, filename: fileName),
        ));
      }

      final response = await dio.post(
        '/api/v1/reports/$reportId/media',
        data: formData,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      }
      return false;
    } on DioException catch (e) {
      if (_isNetworkError(e)) {
        throw Exception('NETWORK_ERROR');
      }
      if (e.response != null) {
        throw Exception('خطا در آپلود عکس: ${e.response?.data['detail'] ?? e.message}');
      }
      throw Exception('NETWORK_ERROR');
    }
  }

  Future<List<dynamic>> getElevatorHistory(String elevatorId) async {
    try {
      var response = await dio.get(
        '/api/v1/reports/elevator/$elevatorId/history',
        queryParameters: {'skip': 0, 'limit': 10},
      );
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response != null) {
        throw Exception(e.response?.data['detail'] ?? "خطا در دریافت تاریخچه آسانسور");
      }
      throw Exception("مشکل در ارتباط با سرور هنگام دریافت سوابق.");
    }
  }

  Future<bool> submitTaskExplanation(String assignmentId, String explanation) async {
    try {
      final response = await dio.post(
        '/api/v1/analytics/tasks/$assignmentId/explanation',
        data: {'explanation': explanation},
      );
      return response.statusCode == 200;
    } catch (e) {
      throw Exception('خطا در ارسال توضیحات: $e');
    }
  }

  // ==========================================
  // متدهای مدیریت پرسنل (Admin Hub)
  // ==========================================
  Future<List<dynamic>> getUsers() async {
    try {
      var response = await dio.get('/api/v1/auth/users');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در دریافت لیست کاربران");
    }
  }

  Future<bool> createUser(Map<String, dynamic> userData) async {
    try {
      var response = await dio.post('/api/v1/auth/users', data: userData);
      return response.statusCode == 201;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در ثبت کاربر جدید");
    }
  }

  Future<bool> updateUser(String userId, Map<String, dynamic> updateData) async {
    try {
      var response = await dio.put('/api/v1/auth/users/$userId', data: updateData);
      return response.statusCode == 200;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در ویرایش اطلاعات کاربر");
    }
  }

  // ==========================================
  // متدهای مدیریت ساختمان‌ها (Admin Hub)
  // ==========================================
  Future<List<dynamic>> getBuildings() async {
    try {
      var response = await dio.get('/api/v1/buildings/');
      // ذخیره در کش برای استفاده آفلاین در فرم‌های ثبت خرابی
      await storage.write(key: 'cached_buildings', value: jsonEncode(response.data));
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (_isNetworkError(e)) {
        String? cachedData = await storage.read(key: 'cached_buildings');
        if (cachedData != null) {
          return jsonDecode(cachedData) as List<dynamic>;
        }
      }
      throw Exception(e.response?.data['detail'] ?? "خطا در دریافت لیست ساختمان‌ها");
    }
  }

  Future<bool> createBuilding(Map<String, dynamic> buildingData) async {
    try {
      var response = await dio.post('/api/v1/buildings/', data: buildingData);
      return response.statusCode == 201;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در ثبت ساختمان جدید");
    }
  }

  // ==========================================
  // متدهای مدیریت قراردادها (Admin Hub)
  // ==========================================
  Future<List<dynamic>> getBuildingContracts(String buildingId) async {
    try {
      var response = await dio.get('/api/v1/contracts/building/$buildingId');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در دریافت قراردادهای ساختمان");
    }
  }

  Future<bool> createContract(Map<String, dynamic> contractData) async {
    try {
      var response = await dio.post('/api/v1/contracts/', data: contractData);
      return response.statusCode == 201 || response.statusCode == 200;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در ثبت قرارداد");
    }
  }

  // ==========================================
  // متدهای مدیریت ارجاعات و تسک‌ها (Admin Hub)
  // ==========================================
  Future<List<dynamic>> getAllAssignments() async {
    try {
      var response = await dio.get('/api/v1/analytics/assignments');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 405) {
        return [];
      }
      throw Exception(e.response?.data['detail'] ?? "خطا در دریافت لیست ارجاعات");
    }
  }

  Future<Map<String, dynamic>> assignTask(Map<String, dynamic> data) async {
    try {
      var response = await dio.post('/api/v1/analytics/assign-task', data: data);
      return {
        "success": response.statusCode == 200 || response.statusCode == 201,
        "message": response.data['message'] ?? 'ارجاع با موفقیت ثبت شد'
      };
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در ارجاع کار");
    }
  }

  Future<bool> deleteAssignment(String assignmentId) async {
    try {
      var response = await dio.delete('/api/v1/analytics/assignments/$assignmentId');
      return response.statusCode == 200 || response.statusCode == 204;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در حذف ارجاع");
    }
  }

  // ==========================================
  // متدهای مدیریت گزارش‌ها (Reports)
  // ==========================================
  Future<List<dynamic>> getAllReports() async {
    try {
      var response = await dio.get('/api/v1/reports/');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در دریافت لیست گزارش‌ها");
    }
  }

  // ==========================================
  // متدهای مدیریت اعلانات و پیام‌ها (Notifications)
  // ==========================================
  Future<List<dynamic>> getNotifications() async {
    try {
      var response = await dio.get('/api/v1/notifications/');
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در دریافت لیست پیام‌ها");
    }
  }

  Future<bool> markNotificationAsRead(String notifId) async {
    try {
      var response = await dio.put('/api/v1/notifications/$notifId/read');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ==========================================
  // متدهای آپدیت و حذف ساختمان و قرارداد
  // ==========================================
  Future<bool> updateBuilding(String buildingId, Map<String, dynamic> data) async {
    try {
      var response = await dio.put('/api/v1/buildings/$buildingId', data: data);
      return response.statusCode == 200;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در ویرایش ساختمان");
    }
  }

  Future<bool> deleteBuilding(String buildingId) async {
    try {
      var response = await dio.delete('/api/v1/buildings/$buildingId');
      return response.statusCode == 200 || response.statusCode == 204;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در حذف ساختمان");
    }
  }

  Future<bool> updateContract(String contractId, Map<String, dynamic> data) async {
    try {
      var response = await dio.put('/api/v1/contracts/$contractId', data: data);
      return response.statusCode == 200;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در ویرایش قرارداد");
    }
  }

  Future<bool> deleteContract(String contractId) async {
    try {
      var response = await dio.delete('/api/v1/contracts/$contractId');
      return response.statusCode == 200 || response.statusCode == 204;
    } on DioException catch (e) {
      throw Exception(e.response?.data['detail'] ?? "خطا در حذف قرارداد");
    }
  }
}