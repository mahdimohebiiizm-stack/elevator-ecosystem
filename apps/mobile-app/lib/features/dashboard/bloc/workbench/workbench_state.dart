import 'package:equatable/equatable.dart';

abstract class WorkbenchState extends Equatable {
  const WorkbenchState();

  @override
  List<Object?> get props => [];
}

/// وضعیت اولیه میز کار
class WorkbenchInitial extends WorkbenchState {
  const WorkbenchInitial();
}

/// وضعیت در حال بارگذاری اطلاعات اولیه
class WorkbenchLoading extends WorkbenchState {
  const WorkbenchLoading();
}

/// وضعیت اطلاعات بارگذاری‌شده و فعال میز کار
class WorkbenchLoaded extends WorkbenchState {
  final List<Map<String, dynamic>> tasks;
  final List<Map<String, dynamic>> buildings;
  final List<Map<String, dynamic>> overdueNotifications;
  final int offlineReportsCount;
  final bool isSyncing;
  final String? syncResultMessage;
  final bool? syncSuccess;
  final String? actionFeedbackMessage;
  final String userRole;

  const WorkbenchLoaded({
    required this.tasks,
    required this.buildings,
    this.overdueNotifications = const [],
    this.offlineReportsCount = 0,
    this.isSyncing = false,
    this.syncResultMessage,
    this.syncSuccess,
    this.actionFeedbackMessage,
    this.userRole = 'TECHNICIAN',
  });

  WorkbenchLoaded copyWith({
    List<Map<String, dynamic>>? tasks,
    List<Map<String, dynamic>>? buildings,
    List<Map<String, dynamic>>? overdueNotifications,
    int? offlineReportsCount,
    bool? isSyncing,
    String? syncResultMessage,
    bool? syncSuccess,
    String? actionFeedbackMessage,
    String? userRole,
  }) {
    return WorkbenchLoaded(
      tasks: tasks ?? this.tasks,
      buildings: buildings ?? this.buildings,
      overdueNotifications: overdueNotifications ?? this.overdueNotifications,
      offlineReportsCount: offlineReportsCount ?? this.offlineReportsCount,
      isSyncing: isSyncing ?? this.isSyncing,
      syncResultMessage: syncResultMessage,
      syncSuccess: syncSuccess,
      actionFeedbackMessage: actionFeedbackMessage,
      userRole: userRole ?? this.userRole,
    );
  }

  @override
  List<Object?> get props => [
    tasks,
    buildings,
    overdueNotifications,
    offlineReportsCount,
    isSyncing,
    syncResultMessage,
    syncSuccess,
    actionFeedbackMessage,
    userRole,
  ];
}

/// وضعیت بروز خطا در واکشی اطلاعات
class WorkbenchError extends WorkbenchState {
  final String errorMessage;
  final List<Map<String, dynamic>>? cachedTasks;

  const WorkbenchError({
    required this.errorMessage,
    this.cachedTasks,
  });

  @override
  List<Object?> get props => [errorMessage, cachedTasks];
}
