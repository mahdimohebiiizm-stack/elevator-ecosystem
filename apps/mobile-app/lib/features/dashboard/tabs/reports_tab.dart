import 'package:flutter/material.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/network/api_client.dart';
import '../../reports/report_details_screen.dart';

class ReportsTab extends StatefulWidget {
  final String userRole;

  const ReportsTab({Key? key, this.userRole = 'TECHNICIAN'}) : super(key: key);

  @override
  State<ReportsTab> createState() => _ReportsTabState();
}

class _ReportsTabState extends State<ReportsTab> {
  bool _isLoading = true;
  List<dynamic> _reports = [];
  List<dynamic> _assignments = [];
  List<dynamic> _users = [];
  List<dynamic> _buildings = [];
  String? _currentUserId; // برای فیلتر کردن گزارش‌های خود تکنسین

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final reports = await ApiClient().getAllReports();
      final assignments = await ApiClient().getAllAssignments();
      final users = await ApiClient().getUsers();
      final buildings = await ApiClient().getBuildings();

      // گرفتن آیدی کاربر فعلی از استوریج برای فیلتر کردن
      final phone = await ApiClient().storage.read(key: 'username');

      if (mounted) {
        setState(() {
          _users = users;
          _buildings = buildings;

          final isAdmin = widget.userRole == 'ADMIN' || widget.userRole == 'MANAGER';

          if (isAdmin) {
            _reports = reports;
            _assignments = assignments;
          } else {
            // پیدا کردن آیدی تکنسین فعلی از روی شماره تلفنش
            final me = _users.firstWhere((u) => u['username'] == phone, orElse: () => null);
            if (me != null) {
              _currentUserId = me['id'].toString();
              // فیلتر کردن گزارش‌ها و تسک‌های لغو شده فقط برای همین تکنسین
              _reports = reports.where((r) => r['technician_id'].toString() == _currentUserId).toList();
              _assignments = assignments.where((a) => a['technician_id'].toString() == _currentUserId).toList();
            } else {
              _reports = [];
              _assignments = [];
            }
          }

          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("خطا در دریافت گزارش‌ها: $e", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _confirmDeleteReport(String reportId) {
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.red),
              SizedBox(width: 8),
              Text("حذف گزارش", style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: const Text("آیا از حذف این گزارش سرویس اطمینان دارید؟\nاین عملیات غیرقابل بازگشت است و از سوابق ساختمان پاک می‌شود.", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("انصراف", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              onPressed: () async {
                Navigator.pop(ctx);
                setState(() => _isLoading = true);
                try {
                  // در صورت وجود API حذف گزارش در بک‌اند
                  // await ApiClient().deleteReport(reportId);
                  // _fetchData();
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("این امکان باید در بک‌اند اضافه شود", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.orange));
                  setState(() => _isLoading = false);
                } catch (e) {
                  setState(() => _isLoading = false);
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
                }
              },
              child: const Text("بله، حذف شود", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  String _getTechName(String techId) {
    final user = _users.firstWhere((u) => u['id'].toString() == techId.toString(), orElse: () => {'full_name': 'تکنسین نامشخص'});
    return user['full_name'];
  }

  String _getBuildingName(String buildingId) {
    final building = _buildings.firstWhere((b) => b['id'].toString() == buildingId.toString(), orElse: () => {'name': 'ساختمان نامشخص'});
    return building['name'];
  }

  String _toShamsiDateTime(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'تاریخ نامشخص';
    try {
      if (dateStr.startsWith('13') || dateStr.startsWith('14')) {
        return dateStr.replaceAll('-', '/');
      }
      final dt = DateTime.parse(dateStr);
      final j = Jalali.fromDateTime(dt);

      final datePart = '${j.year}/${j.month.toString().padLeft(2, '0')}/${j.day.toString().padLeft(2, '0')}';
      final timePart = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

      return '$datePart - ساعت $timePart';
    } catch (e) {
      return dateStr.contains('T') ? dateStr.replaceAll('T', ' - ').substring(0, 18) : dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final failedAssignments = _assignments.where((a) => a['status'] == 'CANCELED' || a['status'] == 'EXPIRED_MISSED').toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: DefaultTabController(
        length: 2,
        child: Scaffold(
          backgroundColor: AppColors.backgroundWhite,
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            title: const Text("گزارش‌ها و عملکرد", style: TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontWeight: FontWeight.bold, fontSize: 18)),
            centerTitle: true,
            actions: [
              IconButton(icon: const Icon(Icons.refresh, color: AppColors.textBlack), onPressed: _fetchData),
            ],
            bottom: const TabBar(
              indicatorColor: AppColors.primaryGreen,
              indicatorWeight: 3,
              labelColor: AppColors.primaryGreen,
              unselectedLabelColor: Colors.grey,
              labelStyle: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 14),
              tabs: [
                Tab(text: "گزارش‌های انجام‌شده", icon: Icon(Icons.check_circle_outline)),
                Tab(text: "ماموریت‌های لغو شده", icon: Icon(Icons.cancel_outlined)),
              ],
            ),
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
              : TabBarView(
            children: [
              _buildCompletedReportsView(),
              _buildFailedAssignmentsView(failedAssignments),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCompletedReportsView() {
    if (_reports.isEmpty) {
      return const Center(child: Text("هیچ گزارشی ثبت نشده است.", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)));
    }

    final bool isAdmin = widget.userRole == 'ADMIN' || widget.userRole == 'MANAGER';

    return ListView.builder(
      padding: const EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 100),
      physics: const BouncingScrollPhysics(),
      itemCount: _reports.length,
      itemBuilder: (context, index) {
        final report = _reports[index];
        final bool isEmergency = report['is_emergency'] ?? false;
        final techName = _getTechName(report['technician_id'].toString());
        final buildingName = _getBuildingName(report['elevator_id'].toString());

        final String cleanDate = _toShamsiDateTime(report['visit_time']);

        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ReportDetailsScreen(
                  reportData: report,
                  buildingName: buildingName,
                  techName: techName,
                  shamsiDate: cleanDate,
                ),
              ),
            );
          },
          child: Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 12),
            color: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.shade200)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: isEmergency ? Colors.red.withValues(alpha: 0.1) : Colors.blue.withValues(alpha: 0.1), shape: BoxShape.circle),
                    child: Icon(isEmergency ? Icons.warning_amber_rounded : Icons.build_circle_outlined, color: isEmergency ? Colors.red : Colors.blue),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(buildingName, style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(isEmergency ? "خرابی و مراجعه اضطراری" : "سرویس نگهداری دوره‌ای", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade800)),
                        const SizedBox(height: 4),
                        Text("تکنسین: $techName", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey.shade600)),
                        const SizedBox(height: 4),
                        Text(cleanDate, style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey.shade500)),
                      ],
                    ),
                  ),
                  if (isAdmin)
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => _confirmDeleteReport(report['id'].toString()),
                    )
                  else
                    Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey.shade400),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFailedAssignmentsView(List<dynamic> failedAssignments) {
    if (failedAssignments.isEmpty) {
      return const Center(child: Text("مورد لغو شده‌ای وجود ندارد.", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)));
    }

    return ListView.builder(
      padding: const EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 100),
      physics: const BouncingScrollPhysics(),
      itemCount: failedAssignments.length,
      itemBuilder: (context, index) {
        final task = failedAssignments[index];
        final isCanceled = task['status'] == 'CANCELED';
        final techName = _getTechName(task['technician_id'].toString());
        final buildingName = _getBuildingName(task['building_id'].toString());
        final cancelReason = task['cancel_reason'] ?? 'دلیلی ثبت نشده است';

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          color: Colors.red.shade50,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.red.shade200)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(isCanceled ? Icons.cancel : Icons.hourglass_disabled, color: Colors.red.shade600, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(buildingName, style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 15, color: Colors.red.shade900), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.red.shade100, borderRadius: BorderRadius.circular(8)),
                      child: Text(isCanceled ? "لغو توسط تکنسین" : "معوقه / از دست رفته", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 10, color: Colors.red.shade800, fontWeight: FontWeight.bold)),
                    )
                  ],
                ),
                const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
                Text("تکنسین مسئول: $techName", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.black87)),
                const SizedBox(height: 6),
                Text("تاریخ برنامه: ${_toShamsiDisplay(task['task_date_shamsi'] ?? task['created_at'])}", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade700)),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.red.shade100)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("توضیحات:", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text(cancelReason, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.black87)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _toShamsiDisplay(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'نامشخص';
    try {
      if (dateStr.startsWith('13') || dateStr.startsWith('14')) {
        return dateStr.replaceAll('-', '/');
      }
      final dt = DateTime.parse(dateStr);
      final j = Jalali.fromDateTime(dt);
      return '${j.year}/${j.month.toString().padLeft(2, '0')}/${j.day.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateStr.replaceAll('-', '/');
    }
  }
}