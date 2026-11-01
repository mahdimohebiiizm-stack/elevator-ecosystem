import 'package:equatable/equatable.dart';
import '../models/checklist_item_model.dart';

/// کلاس پایه رویدادهای ماژول گزارش سرویس آسانسور
abstract class ServiceReportEvent extends Equatable {
  const ServiceReportEvent();

  @override
  List<Object?> get props => [];
}

/// رویداد مقداردهی اولیه چک‌لیست ۲۵ گانه و آماده‌سازی وضعیت فرم
class ServiceReportInitRequested extends ServiceReportEvent {
  final String elevatorId;
  final String buildingName;

  const ServiceReportInitRequested({
    required this.elevatorId,
    required this.buildingName,
  });

  @override
  List<Object?> get props => [elevatorId, buildingName];
}

/// رویداد ثبت یا به‌روزرسانی وضعیت بررسی یک آیتم چک‌لیست
class ServiceReportItemStatusChanged extends ServiceReportEvent {
  final String keyName;
  final CheckStatus status;
  final int categoryIndex;

  const ServiceReportItemStatusChanged({
    required this.keyName,
    required this.status,
    required this.categoryIndex,
  });

  @override
  List<Object?> get props => [keyName, status, categoryIndex];
}

/// رویداد باز/بسته کردن آکاردئون دسته‌بندی‌های چک‌لیست
class ServiceReportCategoryToggleRequested extends ServiceReportEvent {
  final int categoryIndex;

  const ServiceReportCategoryToggleRequested({required this.categoryIndex});

  @override
  List<Object?> get props => [categoryIndex];
}

/// رویداد اضافه کردن قطعه مصرفی، تعویضی یا درخواستی به گزارش
class ServiceReportPartAdded extends ServiceReportEvent {
  final String partName;
  final int quantity;
  final String actionType;

  const ServiceReportPartAdded({
    required this.partName,
    required this.quantity,
    required this.actionType,
  });

  @override
  List<Object?> get props => [partName, quantity, actionType];
}

/// رویداد حذف قطعه ثبت‌شده بر اساس اندیس لیست
class ServiceReportPartRemoved extends ServiceReportEvent {
  final int index;

  const ServiceReportPartRemoved({required this.index});

  @override
  List<Object?> get props => [index];
}

/// رویداد اضافه کردن تصویر مستندات به فرم با اعمال فشرده‌سازی در پس‌زمینه
class ServiceReportMediaAdded extends ServiceReportEvent {
  final String filePath;
  final String? relatedToKey;
  final String? relatedToTitle;

  const ServiceReportMediaAdded({
    required this.filePath,
    this.relatedToKey,
    this.relatedToTitle,
  });

  @override
  List<Object?> get props => [filePath, relatedToKey, relatedToTitle];
}

/// رویداد حذف تصویر ضمیمه‌شده بر اساس اندیس لیست
class ServiceReportMediaRemoved extends ServiceReportEvent {
  final int index;

  const ServiceReportMediaRemoved({required this.index});

  @override
  List<Object?> get props => [index];
}

/// رویداد نهایی‌سازی و ارسال گزارش سرویس به سرور مرکزی یا صف آفلاین
class ServiceReportSubmitRequested extends ServiceReportEvent {
  final String elevatorId;
  final String? description;

  const ServiceReportSubmitRequested({
    required this.elevatorId,
    this.description,
  });

  @override
  List<Object?> get props => [elevatorId, description];
}

/// رویداد بازنشانی وضعیت ارسال پس از نمایش پیام نتیجه به کاربر
class ServiceReportSubmissionResetRequested extends ServiceReportEvent {
  const ServiceReportSubmissionResetRequested();
}
