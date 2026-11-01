import 'package:flutter/material.dart';
import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../bloc/workbench/workbench_bloc.dart';
import '../data/workbench_repository.dart';
import '../qr_scanner_screen.dart';
import '../../reports/service_report_screen.dart';
import '../../reports/breakdown_report_screen.dart';

class WorkbenchTab extends StatelessWidget {
  final String userRole;
  const WorkbenchTab({Key? key, this.userRole = 'TECHNICIAN'}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => WorkbenchBloc()
        ..add(WorkbenchFetchDataRequested(userRole: userRole)),
      child: _WorkbenchView(userRole: userRole),
    );
  }
}

class _WorkbenchView extends StatefulWidget {
  final String userRole;
  const _WorkbenchView({Key? key, required this.userRole}) : super(key: key);

  @override
  State<_WorkbenchView> createState() => _WorkbenchViewState();
}

class _WorkbenchViewState extends State<_WorkbenchView> {
  late StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;

  @override
  void initState() {
    super.initState();

    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (!results.contains(ConnectivityResult.none) && mounted) {
        final state = context.read<WorkbenchBloc>().state;
        if (state is WorkbenchLoaded && state.offlineReportsCount > 0 && !state.isSyncing) {
          context.read<WorkbenchBloc>().add(const WorkbenchSyncRequested());
        }
      }
    });
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    super.dispose();
  }

  void _refreshData() {
    context.read<WorkbenchBloc>().add(WorkbenchRefreshRequested(userRole: widget.userRole));
  }

  void _triggerSync() {
    final state = context.read<WorkbenchBloc>().state;
    if (state is WorkbenchLoaded) {
      if (state.offlineReportsCount == 0 || state.isSyncing) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("در حال ارسال گزارش‌های آفلاین...", style: TextStyle(fontFamily: 'Vazirmatn')),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 2),
        ),
      );

      context.read<WorkbenchBloc>().add(const WorkbenchSyncRequested());
    }
  }

  void _showNotificationsModal(BuildContext context, List<Map<String, dynamic>> overdueNotifications) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.6,
          decoration: const BoxDecoration(
            color: AppColors.backgroundWhite,
            borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(margin: const EdgeInsets.only(top: 12, bottom: 8), width: 40, height: 5, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("صندوق پیام‌ها", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textBlack)),
                    IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(context)),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: overdueNotifications.isEmpty
                    ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_active_outlined, size: 60, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      const Text("پیام جدیدی ندارید.", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)),
                    ],
                  ),
                )
                    : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  itemCount: overdueNotifications.length,
                  itemBuilder: (context, index) {
                    final notif = overdueNotifications[index];
                    final debtFormatted = notif['debt_amount'].toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');

                    return Card(
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 12),
                      color: Colors.red.shade50,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.red.shade200)),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: Colors.red.shade100, shape: BoxShape.circle),
                          child: const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 20),
                        ),
                        title: Text("هشدار معوقه: ${notif['building_name']}", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, fontWeight: FontWeight.bold)),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text("کارفرما: ${notif['employer_name']}\nمبلغ: $debtFormatted تومان (${notif['days_passed']} روز تاخیر)", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.red.shade800)),
                        ),
                        isThreeLine: true,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showEmergencyBuildingSelector(BuildContext context, List<Map<String, dynamic>> allBuildings) {
    if (allBuildings.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("لیست ساختمان‌ها در حال بارگذاری است. لطفاً کمی صبر کنید.", style: TextStyle(fontFamily: 'Vazirmatn'))),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(margin: const EdgeInsets.only(top: 12, bottom: 16), width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4))),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Text("انتخاب ساختمان برای ثبت خرابی", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn', color: AppColors.textBlack)),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: allBuildings.length,
                  itemBuilder: (context, index) {
                    final building = allBuildings[index];
                    return Card(
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 8),
                      color: const Color(0xFFF7F8FA),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                      child: ListTile(
                        leading: CircleAvatar(backgroundColor: const Color(0xFFFF5252).withValues(alpha: 0.1), child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFFF5252))),
                        title: Text(building['name'], style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text(building['address'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: AppColors.textGrey)),
                        onTap: () {
                          Navigator.pop(context);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => BreakdownReportScreen(
                                elevatorId: building['id'].toString(),
                                buildingName: building['name'],
                              ),
                            ),
                          ).then((_) => _refreshData());
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<WorkbenchBloc, WorkbenchState>(
      listener: (context, state) {
        if (state is WorkbenchLoaded) {
          if (state.syncResultMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.syncResultMessage!, style: const TextStyle(fontFamily: 'Vazirmatn')),
                backgroundColor: state.syncSuccess == true ? Colors.green.shade800 : Colors.red,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
          if (state.actionFeedbackMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.actionFeedbackMessage!, style: const TextStyle(fontFamily: 'Vazirmatn')),
                backgroundColor: Colors.green,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        } else if (state is WorkbenchError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage, style: const TextStyle(fontFamily: 'Vazirmatn')),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        final List<Map<String, dynamic>> tasks = state is WorkbenchLoaded ? state.tasks : [];
        final List<Map<String, dynamic>> buildings = state is WorkbenchLoaded ? state.buildings : [];
        final List<Map<String, dynamic>> overdueNotifications = state is WorkbenchLoaded ? state.overdueNotifications : [];
        final int offlineReportsCount = state is WorkbenchLoaded ? state.offlineReportsCount : 0;
        final bool isSyncing = state is WorkbenchLoaded ? state.isSyncing : false;
        final bool isLoading = state is WorkbenchLoading;
        final String? errorMessage = state is WorkbenchError ? state.errorMessage : null;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(
              context: context,
              offlineReportsCount: offlineReportsCount,
              isSyncing: isSyncing,
              notificationCount: overdueNotifications.length,
              overdueNotifications: overdueNotifications,
            ),
            const SizedBox(height: 24),
            _buildQuickActions(
              context: context,
              allBuildings: buildings,
            ),
            const SizedBox(height: 24),
            _buildTodayRouteHeader(),
            const SizedBox(height: 12),
            _buildTodayTasksList(
              context: context,
              isLoading: isLoading,
              errorMessage: errorMessage,
              tasks: tasks,
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeader({
    required BuildContext context,
    required int offlineReportsCount,
    required bool isSyncing,
    required int notificationCount,
    required List<Map<String, dynamic>> overdueNotifications,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.userRole == 'ADMIN' || widget.userRole == 'MANAGER' ? "خدا قوت، مدیر عزیز" : "خدا قوت، تکنسین عزیز",
                  style: const TextStyle(fontSize: 14, color: AppColors.textGrey, fontFamily: 'Vazirmatn'),
                ),
                const SizedBox(height: 4),
                const Text(
                  "برنامه کاری امروز شما",
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textBlack, fontFamily: 'Vazirmatn'),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Row(
            children: [
              if (offlineReportsCount > 0)
                GestureDetector(
                  onTap: isSyncing ? null : _triggerSync,
                  child: Container(
                    margin: const EdgeInsets.only(left: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        isSyncing
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red))
                            : const Icon(Icons.cloud_upload_outlined, color: Colors.red, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          "$offlineReportsCount",
                          style: const TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn'),
                        ),
                      ],
                    ),
                  ),
                ),
              Stack(
                alignment: Alignment.topRight,
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFFF7F8FA),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.notifications_outlined, color: AppColors.textBlack),
                      onPressed: () => _showNotificationsModal(context, overdueNotifications),
                    ),
                  ),
                  if (notificationCount > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                        child: Text(
                          '$notificationCount',
                          style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn'),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions({
    required BuildContext context,
    required List<Map<String, dynamic>> allBuildings,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(
            child: _QuickActionCard(
              title: "اسکن بارکد",
              subtitle: "شروع سرویس",
              icon: Icons.qr_code_scanner_rounded,
              backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.15),
              iconColor: Colors.green[700]!,
              onTap: () async {
                final scannedHash = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const QrScannerScreen()),
                );

                if (scannedHash != null && context.mounted) {
                  final targetBuilding = allBuildings.firstWhere(
                    (b) => b['id'].toString() == scannedHash,
                    orElse: () => {},
                  );

                  if (targetBuilding.isNotEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('ساختمان ${targetBuilding['name']} شناسایی شد', style: const TextStyle(fontFamily: 'Vazirmatn')),
                        backgroundColor: Colors.green[700],
                        behavior: SnackBarBehavior.floating,
                      ),
                    );

                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ServiceReportScreen(
                          elevatorId: targetBuilding['id'].toString(),
                          buildingName: targetBuilding['name'],
                        ),
                      ),
                    ).then((_) => _refreshData());
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('ساختمان یا آسانسوری با این بارکد یافت نشد!', style: TextStyle(fontFamily: 'Vazirmatn')),
                        backgroundColor: Colors.red,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                }
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _QuickActionCard(
              title: "ثبت خرابی",
              subtitle: "اعلام محبوسی",
              icon: Icons.warning_amber_rounded,
              backgroundColor: const Color(0xFFFF5252).withValues(alpha: 0.1),
              iconColor: const Color(0xFFFF5252),
              onTap: () => _showEmergencyBuildingSelector(context, allBuildings),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayRouteHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            "ماموریت‌های در انتظار",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textBlack, fontFamily: 'Vazirmatn'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20, color: AppColors.textGrey),
            onPressed: _refreshData,
          )
        ],
      ),
    );
  }

  Widget _buildTodayTasksList({
    required BuildContext context,
    required bool isLoading,
    required String? errorMessage,
    required List<Map<String, dynamic>> tasks,
  }) {
    return Expanded(
      child: Builder(
        builder: (context) {
          if (isLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen));
          }

          if (errorMessage != null) {
            return RefreshIndicator(
              color: AppColors.primaryGreen,
              onRefresh: () async => _refreshData(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.15),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Text(
                        "خطا در دریافت اطلاعات\n$errorMessage",
                        style: const TextStyle(color: Color(0xFFFF5252), fontSize: 13, fontFamily: 'Vazirmatn'),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }

          if (tasks.isEmpty) {
            return RefreshIndicator(
              color: AppColors.primaryGreen,
              onRefresh: () async => _refreshData(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                  const Center(
                    child: Text(
                      "امروز ماموریتی ندارید. خدا قوت!",
                      style: TextStyle(color: AppColors.textGrey, fontSize: 14, fontFamily: 'Vazirmatn'),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            color: AppColors.primaryGreen,
            onRefresh: () async => _refreshData(),
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(left: 20, right: 20, bottom: 100),
              itemCount: tasks.length,
              itemBuilder: (context, index) {
                return _TaskCard(taskData: tasks[index], index: index, onReturn: _refreshData);
              },
            ),
          );
        },
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color backgroundColor;
  final Color iconColor;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.backgroundColor,
    required this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: backgroundColor.withValues(alpha: 0.6), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.8), shape: BoxShape.circle),
              child: Icon(icon, size: 24, color: iconColor),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textBlack, fontFamily: 'Vazirmatn'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(fontSize: 11, color: AppColors.textBlack.withValues(alpha: 0.6), fontFamily: 'Vazirmatn'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final Map<String, dynamic> taskData;
  final int index;
  final VoidCallback onReturn;

  const _TaskCard({required this.taskData, required this.index, required this.onReturn});

  void _showElevatorHistory(BuildContext context, String elevatorId, String buildingName) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: const BoxDecoration(
            color: Color(0xFF1E1E24),
            borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(margin: const EdgeInsets.only(top: 12, bottom: 16), width: 40, height: 4, decoration: BoxDecoration(color: Colors.white30, borderRadius: BorderRadius.circular(4))),
              Text("پرونده پزشکی: $buildingName", style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn')),
              const SizedBox(height: 16),
              Expanded(
                child: FutureBuilder<List<Map<String, dynamic>>>(
                  future: WorkbenchRepository().getElevatorHistory(elevatorId),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen));
                    }
                    if (snapshot.hasError) {
                      return Center(child: Text("خطا در دریافت سوابق", style: TextStyle(color: Colors.red[300], fontFamily: 'Vazirmatn')));
                    }
                    if (!snapshot.hasData || snapshot.data!.isEmpty) {
                      return const Center(child: Text("هیچ سابقه قبلی برای این آسانسور ثبت نشده است.", style: TextStyle(color: Colors.white54, fontFamily: 'Vazirmatn')));
                    }

                    final reports = snapshot.data!;
                    return ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      itemCount: reports.length,
                      itemBuilder: (context, index) {
                        final report = reports[index];
                        final bool isEmergency = report['is_emergency'] ?? false;
                        final String rawDate = report['visit_time'] ?? '';
                        final String cleanDate = rawDate.contains('T') ? rawDate.split('T')[0] : rawDate;

                        return Card(
                          color: const Color(0xFF2A2A35),
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: isEmergency ? Colors.red.withValues(alpha: 0.2) : Colors.blue.withValues(alpha: 0.2),
                                  child: Icon(isEmergency ? Icons.warning_amber_rounded : Icons.build_circle_outlined, color: isEmergency ? Colors.red[300] : Colors.blue[300]),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(isEmergency ? "مراجعه اضطراری / خرابی" : "سرویس نگهداری دوره‌ای", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Vazirmatn')),
                                      const SizedBox(height: 4),
                                      Text("تاریخ مراجعه: $cleanDate", style: const TextStyle(color: Colors.white54, fontSize: 11, fontFamily: 'Vazirmatn')),
                                    ],
                                  ),
                                ),
                                if (report['parts_used'] != null && (report['parts_used'] as List).isNotEmpty)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                                    child: Text("${(report['parts_used'] as List).length} قطعه", style: const TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn')),
                                  )
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text("بستن پرونده", style: TextStyle(color: Colors.white70, fontFamily: 'Vazirmatn')),
                    ),
                  ),
                ),
              )
            ],
          ),
        );
      },
    );
  }

  void _showExplanationDialog(BuildContext context, String assignmentId) {
    final TextEditingController explanationController = TextEditingController();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            backgroundColor: const Color(0xFF2A2A35),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.warning_rounded, color: Colors.orange),
                SizedBox(width: 8),
                Expanded(child: Text("توضیح عدم انجام سرویس", style: TextStyle(color: Colors.white, fontSize: 15, fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold))),
              ],
            ),
            content: TextField(
              controller: explanationController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white, fontFamily: 'Vazirmatn', fontSize: 14),
              decoration: InputDecoration(
                hintText: "دلیل عدم مراجعه را بنویسید...",
                hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                filled: true,
                fillColor: const Color(0xFF1E1E24),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text("انصراف", style: TextStyle(color: Colors.white54, fontFamily: 'Vazirmatn')),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.orange.shade800),
                onPressed: () {
                  final text = explanationController.text.trim();
                  if (text.isEmpty) return;

                  context.read<WorkbenchBloc>().add(
                    WorkbenchSubmitExplanationRequested(
                      assignmentId: assignmentId,
                      explanation: text,
                    ),
                  );

                  Navigator.pop(dialogContext);
                },
                child: const Text("ثبت", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn')),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isCompleted = taskData['status'] == 'COMPLETED';
    final bool isExpired = taskData['status'] == 'EXPIRED_MISSED';

    final String assignmentId = taskData['assignment_id']?.toString() ?? "";
    final String buildingName = taskData['name'] ?? "ساختمان نامشخص";
    final String address = taskData['address'] ?? "آدرس ثبت نشده است";
    final String elevatorId = taskData['building_id']?.toString() ?? "";
    final String taskDate = taskData['task_date'] ?? "";

    final Color barColor = isExpired ? Colors.grey.shade600 : (isCompleted ? AppColors.primaryGreen : const Color(0xFFFFA726));
    final Color bgColor = isExpired ? Colors.grey.shade200 : const Color(0xFFF7F8FA);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 50,
            decoration: BoxDecoration(
              color: barColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        buildingName,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: isExpired ? Colors.grey.shade700 : AppColors.textBlack, fontFamily: 'Vazirmatn'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isExpired)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: Colors.red.shade100, borderRadius: BorderRadius.circular(4)),
                        child: Text("معوقه ($taskDate)", style: TextStyle(fontSize: 10, color: Colors.red.shade800, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn')),
                      )
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 14, color: isExpired ? Colors.grey.shade500 : AppColors.textGrey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        address,
                        style: TextStyle(fontSize: 12, color: isExpired ? Colors.grey.shade600 : AppColors.textGrey, fontFamily: 'Vazirmatn'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (isCompleted)
            Icon(Icons.check_circle, color: Colors.green[600])
          else if (isExpired)
            InkWell(
              onTap: () => _showExplanationDialog(context, assignmentId),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade500),
                ),
                child: Text(
                  "توضیح",
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn'),
                ),
              ),
            )
          else
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.history_rounded, color: Colors.blueGrey),
                  tooltip: 'سوابق',
                  onPressed: () => _showElevatorHistory(context, elevatorId, buildingName),
                ),
                InkWell(
                  onTap: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ServiceReportScreen(
                          elevatorId: elevatorId,
                          buildingName: buildingName,
                        ),
                      ),
                    );
                    onReturn();
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFFA726)),
                    ),
                    child: const Text(
                      "شروع",
                      style: TextStyle(color: Color(0xFFFFA726), fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn'),
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
