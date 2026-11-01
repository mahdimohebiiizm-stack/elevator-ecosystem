import 'package:equatable/equatable.dart';

/// کلاس پایه رویدادهای ماژول مالی و حسابداری
abstract class FinanceEvent extends Equatable {
  const FinanceEvent();

  @override
  List<Object?> get props => [];
}

/// درخواست واکشی داده‌های مالی و داشبورد
class FinanceFetchRequested extends FinanceEvent {
  const FinanceFetchRequested();
}

/// درخواست بازخوانی داده‌های مالی (Pull-to-Refresh)
class FinanceRefreshRequested extends FinanceEvent {
  const FinanceRefreshRequested();
}

/// درخواست بارگذاری لیست قراردادهای فعال جهت انتخاب در مودال پرداختی
class FinanceLoadActiveContractsRequested extends FinanceEvent {
  const FinanceLoadActiveContractsRequested();
}

/// درخواست ثبت پرداخت جدید
class FinanceSubmitPaymentRequested extends FinanceEvent {
  final String contractId;
  final double amountInRial;
  final String paymentMethod;
  final String? trackingCode;
  final String? description;

  const FinanceSubmitPaymentRequested({
    required this.contractId,
    required this.amountInRial,
    required this.paymentMethod,
    this.trackingCode,
    this.description,
  });

  @override
  List<Object?> get props => [
        contractId,
        amountInRial,
        paymentMethod,
        trackingCode,
        description,
      ];
}

/// درخواست تولید و آماده‌سازی فایل خروجی اکسل/CSV
class FinanceExportExcelRequested extends FinanceEvent {
  const FinanceExportExcelRequested();
}

/// بازنشانی وضعیت عملیات ثبت پرداخت
class FinanceResetPaymentStatusRequested extends FinanceEvent {
  const FinanceResetPaymentStatusRequested();
}
