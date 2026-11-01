import 'package:equatable/equatable.dart';

abstract class WorkbenchEvent extends Equatable {
  const WorkbenchEvent();

  @override
  List<Object?> get props => [];
}

/// رویداد دریافت اولیه اطلاعات میز کار (تسک‌ها، ساختمان‌ها، اعلانات و صف آفلاین)
class WorkbenchFetchDataRequested extends WorkbenchEvent {
  final String userRole;

  const WorkbenchFetchDataRequested({this.userRole = 'TECHNICIAN'});

  @override
  List<Object?> get props => [userRole];
}

/// رویداد بازخوانی دستی اطلاعات (Pull-to-Refresh یا دکمه رفرش)
class WorkbenchRefreshRequested extends WorkbenchEvent {
  final String userRole;

  const WorkbenchRefreshRequested({this.userRole = 'TECHNICIAN'});

  @override
  List<Object?> get props => [userRole];
}

/// رویداد ارسال گزارش‌های آفلاین موجود در صف به سرور مرکزی
class WorkbenchSyncRequested extends WorkbenchEvent {
  const WorkbenchSyncRequested();
}

/// رویداد ثبت توضیحات تکنسین برای عدم انجام سرویس
class WorkbenchSubmitExplanationRequested extends WorkbenchEvent {
  final String assignmentId;
  final String explanation;

  const WorkbenchSubmitExplanationRequested({
    required this.assignmentId,
    required this.explanation,
  });

  @override
  List<Object?> get props => [assignmentId, explanation];
}

/// رویداد به‌روزرسانی زنده شمارنده گزارش‌های آفلاین
class WorkbenchOfflineCountUpdated extends WorkbenchEvent {
  final int count;

  const WorkbenchOfflineCountUpdated({required this.count});

  @override
  List<Object?> get props => [count];
}
