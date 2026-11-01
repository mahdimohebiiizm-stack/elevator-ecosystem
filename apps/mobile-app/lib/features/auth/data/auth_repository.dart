import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_client.dart';

/// مخزن مدیریت داده‌ها و عملیات احراز هویت (Auth Repository)
/// تفکیک لایه دسترسی به داده از لایه لاجیک کسب‌وکار
class AuthRepository {
  final ApiClient _apiClient;
  final FlutterSecureStorage _storage;

  AuthRepository({
    ApiClient? apiClient,
    FlutterSecureStorage? storage,
  })  : _apiClient = apiClient ?? ApiClient(),
        _storage = storage ?? const FlutterSecureStorage();

  /// ارسال درخواست ورود به سیستم و ذخیره اطلاعات توکن در Secure Storage
  Future<bool> login(String phone, String password) async {
    return await _apiClient.login(phone, password);
  }

  /// خروج از حساب کاربری و پاک‌سازی توکن‌ها
  Future<void> logout() async {
    await _apiClient.logout();
  }

  /// دریافت نقش کاربر ذخیره‌شده
  Future<String?> getUserRole() async {
    return await _apiClient.getUserRole();
  }

  /// دریافت توکن فعال
  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  /// دریافت نام کاربر لاگین‌شده
  Future<String?> getUserName() async {
    return await _storage.read(key: 'user_name');
  }

  /// بررسی داشتن توکن معتبر
  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
