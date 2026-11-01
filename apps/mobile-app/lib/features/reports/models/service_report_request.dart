class ServiceReportRequest {
  final String elevatorId;
  final double? techLat; // عرض جغرافیایی
  final double? techLng; // طول جغرافیایی

  // متغیر تشخیص نوع فرم (سرویس ماهانه یا خرابی اضطراری)
  final bool isEmergency;
  final String? description;

  // فیلدهای مخصوص چک‌لیست ماهانه (اختیاری شده تا در زمان خرابی ارور ندهد)
  final Map<String, String>? checklist;

  // فیلدهای مخصوص فرم تعمیرات اضطراری BM (اختیاری)
  final String? bmDispatchReason;
  final String? bmArrivalStatus;
  final String? bmCause;
  final String? bmAction;
  final String? projectStatus;
  final String? employerComments;

  // قطعات مصرفی/تعویضی (مشترک بین هر دو فرم)
  final List<ReportPart> partsUsed;

  ServiceReportRequest({
    required this.elevatorId,
    this.techLat,
    this.techLng,
    this.isEmergency = false,
    this.description,
    this.checklist,
    this.bmDispatchReason,
    this.bmArrivalStatus,
    this.bmCause,
    this.bmAction,
    this.projectStatus,
    this.employerComments,
    required this.partsUsed,
  });

  Map<String, dynamic> toJson() {
    return {
      "elevator_id": elevatorId,
      "tech_lat": techLat,
      "tech_lng": techLng,
      "is_emergency": isEmergency,
      if (description != null) "description": description,
      if (checklist != null) "checklist": checklist,
      if (bmDispatchReason != null) "bm_dispatch_reason": bmDispatchReason,
      if (bmArrivalStatus != null) "bm_arrival_status": bmArrivalStatus,
      if (bmCause != null) "bm_cause": bmCause,
      if (bmAction != null) "bm_action": bmAction,
      if (projectStatus != null) "project_status": projectStatus,
      if (employerComments != null) "employer_comments": employerComments,
      "parts_used": partsUsed.map((part) => part.toJson()).toList(),
    };
  }
}

class ReportPart {
  final String partName;
  final int quantity;
  final String actionType;

  ReportPart({
    required this.partName,
    required this.quantity,
    required this.actionType,
  });

  Map<String, dynamic> toJson() {
    return {
      "part_name": partName,
      "quantity": quantity,
      "action_type": actionType,
    };
  }
}