import 'package:flutter/material.dart';
import 'package:equatable/equatable.dart';
import 'service_report_request.dart';

/// وضعیت چک‌لیست سرویس ماهانه آسانسور
enum CheckStatus {
  OK,
  NEEDS_REPAIR,
  DEFECTIVE,
  NOT_CHECKED,
}

/// مدل هر آیتم در چک‌لیست ۲۵ گانه سرویس آسانسور
class ChecklistItemModel extends Equatable {
  final String keyName;
  final String title;
  final CheckStatus status;

  const ChecklistItemModel({
    required this.keyName,
    required this.title,
    this.status = CheckStatus.NOT_CHECKED,
  });

  ChecklistItemModel copyWith({
    String? keyName,
    String? title,
    CheckStatus? status,
  }) {
    return ChecklistItemModel(
      keyName: keyName ?? this.keyName,
      title: title ?? this.title,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [keyName, title, status];
}

/// مدل هر دسته‌بندی در چک‌لیست (کابین و طبقات، چاهک و ایمنی، موتورخانه)
class ChecklistCategoryModel extends Equatable {
  final String title;
  final IconData icon;
  final List<ChecklistItemModel> items;
  final bool isExpanded;

  const ChecklistCategoryModel({
    required this.title,
    required this.icon,
    required this.items,
    this.isExpanded = false,
  });

  ChecklistCategoryModel copyWith({
    String? title,
    IconData? icon,
    List<ChecklistItemModel>? items,
    bool? isExpanded,
  }) {
    return ChecklistCategoryModel(
      title: title ?? this.title,
      icon: icon ?? this.icon,
      items: items ?? this.items,
      isExpanded: isExpanded ?? this.isExpanded,
    );
  }

  @override
  List<Object?> get props => [title, icon, items, isExpanded];
}

/// مدل قطعات مصرفی/تعویضی ثبت شده در فرم سرویس یا خرابی
class ReportPartItem extends Equatable {
  final String name;
  final int qty;
  final String action; // مصرفی، تعویض شده، درخواست خرید

  const ReportPartItem({
    required this.name,
    required this.qty,
    required this.action,
  });

  ReportPart toReportPart() {
    String actionEnum = "CONSUMED";
    if (action == "تعویض شده" || action == "REPLACED") {
      actionEnum = "REPLACED";
    } else if (action == "درخواست خرید" || action == "REQUESTED") {
      actionEnum = "REQUESTED";
    }

    return ReportPart(
      partName: name,
      quantity: qty,
      actionType: actionEnum,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'qty': qty,
      'action': action,
    };
  }

  @override
  List<Object?> get props => [name, qty, action];
}

/// مدل رسانه‌ها و عکس‌های ضمیمه گزارش با انتساب به آیتم معیوب یا عمومی
class ReportMediaItem extends Equatable {
  final String filePath;
  final String? relatedToKey;
  final String? relatedToTitle;

  const ReportMediaItem({
    required this.filePath,
    this.relatedToKey,
    this.relatedToTitle,
  });

  Map<String, dynamic> toMap() {
    return {
      'file_path': filePath,
      'defect_key': relatedToKey,
      'defect_title': relatedToTitle ?? "عمومی",
    };
  }

  @override
  List<Object?> get props => [filePath, relatedToKey, relatedToTitle];
}

/// نتیجه نهایی عملیات ارسال گزارش سرویس یا خرابی (آنلاین یا صف آفلاین)
class ServiceReportSubmissionResult {
  final bool isSuccess;
  final bool isOfflineSaved;
  final String? reportId;
  final String message;

  const ServiceReportSubmissionResult({
    required this.isSuccess,
    required this.isOfflineSaved,
    this.reportId,
    required this.message,
  });
}
