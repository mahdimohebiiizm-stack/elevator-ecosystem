import 'package:equatable/equatable.dart';
import '../models/checklist_item_model.dart';

/// وضعیت مراحل ارسال گزارش خرابی
enum BreakdownSubmissionStatus {
  initial,
  inProgress,
  success,
  failure,
}

/// کلاس پایه وضعیت‌های ماژول گزارش خرابی
abstract class BreakdownReportState extends Equatable {
  const BreakdownReportState();

  @override
  List<Object?> get props => [];
}

/// وضعیت اولیه فرم خرابی
class BreakdownReportInitial extends BreakdownReportState {
  const BreakdownReportInitial();
}

/// وضعیت در حال بارگذاری اولیه
class BreakdownReportLoading extends BreakdownReportState {
  const BreakdownReportLoading();
}

/// وضعیت فعال و نگه‌دارنده کل داده‌های فرم خرابی اضطراری
class BreakdownReportLoaded extends BreakdownReportState {
  final String elevatorId;
  final String buildingName;
  final String? selectedDispatchReason;
  final String? selectedArrivalStatus;
  final String? selectedCause;
  final String? selectedAction;
  final String? selectedProjectStatus;
  final String description;
  final String employerComments;
  final List<ReportPartItem> addedParts;
  final List<String> addedMediaPaths;
  final BreakdownSubmissionStatus submissionStatus;
  final String submissionLoadingMessage;
  final String? submissionResultMessage;
  final bool isOfflineSaved;
  final String? errorMessage;

  const BreakdownReportLoaded({
    required this.elevatorId,
    required this.buildingName,
    this.selectedDispatchReason,
    this.selectedArrivalStatus,
    this.selectedCause,
    this.selectedAction,
    this.selectedProjectStatus,
    this.description = '',
    this.employerComments = '',
    this.addedParts = const [],
    this.addedMediaPaths = const [],
    this.submissionStatus = BreakdownSubmissionStatus.initial,
    this.submissionLoadingMessage = "ارسال نهایی به سرور",
    this.submissionResultMessage,
    this.isOfflineSaved = false,
    this.errorMessage,
  });

  /// بررسی اینکه آیا تمامی فیلدهای ستاره‌دار اجباری انتخاب شده‌اند
  bool get isRequiredFieldsValid =>
      selectedDispatchReason != null &&
      selectedArrivalStatus != null &&
      selectedCause != null &&
      selectedAction != null &&
      selectedProjectStatus != null;

  BreakdownReportLoaded copyWith({
    String? elevatorId,
    String? buildingName,
    String? selectedDispatchReason,
    String? selectedArrivalStatus,
    String? selectedCause,
    String? selectedAction,
    String? selectedProjectStatus,
    String? description,
    String? employerComments,
    List<ReportPartItem>? addedParts,
    List<String>? addedMediaPaths,
    BreakdownSubmissionStatus? submissionStatus,
    String? submissionLoadingMessage,
    String? submissionResultMessage,
    bool? isOfflineSaved,
    String? errorMessage,
  }) {
    return BreakdownReportLoaded(
      elevatorId: elevatorId ?? this.elevatorId,
      buildingName: buildingName ?? this.buildingName,
      selectedDispatchReason:
          selectedDispatchReason ?? this.selectedDispatchReason,
      selectedArrivalStatus: selectedArrivalStatus ?? this.selectedArrivalStatus,
      selectedCause: selectedCause ?? this.selectedCause,
      selectedAction: selectedAction ?? this.selectedAction,
      selectedProjectStatus:
          selectedProjectStatus ?? this.selectedProjectStatus,
      description: description ?? this.description,
      employerComments: employerComments ?? this.employerComments,
      addedParts: addedParts ?? this.addedParts,
      addedMediaPaths: addedMediaPaths ?? this.addedMediaPaths,
      submissionStatus: submissionStatus ?? this.submissionStatus,
      submissionLoadingMessage:
          submissionLoadingMessage ?? this.submissionLoadingMessage,
      submissionResultMessage: submissionResultMessage,
      isOfflineSaved: isOfflineSaved ?? this.isOfflineSaved,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        elevatorId,
        buildingName,
        selectedDispatchReason,
        selectedArrivalStatus,
        selectedCause,
        selectedAction,
        selectedProjectStatus,
        description,
        employerComments,
        addedParts,
        addedMediaPaths,
        submissionStatus,
        submissionLoadingMessage,
        submissionResultMessage,
        isOfflineSaved,
        errorMessage,
      ];
}

/// وضعیت بروز خطای سیستمی در فرم خرابی
class BreakdownReportError extends BreakdownReportState {
  final String message;

  const BreakdownReportError({required this.message});

  @override
  List<Object?> get props => [message];
}
