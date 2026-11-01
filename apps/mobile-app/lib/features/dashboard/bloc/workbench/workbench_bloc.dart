import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/workbench_repository.dart';
import 'workbench_event.dart';
import 'workbench_state.dart';

export 'workbench_event.dart';
export 'workbench_state.dart';

/// موتور مدیریت منطق تجاری میز کار عملیاتی تکنسین‌ها
/// مدیریت استیت تسک‌ها، سینک آفلاین، اعلانات و ساختمان‌ها
class WorkbenchBloc extends Bloc<WorkbenchEvent, WorkbenchState> {
  final WorkbenchRepository _repository;

  WorkbenchBloc({WorkbenchRepository? repository})
      : _repository = repository ?? WorkbenchRepository(),
        super(const WorkbenchInitial()) {
    on<WorkbenchFetchDataRequested>(_onFetchDataRequested);
    on<WorkbenchRefreshRequested>(_onRefreshRequested);
    on<WorkbenchSyncRequested>(_onSyncRequested);
    on<WorkbenchSubmitExplanationRequested>(_onSubmitExplanationRequested);
    on<WorkbenchOfflineCountUpdated>(_onOfflineCountUpdated);
  }

  /// بارگذاری همزمان اطلاعات اولیه میز کار
  Future<void> _onFetchDataRequested(
    WorkbenchFetchDataRequested event,
    Emitter<WorkbenchState> emit,
  ) async {
    final bool isInitial = state is! WorkbenchLoaded;
    if (isInitial) {
      emit(const WorkbenchLoading());
    }

    try {
      final tasksFuture = _repository.getTodayTasks();
      final buildingsFuture = _repository.getAllBuildings();
      final offlineCountFuture = _repository.getOfflineReportsCount();
      final notificationsFuture = (event.userRole == 'ADMIN' || event.userRole == 'MANAGER')
          ? _repository.getOverdueNotifications()
          : Future.value(<Map<String, dynamic>>[]);

      final results = await Future.wait([
        tasksFuture,
        buildingsFuture,
        offlineCountFuture,
        notificationsFuture,
      ]);

      emit(WorkbenchLoaded(
        tasks: results[0] as List<Map<String, dynamic>>,
        buildings: results[1] as List<Map<String, dynamic>>,
        offlineReportsCount: results[2] as int,
        overdueNotifications: results[3] as List<Map<String, dynamic>>,
        userRole: event.userRole,
      ));
    } catch (e) {
      final String errorMessage = e.toString().replaceAll("Exception: ", "");
      emit(WorkbenchError(errorMessage: errorMessage));
    }
  }

  /// بازخوانی اطلاعات بدون مسدود کردن کل صفحه
  Future<void> _onRefreshRequested(
    WorkbenchRefreshRequested event,
    Emitter<WorkbenchState> emit,
  ) async {
    try {
      final tasksFuture = _repository.getTodayTasks();
      final buildingsFuture = _repository.getAllBuildings();
      final offlineCountFuture = _repository.getOfflineReportsCount();
      final notificationsFuture = (event.userRole == 'ADMIN' || event.userRole == 'MANAGER')
          ? _repository.getOverdueNotifications()
          : Future.value(<Map<String, dynamic>>[]);

      final results = await Future.wait([
        tasksFuture,
        buildingsFuture,
        offlineCountFuture,
        notificationsFuture,
      ]);

      final updatedTasks = results[0] as List<Map<String, dynamic>>;
      final updatedBuildings = results[1] as List<Map<String, dynamic>>;
      final updatedOfflineCount = results[2] as int;
      final updatedNotifications = results[3] as List<Map<String, dynamic>>;

      if (state is WorkbenchLoaded) {
        emit((state as WorkbenchLoaded).copyWith(
          tasks: updatedTasks,
          buildings: updatedBuildings,
          offlineReportsCount: updatedOfflineCount,
          overdueNotifications: updatedNotifications,
          userRole: event.userRole,
        ));
      } else {
        emit(WorkbenchLoaded(
          tasks: updatedTasks,
          buildings: updatedBuildings,
          offlineReportsCount: updatedOfflineCount,
          overdueNotifications: updatedNotifications,
          userRole: event.userRole,
        ));
      }
    } catch (e) {
      final String errorMessage = e.toString().replaceAll("Exception: ", "");
      if (state is! WorkbenchLoaded) {
        emit(WorkbenchError(errorMessage: errorMessage));
      }
    }
  }

  /// مدیریت صف و همگام‌سازی گزارش‌های آفلاین با سرور
  Future<void> _onSyncRequested(
    WorkbenchSyncRequested event,
    Emitter<WorkbenchState> emit,
  ) async {
    if (state is! WorkbenchLoaded) return;
    final currentState = state as WorkbenchLoaded;

    if (currentState.offlineReportsCount == 0 || currentState.isSyncing) return;

    emit(currentState.copyWith(isSyncing: true, syncResultMessage: null));

    try {
      final int synced = await _repository.syncOfflineReports();
      final int remaining = await _repository.getOfflineReportsCount();

      if (synced > 0) {
        emit(currentState.copyWith(
          isSyncing: false,
          offlineReportsCount: remaining,
          syncResultMessage: "$synced گزارش آفلاین با موفقیت به سرور ارسال شد!",
          syncSuccess: true,
        ));
      } else {
        emit(currentState.copyWith(
          isSyncing: false,
          offlineReportsCount: remaining,
          syncResultMessage: "ارتباط با سرور برقرار نشد. گزارش‌ها در صف باقی ماندند.",
          syncSuccess: false,
        ));
      }
    } catch (e) {
      final int remaining = await _repository.getOfflineReportsCount();
      emit(currentState.copyWith(
        isSyncing: false,
        offlineReportsCount: remaining,
        syncResultMessage: "خطا در فرآیند همگام‌سازی",
        syncSuccess: false,
      ));
    }
  }

  /// ثبت توضیحات عدم انجام ماموریت
  Future<void> _onSubmitExplanationRequested(
    WorkbenchSubmitExplanationRequested event,
    Emitter<WorkbenchState> emit,
  ) async {
    try {
      await _repository.submitTaskExplanation(event.assignmentId, event.explanation);
      final List<Map<String, dynamic>> updatedTasks = await _repository.getTodayTasks();

      if (state is WorkbenchLoaded) {
        emit((state as WorkbenchLoaded).copyWith(
          tasks: updatedTasks,
          actionFeedbackMessage: "توضیحات با موفقیت ثبت شد.",
        ));
      }
    } catch (e) {
      final String errorMessage = e.toString().replaceAll("Exception: ", "");
      if (state is WorkbenchLoaded) {
        emit((state as WorkbenchLoaded).copyWith(
          actionFeedbackMessage: "خطا در ثبت توضیحات: $errorMessage",
        ));
      }
    }
  }

  /// به‌روزرسانی لحظه‌ای تعداد گزارش‌های منتظر ارسال در صف آفلاین
  void _onOfflineCountUpdated(
    WorkbenchOfflineCountUpdated event,
    Emitter<WorkbenchState> emit,
  ) {
    if (state is WorkbenchLoaded) {
      emit((state as WorkbenchLoaded).copyWith(offlineReportsCount: event.count));
    }
  }
}
