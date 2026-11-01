import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/service_report_repository.dart';
import '../models/service_report_request.dart';
import '../models/checklist_item_model.dart';
import 'service_report_event.dart';
import 'service_report_state.dart';

/// موتور مدیریت وضعیت BLoC برای فرم گزارش سرویس ماهانه آسانسور
/// تفکیک منطق چک‌لیست ۲۵ گانه، قطعات، رسانه‌ها و ارسال نهایی از رابط کاربری
class ServiceReportBloc extends Bloc<ServiceReportEvent, ServiceReportState> {
  final ServiceReportRepository _repository;

  ServiceReportBloc({ServiceReportRepository? repository})
      : _repository = repository ?? ServiceReportRepository(),
        super(const ServiceReportInitial()) {
    on<ServiceReportInitRequested>(_onInitRequested);
    on<ServiceReportItemStatusChanged>(_onItemStatusChanged);
    on<ServiceReportCategoryToggleRequested>(_onCategoryToggleRequested);
    on<ServiceReportPartAdded>(_onPartAdded);
    on<ServiceReportPartRemoved>(_onPartRemoved);
    on<ServiceReportMediaAdded>(_onMediaAdded);
    on<ServiceReportMediaRemoved>(_onMediaRemoved);
    on<ServiceReportSubmitRequested>(_onSubmitRequested);
    on<ServiceReportSubmissionResetRequested>(_onSubmissionResetRequested);
  }

  /// مقداردهی اولیه ساختار فرم با ۲۵ آیتم استاندارد در ۳ دسته‌بندی
  void _onInitRequested(
    ServiceReportInitRequested event,
    Emitter<ServiceReportState> emit,
  ) {
    emit(const ServiceReportLoading());
    final categories = _repository.getDefaultCategories();
    emit(ServiceReportLoaded(
      elevatorId: event.elevatorId,
      buildingName: event.buildingName,
      categories: categories,
      totalItems: 25,
      completedItems: 0,
    ));
  }

  /// به‌روزرسانی وضعیت آیتم چک‌لیست و باز کردن هوشمند دسته‌بندی بعدی در صورت تکمیل
  void _onItemStatusChanged(
    ServiceReportItemStatusChanged event,
    Emitter<ServiceReportState> emit,
  ) {
    if (state is! ServiceReportLoaded) return;
    final currentState = state as ServiceReportLoaded;

    final List<ChecklistCategoryModel> updatedCategories = [];
    for (int i = 0; i < currentState.categories.length; i++) {
      final category = currentState.categories[i];
      if (i == event.categoryIndex) {
        final List<ChecklistItemModel> updatedItems = category.items.map((item) {
          if (item.keyName == event.keyName) {
            return item.copyWith(status: event.status);
          }
          return item;
        }).toList();

        updatedCategories.add(category.copyWith(items: updatedItems));
      } else {
        updatedCategories.add(category);
      }
    }

    // محاسبه مجدد تعداد آیتم‌های تکمیل‌شده
    int count = 0;
    for (final cat in updatedCategories) {
      for (final item in cat.items) {
        if (item.status != CheckStatus.NOT_CHECKED) {
          count++;
        }
      }
    }

    // بررسی اتمام دسته‌بندی جاری برای باز کردن آکاردئون بعدی
    final currentCat = updatedCategories[event.categoryIndex];
    final bool isCatComplete =
        currentCat.items.every((element) => element.status != CheckStatus.NOT_CHECKED);

    List<ChecklistCategoryModel> finalCategories = updatedCategories;
    if (isCatComplete && event.categoryIndex < updatedCategories.length - 1) {
      finalCategories = [];
      for (int i = 0; i < updatedCategories.length; i++) {
        if (i == event.categoryIndex) {
          finalCategories.add(updatedCategories[i].copyWith(isExpanded: false));
        } else if (i == event.categoryIndex + 1) {
          finalCategories.add(updatedCategories[i].copyWith(isExpanded: true));
        } else {
          finalCategories.add(updatedCategories[i]);
        }
      }
    }

    emit(currentState.copyWith(
      categories: finalCategories,
      completedItems: count,
    ));
  }

  /// جابجایی وضعیت باز/بسته بودن دسته‌بندی
  void _onCategoryToggleRequested(
    ServiceReportCategoryToggleRequested event,
    Emitter<ServiceReportState> emit,
  ) {
    if (state is! ServiceReportLoaded) return;
    final currentState = state as ServiceReportLoaded;

    final List<ChecklistCategoryModel> updatedCategories = [];
    for (int i = 0; i < currentState.categories.length; i++) {
      final category = currentState.categories[i];
      if (i == event.categoryIndex) {
        updatedCategories.add(category.copyWith(isExpanded: !category.isExpanded));
      } else {
        updatedCategories.add(category);
      }
    }

    emit(currentState.copyWith(categories: updatedCategories));
  }

  /// افزودن قطعه مصرفی به فرم
  void _onPartAdded(
    ServiceReportPartAdded event,
    Emitter<ServiceReportState> emit,
  ) {
    if (state is! ServiceReportLoaded) return;
    final currentState = state as ServiceReportLoaded;

    final newPart = ReportPartItem(
      name: event.partName,
      qty: event.quantity,
      action: event.actionType,
    );

    emit(currentState.copyWith(
      addedParts: [...currentState.addedParts, newPart],
    ));
  }

  /// حذف قطعه از فرم
  void _onPartRemoved(
    ServiceReportPartRemoved event,
    Emitter<ServiceReportState> emit,
  ) {
    if (state is! ServiceReportLoaded) return;
    final currentState = state as ServiceReportLoaded;

    if (event.index >= 0 && event.index < currentState.addedParts.length) {
      final updatedParts = List<ReportPartItem>.from(currentState.addedParts)
        ..removeAt(event.index);
      emit(currentState.copyWith(addedParts: updatedParts));
    }
  }

  /// فشرده‌سازی و اضافه کردن عکس مستندات
  Future<void> _onMediaAdded(
    ServiceReportMediaAdded event,
    Emitter<ServiceReportState> emit,
  ) async {
    if (state is! ServiceReportLoaded) return;
    final currentState = state as ServiceReportLoaded;

    final String compressedPath = await _repository.compressImage(event.filePath);

    final newMedia = ReportMediaItem(
      filePath: compressedPath,
      relatedToKey: event.relatedToKey,
      relatedToTitle: event.relatedToTitle,
    );

    emit(currentState.copyWith(
      addedMedia: [...currentState.addedMedia, newMedia],
    ));
  }

  /// حذف عکس مستندات از فرم
  void _onMediaRemoved(
    ServiceReportMediaRemoved event,
    Emitter<ServiceReportState> emit,
  ) {
    if (state is! ServiceReportLoaded) return;
    final currentState = state as ServiceReportLoaded;

    if (event.index >= 0 && event.index < currentState.addedMedia.length) {
      final updatedMedia = List<ReportMediaItem>.from(currentState.addedMedia)
        ..removeAt(event.index);
      emit(currentState.copyWith(addedMedia: updatedMedia));
    }
  }

  /// ارسال نهایی گزارش سرویس به سرور یا صف آفلاین
  Future<void> _onSubmitRequested(
    ServiceReportSubmitRequested event,
    Emitter<ServiceReportState> emit,
  ) async {
    if (state is! ServiceReportLoaded) return;
    final currentState = state as ServiceReportLoaded;

    try {
      emit(currentState.copyWith(
        submissionStatus: ReportSubmissionStatus.inProgress,
        submissionLoadingMessage: "در حال دریافت موقعیت مکانی...",
      ));

      final position = await _repository.getCurrentLocation();

      emit(currentState.copyWith(
        submissionStatus: ReportSubmissionStatus.inProgress,
        submissionLoadingMessage: "در حال پردازش داده‌ها...",
      ));

      final Map<String, String> formattedChecklist = {};
      for (final item in currentState.allItems) {
        String statusStr;
        switch (item.status) {
          case CheckStatus.OK:
            statusStr = "OK";
            break;
          case CheckStatus.NEEDS_REPAIR:
            statusStr = "NEEDS_REPAIR";
            break;
          case CheckStatus.DEFECTIVE:
            statusStr = "DEFECTIVE";
            break;
          case CheckStatus.NOT_CHECKED:
            statusStr = "NOT_CHECKED";
            break;
        }
        formattedChecklist[item.keyName] = statusStr;
      }

      final List<ReportPart> formattedParts =
          currentState.addedParts.map((p) => p.toReportPart()).toList();

      final List<String> filePaths =
          currentState.addedMedia.map((m) => m.filePath).toList();

      final request = ServiceReportRequest(
        elevatorId: event.elevatorId,
        checklist: formattedChecklist,
        partsUsed: formattedParts,
        techLat: position?.latitude,
        techLng: position?.longitude,
        description: event.description,
        isEmergency: false,
      );

      emit(currentState.copyWith(
        submissionStatus: ReportSubmissionStatus.inProgress,
        submissionLoadingMessage: "در حال ارسال به سرور...",
      ));

      final result = await _repository.submitReport(
        request: request,
        mediaFilePaths: filePaths,
      );

      if (result.isSuccess) {
        emit(currentState.copyWith(
          submissionStatus: ReportSubmissionStatus.success,
          submissionResultMessage: result.message,
          isOfflineSaved: result.isOfflineSaved,
          submissionLoadingMessage: "ارسال نهایی به سرور",
        ));
      } else {
        emit(currentState.copyWith(
          submissionStatus: ReportSubmissionStatus.failure,
          errorMessage: result.message,
          submissionLoadingMessage: "ارسال نهایی به سرور",
        ));
      }
    } catch (e) {
      emit(currentState.copyWith(
        submissionStatus: ReportSubmissionStatus.failure,
        errorMessage: "خطا در پردازش و ثبت گزارش: $e",
        submissionLoadingMessage: "ارسال نهایی به سرور",
      ));
    }
  }

  /// ریست وضعیت ارسال جهت آماده‌سازی فرم
  void _onSubmissionResetRequested(
    ServiceReportSubmissionResetRequested event,
    Emitter<ServiceReportState> emit,
  ) {
    if (state is! ServiceReportLoaded) return;
    final currentState = state as ServiceReportLoaded;

    emit(currentState.copyWith(
      submissionStatus: ReportSubmissionStatus.initial,
      submissionResultMessage: null,
      errorMessage: null,
      submissionLoadingMessage: "ارسال نهایی به سرور",
    ));
  }
}
