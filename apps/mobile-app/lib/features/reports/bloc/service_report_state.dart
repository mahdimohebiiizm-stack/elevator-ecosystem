import 'package:equatable/equatable.dart';
import '../models/checklist_item_model.dart';

/// وضعیت مرحله ارسال گزارش
enum ReportSubmissionStatus {
  initial,
  inProgress,
  success,
  failure,
}

/// کلاس پایه وضعیت‌های ماژول گزارش سرویس آسانسور
abstract class ServiceReportState extends Equatable {
  const ServiceReportState();

  @override
  List<Object?> get props => [];
}

/// وضعیت اولیه و مقداردهی نشده فرم
class ServiceReportInitial extends ServiceReportState {
  const ServiceReportInitial();
}

/// وضعیت در حال بارگذاری اولیه ساختار چک‌لیست
class ServiceReportLoading extends ServiceReportState {
  const ServiceReportLoading();
}

/// وضعیت فعال و داده‌دار گزارش سرویس که تمام تغییرات زنده فرم را نگهداری می‌کند
class ServiceReportLoaded extends ServiceReportState {
  final String elevatorId;
  final String buildingName;
  final List<ChecklistCategoryModel> categories;
  final int totalItems;
  final int completedItems;
  final List<ReportPartItem> addedParts;
  final List<ReportMediaItem> addedMedia;
  final ReportSubmissionStatus submissionStatus;
  final String submissionLoadingMessage;
  final String? submissionResultMessage;
  final bool isOfflineSaved;
  final String? errorMessage;

  const ServiceReportLoaded({
    required this.elevatorId,
    required this.buildingName,
    required this.categories,
    this.totalItems = 25,
    this.completedItems = 0,
    this.addedParts = const [],
    this.addedMedia = const [],
    this.submissionStatus = ReportSubmissionStatus.initial,
    this.submissionLoadingMessage = "ارسال نهایی به سرور",
    this.submissionResultMessage,
    this.isOfflineSaved = false,
    this.errorMessage,
  });

  /// آیا تمامی آیتم‌های ۲۵ گانه چک‌لیست بررسی شده‌اند؟
  bool get isAllItemsChecked => completedItems == totalItems;

  /// تعداد آیتم‌های باقی‌مانده که هنوز بررسی نشده‌اند
  int get remainingItemsCount => (totalItems - completedItems).clamp(0, totalItems);

  /// درصد پیشرفت تکمیل فرم به صورت اعشاری بین ۰ تا ۱
  double get progressPercent => totalItems == 0 ? 0.0 : (completedItems / totalItems);

  /// لیست خطی تمام آیتم‌های ۲۵ گانه جهت ارسال به سرور
  List<ChecklistItemModel> get allItems => categories.expand((c) => c.items).toList();

  /// لیست آیتم‌هایی که وضعیت نیازمند تعمیر یا دارای نقص دارند (جهت اتصال مستندات تصویری)
  List<ChecklistItemModel> get defectiveItems => allItems
      .where((i) => i.status == CheckStatus.NEEDS_REPAIR || i.status == CheckStatus.DEFECTIVE)
      .toList();

  ServiceReportLoaded copyWith({
    String? elevatorId,
    String? buildingName,
    List<ChecklistCategoryModel>? categories,
    int? totalItems,
    int? completedItems,
    List<ReportPartItem>? addedParts,
    List<ReportMediaItem>? addedMedia,
    ReportSubmissionStatus? submissionStatus,
    String? submissionLoadingMessage,
    String? submissionResultMessage,
    bool? isOfflineSaved,
    String? errorMessage,
  }) {
    return ServiceReportLoaded(
      elevatorId: elevatorId ?? this.elevatorId,
      buildingName: buildingName ?? this.buildingName,
      categories: categories ?? this.categories,
      totalItems: totalItems ?? this.totalItems,
      completedItems: completedItems ?? this.completedItems,
      addedParts: addedParts ?? this.addedParts,
      addedMedia: addedMedia ?? this.addedMedia,
      submissionStatus: submissionStatus ?? this.submissionStatus,
      submissionLoadingMessage: submissionLoadingMessage ?? this.submissionLoadingMessage,
      submissionResultMessage: submissionResultMessage,
      isOfflineSaved: isOfflineSaved ?? this.isOfflineSaved,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [
    elevatorId,
    buildingName,
    categories,
    totalItems,
    completedItems,
    addedParts,
    addedMedia,
    submissionStatus,
    submissionLoadingMessage,
    submissionResultMessage,
    isOfflineSaved,
    errorMessage,
  ];
}

/// وضعیت خطای غیرمنتظره در فرم گزارش
class ServiceReportError extends ServiceReportState {
  final String message;

  const ServiceReportError({required this.message});

  @override
  List<Object?> get props => [message];
}
