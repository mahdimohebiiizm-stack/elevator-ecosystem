import 'package:equatable/equatable.dart';

/// کلاس پایه رویدادهای ماژول گزارش خرابی و تعمیرات اضطراری (BM)
abstract class BreakdownReportEvent extends Equatable {
  const BreakdownReportEvent();

  @override
  List<Object?> get props => [];
}

/// مقداردهی اولیه اطلاعات آسانسور و ساختمان در فرم خرابی
class BreakdownReportInitRequested extends BreakdownReportEvent {
  final String elevatorId;
  final String buildingName;

  const BreakdownReportInitRequested({
    required this.elevatorId,
    required this.buildingName,
  });

  @override
  List<Object?> get props => [elevatorId, buildingName];
}

/// تغییر انتخاب علت مراجعه تکنسین
class BreakdownDispatchReasonChanged extends BreakdownReportEvent {
  final String reason;

  const BreakdownDispatchReasonChanged(this.reason);

  @override
  List<Object?> get props => [reason];
}

/// تغییر انتخاب وضعیت آسانسور هنگام مراجعه
class BreakdownArrivalStatusChanged extends BreakdownReportEvent {
  final String status;

  const BreakdownArrivalStatusChanged(this.status);

  @override
  List<Object?> get props => [status];
}

/// تغییر انتخاب علت اصلی خرابی
class BreakdownCauseChanged extends BreakdownReportEvent {
  final String cause;

  const BreakdownCauseChanged(this.cause);

  @override
  List<Object?> get props => [cause];
}

/// تغییر انتخاب اقدام انجام‌شده برای رفع خرابی
class BreakdownActionChanged extends BreakdownReportEvent {
  final String action;

  const BreakdownActionChanged(this.action);

  @override
  List<Object?> get props => [action];
}

/// تغییر انتخاب وضعیت آسانسور هنگام ترک پروژه
class BreakdownProjectStatusChanged extends BreakdownReportEvent {
  final String status;

  const BreakdownProjectStatusChanged(this.status);

  @override
  List<Object?> get props => [status];
}

/// تغییر متن توضیحات تکنسین
class BreakdownDescriptionChanged extends BreakdownReportEvent {
  final String description;

  const BreakdownDescriptionChanged(this.description);

  @override
  List<Object?> get props => [description];
}

/// تغییر متن نظرات کارفرما
class BreakdownEmployerCommentsChanged extends BreakdownReportEvent {
  final String comments;

  const BreakdownEmployerCommentsChanged(this.comments);

  @override
  List<Object?> get props => [comments];
}

/// اضافه کردن قطعه جدید مصرفی یا تعویضی
class BreakdownPartAdded extends BreakdownReportEvent {
  final String partName;
  final int quantity;
  final String actionType;

  const BreakdownPartAdded({
    required this.partName,
    required this.quantity,
    required this.actionType,
  });

  @override
  List<Object?> get props => [partName, quantity, actionType];
}

/// حذف قطعه از لیست قطعات مصرفی بر اساس اندیس
class BreakdownPartRemoved extends BreakdownReportEvent {
  final int index;

  const BreakdownPartRemoved({required this.index});

  @override
  List<Object?> get props => [index];
}

/// اضافه کردن تصویر مدرک یا فاکتور به فرم با فشرده‌سازی خودکار
class BreakdownMediaAdded extends BreakdownReportEvent {
  final String filePath;

  const BreakdownMediaAdded({required this.filePath});

  @override
  List<Object?> get props => [filePath];
}

/// حذف تصویر ضمیمه‌شده بر اساس اندیس
class BreakdownMediaRemoved extends BreakdownReportEvent {
  final int index;

  const BreakdownMediaRemoved({required this.index});

  @override
  List<Object?> get props => [index];
}

/// ارسال نهایی گزارش خرابی به همراه موقعیت جغرافیایی و مستندات
class BreakdownSubmitRequested extends BreakdownReportEvent {
  final String? description;
  final String? employerComments;

  const BreakdownSubmitRequested({
    this.description,
    this.employerComments,
  });

  @override
  List<Object?> get props => [description, employerComments];
}

/// بازنشانی وضعیت ارسال پس از نمایش پیام به کاربر
class BreakdownSubmissionResetRequested extends BreakdownReportEvent {
  const BreakdownSubmissionResetRequested();
}
