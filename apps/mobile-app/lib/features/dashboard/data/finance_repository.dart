import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:equatable/equatable.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/sync_manager.dart';
import '../../../core/utils/app_formatters.dart';

/// مدل جامع تجمیع داده‌های مالی و آماری داشبورد مدیریت
class FinanceDataModel extends Equatable {
  final double totalMarketDebt; // ریال (پشتیبانی از ارقام میلیاردی)
  final double incomeLast30Days; // ریال
  final int activeContractsCount;
  final List<Map<String, dynamic>> overdueContracts;
  final List<Map<String, dynamic>> transactions;
  final Map<String, dynamic>? chartData;
  final bool isFromCache;

  const FinanceDataModel({
    required this.totalMarketDebt,
    required this.incomeLast30Days,
    required this.activeContractsCount,
    required this.overdueContracts,
    required this.transactions,
    this.chartData,
    this.isFromCache = false,
  });

  factory FinanceDataModel.fromApiData({
    required Map<String, dynamic> summary,
    required List<dynamic> transactions,
    Map<String, dynamic>? chart,
    bool isFromCache = false,
  }) {
    final finance = summary['finance'] as Map<String, dynamic>? ?? {};
    final business = summary['business'] as Map<String, dynamic>? ?? {};

    final overdueList = (finance['overdue_contracts'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];

    final txList = transactions
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return FinanceDataModel(
      totalMarketDebt: (double.tryParse(
              finance['total_market_debt']?.toString() ?? '0') ??
          0.0),
      incomeLast30Days: (double.tryParse(
              finance['income_last_30_days']?.toString() ?? '0') ??
          0.0),
      activeContractsCount:
          (int.tryParse(business['active_contracts']?.toString() ?? '0') ??
              0),
      overdueContracts: overdueList,
      transactions: txList,
      chartData: chart,
      isFromCache: isFromCache,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_market_debt': totalMarketDebt,
      'income_last_30_days': incomeLast30Days,
      'active_contracts_count': activeContractsCount,
      'overdue_contracts': overdueContracts,
      'transactions': transactions,
      'chart_data': chartData,
    };
  }

  factory FinanceDataModel.fromJson(Map<String, dynamic> json,
      {bool isFromCache = true}) {
    return FinanceDataModel(
      totalMarketDebt: (double.tryParse(
              json['total_market_debt']?.toString() ?? '0') ??
          0.0),
      incomeLast30Days: (double.tryParse(
              json['income_last_30_days']?.toString() ?? '0') ??
          0.0),
      activeContractsCount:
          (int.tryParse(json['active_contracts_count']?.toString() ?? '0') ??
              0),
      overdueContracts: (json['overdue_contracts'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          [],
      transactions: (json['transactions'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          [],
      chartData: json['chart_data'] as Map<String, dynamic>?,
      isFromCache: isFromCache,
    );
  }

  @override
  List<Object?> get props => [
        totalMarketDebt,
        incomeLast30Days,
        activeContractsCount,
        overdueContracts,
        transactions,
        chartData,
        isFromCache,
      ];
}

/// مخزن داده ماژول مالی و حسابداری
/// تفکیک عملیات شبکه، استعلامات درآمد، مطالبات، کش آفلاین و اکسپورت گزارشات اکسل
class FinanceRepository {
  final ApiClient _apiClient;
  final SyncManager _syncManager;

  static const String _cachedFinanceKey = 'cached_finance_dashboard_data';

  FinanceRepository({
    ApiClient? apiClient,
    SyncManager? syncManager,
  })  : _apiClient = apiClient ?? ApiClient(),
        _syncManager = syncManager ?? SyncManager();

  /// واکشی اطلاعات جامع مالی (خلاصه وضعیت، تراکنش‌ها، نمودار درآمد هفتگی)
  /// با قابلیت کش محلی برای مواقع قطعی اینترنت
  Future<FinanceDataModel> getFinanceData() async {
    final bool hasNet = await _syncManager.hasInternet();

    if (hasNet) {
      try {
        final summaryRes =
            await _apiClient.dio.get('/api/v1/analytics/summary');
        final txRes = await _apiClient.dio.get('/api/v1/finance/transactions');
        final chartRes = await _apiClient.dio.get('/api/v1/finance/chart-data');

        final model = FinanceDataModel.fromApiData(
          summary: summaryRes.data is Map
              ? Map<String, dynamic>.from(summaryRes.data)
              : {},
          transactions:
              txRes.data is List ? (txRes.data as List<dynamic>) : [],
          chart: chartRes.data is Map
              ? Map<String, dynamic>.from(chartRes.data)
              : null,
          isFromCache: false,
        );

        // ذخیره نسخه پشتیبان آفلاین در حافظه پایدار گوشی
        await _saveFinanceDataToCache(model);

        return model;
      } catch (networkError) {
        debugPrint(
            "FinanceRepository: Online fetch failed ($networkError), falling back to offline cache.");
        return await _loadFinanceDataFromCache();
      }
    } else {
      debugPrint(
          "FinanceRepository: Device offline, loading cached financial data.");
      return await _loadFinanceDataFromCache();
    }
  }

  /// دریافت لیست قراردادهای فعال جهت ثبت پرداختی
  Future<List<Map<String, dynamic>>> getActiveContracts() async {
    try {
      final response = await _apiClient.dio.get('/api/v1/contracts/');
      if (response.data is List) {
        final contracts = (response.data as List<dynamic>)
            .map((c) => Map<String, dynamic>.from(c as Map))
            .where((c) => c['status'] == 'ACTIVE')
            .toList();
        return contracts;
      }
      return [];
    } catch (e) {
      debugPrint("FinanceRepository: Error loading active contracts: $e");
      return [];
    }
  }

  /// دریافت لیست ساختمان‌ها برای نگاشت نام پروژه‌ها
  Future<List<dynamic>> getBuildings() async {
    return await _apiClient.getBuildings();
  }

  /// دریافت سوابق تراکنش‌های یک قرارداد خاص
  Future<List<dynamic>> getContractPayments(String contractId) async {
    try {
      final response = await _apiClient.dio.get('/api/v1/finance/contract/$contractId');
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (e) {
      debugPrint("FinanceRepository: Error loading contract payments: $e");
      rethrow;
    }
  }

  /// ثبت پرداختی جدید و کسر از بدهی قرارداد
  Future<bool> submitPayment({
    required String contractId,
    required double amountInRial,
    required String paymentMethod,
    String? trackingCode,
    String? description,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/v1/finance/',
        data: {
          "contract_id": contractId,
          "amount": amountInRial,
          "payment_method": paymentMethod,
          if (trackingCode != null && trackingCode.isNotEmpty)
            "tracking_code": trackingCode.trim(),
          if (description != null && description.isNotEmpty)
            "description": description.trim(),
        },
      );

      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      debugPrint("FinanceRepository: Error submitting payment: $e");
      rethrow;
    }
  }

  /// ایجاد فایل استاندارد CSV با کاراکتر BOM برای سازگاری کامل اکسل با زبان فارسی
  Future<String> exportCsvFile(
      List<Map<String, dynamic>> transactions) async {
    try {
      String csvContent = '\uFEFF';
      csvContent +=
          "شناسه تراکنش,نام کارفرما,ساختمان,مبلغ (تومان),روش پرداخت,تاریخ,کد پیگیری\n";

      for (var tx in transactions) {
        final double amountRial =
            double.tryParse(tx['amount']?.toString() ?? '0') ?? 0;
        final String amountToman = (amountRial / 10).toInt().toString();
        final String date = AppFormatters.toShamsi(tx['payment_date']);
        final String method = tx['payment_method'] == 'CASH'
            ? 'نقدی'
            : (tx['payment_method'] == 'CHECK' ? 'چک' : 'واریز');

        csvContent +=
            '"${tx['id'] ?? '-'}","${tx['employer_name'] ?? '-'}","${tx['building_name'] ?? '-'}","$amountToman","$method","$date","${tx['tracking_code'] ?? '-'}"\n';
      }

      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/Financial_Report.csv';
      final file = File(filePath);
      await file.writeAsString(csvContent, encoding: utf8);

      return filePath;
    } catch (e) {
      debugPrint("FinanceRepository: Error exporting CSV: $e");
      rethrow;
    }
  }

  /// ذخیره داده‌های مالی در کش محلی
  Future<void> _saveFinanceDataToCache(FinanceDataModel model) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = jsonEncode(model.toJson());
      await prefs.setString(_cachedFinanceKey, jsonString);
    } catch (e) {
      debugPrint("FinanceRepository: Failed to save finance cache: $e");
    }
  }

  /// بازیابی داده‌های مالی از کش محلی
  Future<FinanceDataModel> _loadFinanceDataFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_cachedFinanceKey);

      if (jsonString != null && jsonString.isNotEmpty) {
        final Map<String, dynamic> decoded = jsonDecode(jsonString);
        return FinanceDataModel.fromJson(decoded, isFromCache: true);
      }
    } catch (e) {
      debugPrint("FinanceRepository: Failed to read finance cache: $e");
    }

    throw Exception("عدم دسترسی به شبکه و نبود داده‌های مالی از قبل ذخیره‌شده.");
  }
}
