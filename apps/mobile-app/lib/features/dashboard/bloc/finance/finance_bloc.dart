import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/finance_repository.dart';
import 'finance_event.dart';
import 'finance_state.dart';

/// موتور مدیریت وضعیت BLoC برای ماژول مالی و حسابداری
/// کنترل عملیات دریافت شاخص‌های مالی، استعلامات، کش آفلاین و ثبت پرداختی
class FinanceBloc extends Bloc<FinanceEvent, FinanceState> {
  final FinanceRepository _repository;

  FinanceBloc({FinanceRepository? repository})
      : _repository = repository ?? FinanceRepository(),
        super(const FinanceInitial()) {
    on<FinanceFetchRequested>(_onFetchRequested);
    on<FinanceRefreshRequested>(_onRefreshRequested);
    on<FinanceLoadActiveContractsRequested>(_onLoadActiveContractsRequested);
    on<FinanceSubmitPaymentRequested>(_onSubmitPaymentRequested);
    on<FinanceExportExcelRequested>(_onExportExcelRequested);
    on<FinanceResetPaymentStatusRequested>(_onResetPaymentStatusRequested);
  }

  Future<void> _onFetchRequested(
    FinanceFetchRequested event,
    Emitter<FinanceState> emit,
  ) async {
    if (state is! FinanceLoaded) {
      emit(const FinanceLoading());
    }

    try {
      final data = await _repository.getFinanceData();
      emit(FinanceLoaded(data: data));
    } catch (e) {
      emit(FinanceError(
        errorMessage: "خطا در بارگذاری اطلاعات مالی: $e",
      ));
    }
  }

  Future<void> _onRefreshRequested(
    FinanceRefreshRequested event,
    Emitter<FinanceState> emit,
  ) async {
    if (state is FinanceLoaded) {
      final currentState = state as FinanceLoaded;
      try {
        final data = await _repository.getFinanceData();
        emit(currentState.copyWith(data: data));
      } catch (e) {
        emit(currentState.copyWith(
          errorMessage: "خطا در به‌روزرسانی اطلاعات مالی: $e",
        ));
      }
    } else {
      await _onFetchRequested(const FinanceFetchRequested(), emit);
    }
  }

  Future<void> _onLoadActiveContractsRequested(
    FinanceLoadActiveContractsRequested event,
    Emitter<FinanceState> emit,
  ) async {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;

    emit(currentState.copyWith(
      paymentModalStatus: PaymentModalStatus.loadingContracts,
    ));

    try {
      final contracts = await _repository.getActiveContracts();
      emit(currentState.copyWith(
        paymentModalStatus: PaymentModalStatus.contractsLoaded,
        activeContracts: contracts,
      ));
    } catch (e) {
      emit(currentState.copyWith(
        paymentModalStatus: PaymentModalStatus.failure,
        errorMessage: "خطا در بارگذاری لیست قراردادها: $e",
      ));
    }
  }

  Future<void> _onSubmitPaymentRequested(
    FinanceSubmitPaymentRequested event,
    Emitter<FinanceState> emit,
  ) async {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;

    emit(currentState.copyWith(
      paymentModalStatus: PaymentModalStatus.submitting,
    ));

    try {
      final bool success = await _repository.submitPayment(
        contractId: event.contractId,
        amountInRial: event.amountInRial,
        paymentMethod: event.paymentMethod,
        trackingCode: event.trackingCode,
        description: event.description,
      );

      if (success) {
        // بازخوانی زنده داده‌های مالی پس از ثبت موفق پرداخت
        final refreshedData = await _repository.getFinanceData();
        emit(currentState.copyWith(
          data: refreshedData,
          paymentModalStatus: PaymentModalStatus.success,
          paymentResultMessage: "پرداختی با موفقیت ثبت شد.",
        ));
      } else {
        emit(currentState.copyWith(
          paymentModalStatus: PaymentModalStatus.failure,
          errorMessage: "پاسخ ناموفق از سرور در ثبت پرداختی.",
        ));
      }
    } catch (e) {
      emit(currentState.copyWith(
        paymentModalStatus: PaymentModalStatus.failure,
        errorMessage: "خطا در ثبت اطلاعات مالی: $e",
      ));
    }
  }

  Future<void> _onExportExcelRequested(
    FinanceExportExcelRequested event,
    Emitter<FinanceState> emit,
  ) async {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;

    emit(currentState.copyWith(isExportingExcel: true));

    try {
      final filePath =
          await _repository.exportCsvFile(currentState.data.transactions);
      emit(currentState.copyWith(
        isExportingExcel: false,
        excelFilePath: filePath,
      ));
    } catch (e) {
      emit(currentState.copyWith(
        isExportingExcel: false,
        errorMessage: "خطا در تولید فایل اکسل: $e",
      ));
    }
  }

  void _onResetPaymentStatusRequested(
    FinanceResetPaymentStatusRequested event,
    Emitter<FinanceState> emit,
  ) {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;

    emit(currentState.copyWith(
      paymentModalStatus: PaymentModalStatus.idle,
      paymentResultMessage: null,
      errorMessage: null,
      excelFilePath: null,
    ));
  }
}
