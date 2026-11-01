import 'package:equatable/equatable.dart';
import '../../data/finance_repository.dart';

/// وضعیت مودال ثبت پرداختی جدید
enum PaymentModalStatus {
  idle,
  loadingContracts,
  contractsLoaded,
  submitting,
  success,
  failure,
}

/// کلاس پایه وضعیت‌های ماژول مالی
abstract class FinanceState extends Equatable {
  const FinanceState();

  @override
  List<Object?> get props => [];
}

/// وضعیت اولیه ماژول مالی
class FinanceInitial extends FinanceState {
  const FinanceInitial();
}

/// وضعیت در حال واکشی اولیه اطلاعات مالی
class FinanceLoading extends FinanceState {
  const FinanceLoading();
}

/// وضعیت داده‌های مالی بارگذاری‌شده و فعال
class FinanceLoaded extends FinanceState {
  final FinanceDataModel data;
  final List<Map<String, dynamic>> activeContracts;
  final PaymentModalStatus paymentModalStatus;
  final String? paymentResultMessage;
  final bool isExportingExcel;
  final String? excelFilePath;
  final String? errorMessage;

  const FinanceLoaded({
    required this.data,
    this.activeContracts = const [],
    this.paymentModalStatus = PaymentModalStatus.idle,
    this.paymentResultMessage,
    this.isExportingExcel = false,
    this.excelFilePath,
    this.errorMessage,
  });

  FinanceLoaded copyWith({
    FinanceDataModel? data,
    List<Map<String, dynamic>>? activeContracts,
    PaymentModalStatus? paymentModalStatus,
    String? paymentResultMessage,
    bool? isExportingExcel,
    String? excelFilePath,
    String? errorMessage,
  }) {
    return FinanceLoaded(
      data: data ?? this.data,
      activeContracts: activeContracts ?? this.activeContracts,
      paymentModalStatus: paymentModalStatus ?? this.paymentModalStatus,
      paymentResultMessage: paymentResultMessage,
      isExportingExcel: isExportingExcel ?? this.isExportingExcel,
      excelFilePath: excelFilePath,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        data,
        activeContracts,
        paymentModalStatus,
        paymentResultMessage,
        isExportingExcel,
        excelFilePath,
        errorMessage,
      ];
}

/// وضعیت بروز خطای غیرقابل جبران در واکشی داده‌های مالی
class FinanceError extends FinanceState {
  final String errorMessage;
  final FinanceDataModel? cachedData;

  const FinanceError({
    required this.errorMessage,
    this.cachedData,
  });

  @override
  List<Object?> get props => [errorMessage, cachedData];
}
