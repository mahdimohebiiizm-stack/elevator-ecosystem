import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/breakdown_report_repository.dart';
import '../models/service_report_request.dart';
import '../models/checklist_item_model.dart';
import 'breakdown_report_event.dart';
import 'breakdown_report_state.dart';

/// موتور مدیریت وضعیت BLoC برای فرم گزارش خرابی و تعمیرات اضطراری (BM)
/// تفکیک منطق ثبت علت‌ها، اقدامات، نظرات، قطعات، رسانه‌ها و ارسال نهایی
class BreakdownReportBloc
    extends Bloc<BreakdownReportEvent, BreakdownReportState> {
  final BreakdownReportRepository _repository;

  BreakdownReportBloc({BreakdownReportRepository? repository})
      : _repository = repository ?? BreakdownReportRepository(),
        super(const BreakdownReportInitial()) {
    on<BreakdownReportInitRequested>(_onInitRequested);
    on<BreakdownDispatchReasonChanged>(_onDispatchReasonChanged);
    on<BreakdownArrivalStatusChanged>(_onArrivalStatusChanged);
    on<BreakdownCauseChanged>(_onCauseChanged);
    on<BreakdownActionChanged>(_onActionChanged);
    on<BreakdownProjectStatusChanged>(_onProjectStatusChanged);
    on<BreakdownDescriptionChanged>(_onDescriptionChanged);
    on<BreakdownEmployerCommentsChanged>(_onEmployerCommentsChanged);
    on<BreakdownPartAdded>(_onPartAdded);
    on<BreakdownPartRemoved>(_onPartRemoved);
    on<BreakdownMediaAdded>(_onMediaAdded);
    on<BreakdownMediaRemoved>(_onMediaRemoved);
    on<BreakdownSubmitRequested>(_onSubmitRequested);
    on<BreakdownSubmissionResetRequested>(_onSubmissionResetRequested);
  }

  void _onInitRequested(
    BreakdownReportInitRequested event,
    Emitter<BreakdownReportState> emit,
  ) {
    emit(const BreakdownReportLoading());
    emit(BreakdownReportLoaded(
      elevatorId: event.elevatorId,
      buildingName: event.buildingName,
    ));
  }

  void _onDispatchReasonChanged(
    BreakdownDispatchReasonChanged event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;
    emit(currentState.copyWith(selectedDispatchReason: event.reason));
  }

  void _onArrivalStatusChanged(
    BreakdownArrivalStatusChanged event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;
    emit(currentState.copyWith(selectedArrivalStatus: event.status));
  }

  void _onCauseChanged(
    BreakdownCauseChanged event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;
    emit(currentState.copyWith(selectedCause: event.cause));
  }

  void _onActionChanged(
    BreakdownActionChanged event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;
    emit(currentState.copyWith(selectedAction: event.action));
  }

  void _onProjectStatusChanged(
    BreakdownProjectStatusChanged event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;
    emit(currentState.copyWith(selectedProjectStatus: event.status));
  }

  void _onDescriptionChanged(
    BreakdownDescriptionChanged event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;
    emit(currentState.copyWith(description: event.description));
  }

  void _onEmployerCommentsChanged(
    BreakdownEmployerCommentsChanged event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;
    emit(currentState.copyWith(employerComments: event.comments));
  }

  void _onPartAdded(
    BreakdownPartAdded event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;

    final newPart = ReportPartItem(
      name: event.partName,
      qty: event.quantity,
      action: event.actionType,
    );

    emit(currentState.copyWith(
      addedParts: [...currentState.addedParts, newPart],
    ));
  }

  void _onPartRemoved(
    BreakdownPartRemoved event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;

    if (event.index >= 0 && event.index < currentState.addedParts.length) {
      final updatedParts = List<ReportPartItem>.from(currentState.addedParts)
        ..removeAt(event.index);
      emit(currentState.copyWith(addedParts: updatedParts));
    }
  }

  Future<void> _onMediaAdded(
    BreakdownMediaAdded event,
    Emitter<BreakdownReportState> emit,
  ) async {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;

    final String compressedPath =
        await _repository.compressImage(event.filePath);

    emit(currentState.copyWith(
      addedMediaPaths: [...currentState.addedMediaPaths, compressedPath],
    ));
  }

  void _onMediaRemoved(
    BreakdownMediaRemoved event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;

    if (event.index >= 0 && event.index < currentState.addedMediaPaths.length) {
      final updatedMedia = List<String>.from(currentState.addedMediaPaths)
        ..removeAt(event.index);
      emit(currentState.copyWith(addedMediaPaths: updatedMedia));
    }
  }

  Future<void> _onSubmitRequested(
    BreakdownSubmitRequested event,
    Emitter<BreakdownReportState> emit,
  ) async {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;

    if (!currentState.isRequiredFieldsValid) {
      emit(currentState.copyWith(
        submissionStatus: BreakdownSubmissionStatus.failure,
        errorMessage: "لطفاً تمام بخش‌های ستاره‌دار (*) فرم را انتخاب کنید.",
      ));
      return;
    }

    try {
      emit(currentState.copyWith(
        submissionStatus: BreakdownSubmissionStatus.inProgress,
        submissionLoadingMessage: "در حال دریافت موقعیت مکانی...",
      ));

      final position = await _repository.getCurrentLocation();

      emit(currentState.copyWith(
        submissionStatus: BreakdownSubmissionStatus.inProgress,
        submissionLoadingMessage: "در حال پردازش داده‌ها...",
      ));

      final List<ReportPart> formattedParts =
          currentState.addedParts.map((p) => p.toReportPart()).toList();

      final request = ServiceReportRequest(
        elevatorId: currentState.elevatorId,
        isEmergency: true,
        techLat: position?.latitude,
        techLng: position?.longitude,
        bmDispatchReason: BreakdownReportRepository
            .dispatchReasons[currentState.selectedDispatchReason],
        bmArrivalStatus: BreakdownReportRepository
            .arrivalStatuses[currentState.selectedArrivalStatus],
        bmCause: BreakdownReportRepository
            .causes[currentState.selectedCause],
        bmAction: BreakdownReportRepository
            .actions[currentState.selectedAction],
        projectStatus: BreakdownReportRepository
            .projectStatuses[currentState.selectedProjectStatus],
        description: (event.description ?? currentState.description).trim(),
        employerComments:
            (event.employerComments ?? currentState.employerComments).trim(),
        partsUsed: formattedParts,
      );

      emit(currentState.copyWith(
        submissionStatus: BreakdownSubmissionStatus.inProgress,
        submissionLoadingMessage: "در حال ارسال به سرور...",
      ));

      final result = await _repository.submitBreakdownReport(
        request: request,
        mediaFilePaths: currentState.addedMediaPaths,
      );

      if (result.isSuccess) {
        emit(currentState.copyWith(
          submissionStatus: BreakdownSubmissionStatus.success,
          submissionResultMessage: result.message,
          isOfflineSaved: result.isOfflineSaved,
          submissionLoadingMessage: "ارسال نهایی به سرور",
        ));
      } else {
        emit(currentState.copyWith(
          submissionStatus: BreakdownSubmissionStatus.failure,
          errorMessage: result.message,
          submissionLoadingMessage: "ارسال نهایی به سرور",
        ));
      }
    } catch (e) {
      emit(currentState.copyWith(
        submissionStatus: BreakdownSubmissionStatus.failure,
        errorMessage: "خطا در پردازش و ثبت گزارش خرابی: $e",
        submissionLoadingMessage: "ارسال نهایی به سرور",
      ));
    }
  }

  void _onSubmissionResetRequested(
    BreakdownSubmissionResetRequested event,
    Emitter<BreakdownReportState> emit,
  ) {
    if (state is! BreakdownReportLoaded) return;
    final currentState = state as BreakdownReportLoaded;

    emit(currentState.copyWith(
      submissionStatus: BreakdownSubmissionStatus.initial,
      submissionResultMessage: null,
      errorMessage: null,
      submissionLoadingMessage: "ارسال نهایی به سرور",
    ));
  }
}
