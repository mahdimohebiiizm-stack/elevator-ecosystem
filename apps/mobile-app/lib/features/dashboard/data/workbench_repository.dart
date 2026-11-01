import 'package:flutter/foundation.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/sync_manager.dart';

/// مخزن داده ماژول میز کار تکنسین‌ها و مدیریت داشبورد عملیاتی
/// تفکیک درخواست‌های شبکه و سینک آفلاین از لایه UI
class WorkbenchRepository {
  final ApiClient _apiClient;
  final SyncManager _syncManager;

  WorkbenchRepository({
    ApiClient? apiClient,
    SyncManager? syncManager,
  })  : _apiClient = apiClient ?? ApiClient(),
        _syncManager = syncManager ?? SyncManager();

  /// دریافت لیست ماموریت‌ها و تسک‌های روز جاری تکنسین
  Future<List<Map<String, dynamic>>> getTodayTasks() async {
    try {
      final List<dynamic> rawData = await _apiClient.getTodayTasks();
      return rawData.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    } catch (e) {
      debugPrint("WorkbenchRepository - Error in getTodayTasks: $e");
      rethrow;
    }
  }

  /// دریافت لیست کلیه ساختمان‌های تحت قرارداد
  Future<List<Map<String, dynamic>>> getAllBuildings() async {
    try {
      final response = await _apiClient.dio.get('/api/v1/buildings/');
      if (response.data is List) {
        return (response.data as List)
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint("WorkbenchRepository - Error in getAllBuildings: $e");
      return [];
    }
  }

  /// دریافت هشدارهای معوقه مالی و پیام‌های مدیریتی (مخصوص ADMIN و MANAGER)
  Future<List<Map<String, dynamic>>> getOverdueNotifications() async {
    try {
      final response = await _apiClient.dio.get('/api/v1/analytics/summary');
      final overdue = response.data['finance']?['overdue_contracts'] as List?;
      if (overdue != null) {
        return overdue.map((item) => Map<String, dynamic>.from(item as Map)).toList();
      }
      return [];
    } catch (e) {
      debugPrint("WorkbenchRepository - Error in getOverdueNotifications: $e");
      return [];
    }
  }

  /// استعلام تعداد گزارش‌های معلق در صف محلی آفلاین
  Future<int> getOfflineReportsCount() async {
    try {
      return await _syncManager.getPendingReportsCount();
    } catch (e) {
      debugPrint("WorkbenchRepository - Error in getOfflineReportsCount: $e");
      return 0;
    }
  }

  /// اجرای عملیات همگام‌سازی گزارش‌های آفلاین با سرور
  Future<int> syncOfflineReports() async {
    try {
      return await _syncManager.syncOfflineReports();
    } catch (e) {
      debugPrint("WorkbenchRepository - Error in syncOfflineReports: $e");
      rethrow;
    }
  }

  /// دریافت سوابق و پرونده پزشکی آسانسور مشخص
  Future<List<Map<String, dynamic>>> getElevatorHistory(String elevatorId) async {
    try {
      final List<dynamic> rawData = await _apiClient.getElevatorHistory(elevatorId);
      return rawData.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    } catch (e) {
      debugPrint("WorkbenchRepository - Error in getElevatorHistory: $e");
      rethrow;
    }
  }

  /// ثبت دلیل عدم انجام سرویس یا معوق شدن تسک توسط تکنسین
  Future<bool> submitTaskExplanation(String assignmentId, String explanation) async {
    try {
      return await _apiClient.submitTaskExplanation(assignmentId, explanation);
    } catch (e) {
      debugPrint("WorkbenchRepository - Error in submitTaskExplanation: $e");
      rethrow;
    }
  }
}
