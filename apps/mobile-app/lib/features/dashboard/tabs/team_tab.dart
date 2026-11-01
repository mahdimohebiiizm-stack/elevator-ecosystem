import 'package:flutter/material.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/network/api_client.dart';

class TeamTab extends StatefulWidget {
  const TeamTab({super.key});

  @override
  State<TeamTab> createState() => _TeamTabState();
}

class _TeamTabState extends State<TeamTab> {
  List<dynamic> _buildings = [];
  List<dynamic> _allUsers = [];
  List<dynamic> _activeTechnicians = [];
  List<dynamic> _assignments = [];
  bool _isLoading = true;

  final TextEditingController _searchController = TextEditingController();
  int _selectedFilterIndex = 0;
  String? _filterByTechnicianId;

  // 👈 لیست ذخیره آی‌دی ارجاعاتی که برای حذف گروهی تیک خورده‌اند
  final Set<String> _selectedAssignmentsToDelete = {};

  @override
  void initState() {
    super.initState();
    _fetchData();
    _searchController.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final bRes = await ApiClient().getBuildings();
      final uRes = await ApiClient().getUsers();
      final aRes = await ApiClient().getAllAssignments();

      if (mounted) {
        setState(() {
          _buildings = bRes;
          _allUsers = uRes;
          _activeTechnicians = uRes.where((u) => u['role'] == 'TECHNICIAN' && u['is_active'] == true).toList();
          _assignments = aRes;
          _selectedAssignmentsToDelete.clear(); // پاک کردن لیست حذف گروهی در صورت رفرش
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("خطا در دریافت اطلاعات: $e", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
      }
    }
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

  void _confirmDeleteAssignment(String assignmentId, String techName, String buildingName) {
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.orange),
              SizedBox(width: 8),
              Text("لغو ارجاع کار", style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: Text("آیا از لغو ارجاع «$techName» برای «$buildingName» اطمینان دارید؟\nاین عملیات غیرقابل بازگشت است.", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, height: 1.5)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("انصراف", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
              onPressed: () async {
                Navigator.pop(ctx);
                await _deleteAssignment(assignmentId);
              },
              child: const Text("بله، لغو شود", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteAssignment(String assignmentId) async {
    setState(() => _isLoading = true);
    try {
      final success = await ApiClient().deleteAssignment(assignmentId);
      if (success && mounted) {
        await _fetchData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("ارجاع با موفقیت لغو و حذف شد", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
      }
    }
  }

  // 👈 متدهای مربوط به لغو گروهی
  void _confirmBulkDeleteAssignments() {
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
              Text("لغو گروهی ارجاعات", style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: Text("آیا از لغو ${_selectedAssignmentsToDelete.length} ارجاع انتخاب‌شده اطمینان دارید؟\nاین عملیات غیرقابل بازگشت است.", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, height: 1.5)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("انصراف", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
              onPressed: () async {
                Navigator.pop(ctx);
                await _bulkDeleteAssignments();
              },
              child: const Text("بله، لغو شوند", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _bulkDeleteAssignments() async {
    setState(() => _isLoading = true);
    int successCount = 0;
    try {
      for (String id in _selectedAssignmentsToDelete) {
        final success = await ApiClient().deleteAssignment(id);
        if (success) successCount++;
      }
      if (mounted) {
        await _fetchData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$successCount ارجاع با موفقیت لغو گروهی شد", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("خطا در لغو گروهی: ${e.toString()}", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
      }
    }
  }

  List<dynamic> get _filteredBuildings {
    final query = _searchController.text.trim().toLowerCase();

    return _buildings.where((building) {
      final matchesSearch = building['name'].toString().toLowerCase().contains(query);
      final bAssignments = _assignments.where((a) => a['building_id'] == building['id'].toString()).toList();

      final hasTechnician = bAssignments.isNotEmpty;
      bool matchesStatusFilter = true;
      if (_selectedFilterIndex == 1) matchesStatusFilter = hasTechnician;
      if (_selectedFilterIndex == 2) matchesStatusFilter = !hasTechnician;

      bool matchesTechFilter = true;
      if (_filterByTechnicianId != null) {
        matchesTechFilter = bAssignments.any((a) => a['technician_id'].toString() == _filterByTechnicianId);
      }

      return matchesSearch && matchesStatusFilter && matchesTechFilter;
    }).toList();
  }

  // ========================================================
  // مودال ارجاع کار گروهی هوشمند (استخراج اتوماتیک تاریخ قراردادها)
  // ========================================================
  void _showAssignTaskModal() {
    final formKey = GlobalKey<FormState>();

    List<String> selectedBuildingIds = [];
    String? selectedTechnicianId;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
            builder: (context, setModalState) {
              return Container(
                height: MediaQuery.of(context).size.height * 0.85,
                padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
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
                          const Text("ارجاع به تکنسین", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textBlack)),
                          IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(context)),
                        ],
                      ),
                    ),
                    const Divider(),
                    Expanded(
                      child: Form(
                        key: formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("۱. انتخاب تکنسین:", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        isExpanded: true,
                                        hint: const Text("تکنسین را انتخاب کنید...", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, color: Colors.grey)),
                                        value: selectedTechnicianId,
                                        items: _activeTechnicians.map<DropdownMenuItem<String>>((t) => DropdownMenuItem(value: t['id'].toString(), child: Text(t['full_name'], style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14)))).toList(),
                                        onChanged: (val) => setModalState(() => selectedTechnicianId = val),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 16),

                                  // 👈 راهنمای تاریخ هوشمند
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.blue.shade200)),
                                    child: const Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Icon(Icons.info_outline, color: Colors.blue, size: 20),
                                        SizedBox(width: 8),
                                        Expanded(child: Text("تاریخ انجام هر ماموریت، به صورت خودکار برابر با تاریخ اتمام قرارداد همان ساختمان تنظیم خواهد شد.", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.blue, height: 1.5))),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const Divider(thickness: 4, color: Color(0xFFF0F0F0)),

                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text("۲. انتخاب ساختمان‌ها (گروهی):", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, fontWeight: FontWeight.bold)),
                                  Text("${selectedBuildingIds.length} مورد", style: const TextStyle(fontFamily: 'Vazirmatn', color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),

                            Expanded(
                              child: ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                physics: const BouncingScrollPhysics(),
                                itemCount: _buildings.length,
                                itemBuilder: (context, index) {
                                  final b = _buildings[index];
                                  final bId = b['id'].toString();
                                  final isChecked = selectedBuildingIds.contains(bId);

                                  return CheckboxListTile(
                                    title: Text(b['name'], style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, fontWeight: FontWeight.bold)),
                                    subtitle: Text(b['address'] ?? 'بدون آدرس', style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey.shade600), maxLines: 1),
                                    value: isChecked,
                                    activeColor: AppColors.primaryGreen,
                                    checkboxShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                    onChanged: (bool? val) {
                                      setModalState(() {
                                        if (val == true) {
                                          selectedBuildingIds.add(bId);
                                        } else {
                                          selectedBuildingIds.remove(bId);
                                        }
                                      });
                                    },
                                  );
                                },
                              ),
                            ),

                            // دکمه ثبت ارجاع گروهی
                            Padding(
                              padding: const EdgeInsets.all(24),
                              child: SizedBox(
                                width: double.infinity,
                                height: 55,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                                  onPressed: isSubmitting ? null : () async {
                                    if (selectedBuildingIds.isEmpty || selectedTechnicianId == null) {
                                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("لطفاً تکنسین و حداقل یک ساختمان را انتخاب کنید", style: TextStyle(fontFamily: 'Vazirmatn'))));
                                      return;
                                    }

                                    setModalState(() => isSubmitting = true);
                                    int successCount = 0;

                                    try {
                                      // 👈 استخراج اتوماتیک تاریخ قرارداد برای هر ساختمان انتخاب‌شده
                                      for (String bId in selectedBuildingIds) {
                                        final bAssignments = _assignments.where((a) => a['building_id'].toString() == bId).toList();
                                        if (bAssignments.any((a) => a['technician_id'].toString() == selectedTechnicianId)) continue; // جلوگیری از تکرار

                                        String targetDate = "";
                                        try {
                                          final contracts = await ApiClient().getBuildingContracts(bId);
                                          if (contracts.isNotEmpty) {
                                            final activeContract = contracts.firstWhere((c) => c['status'] == 'ACTIVE', orElse: () => contracts.first);
                                            final DateTime endDate = DateTime.parse(activeContract['end_date']);
                                            final Jalali shamsiDate = Jalali.fromDateTime(endDate);
                                            targetDate = "${shamsiDate.year}/${shamsiDate.month.toString().padLeft(2, '0')}/${shamsiDate.day.toString().padLeft(2, '0')}";
                                          } else {
                                            // در صورت نداشتن قرارداد، تاریخ امروز تنظیم می‌شود
                                            final today = Jalali.now();
                                            targetDate = "${today.year}/${today.month.toString().padLeft(2, '0')}/${today.day.toString().padLeft(2, '0')}";
                                          }
                                        } catch (e) {
                                          final today = Jalali.now();
                                          targetDate = "${today.year}/${today.month.toString().padLeft(2, '0')}/${today.day.toString().padLeft(2, '0')}";
                                        }

                                        final result = await ApiClient().assignTask({
                                          "building_id": bId,
                                          "technician_id": selectedTechnicianId,
                                          "task_date_shamsi": targetDate
                                        });
                                        if(result['success'] == true) successCount++;
                                      }

                                      if (context.mounted) {
                                        Navigator.pop(context);
                                        _fetchData();
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$successCount ماموریت هوشمندانه ارجاع داده شد", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
                                      }
                                    } catch (e) {
                                      setModalState(() => isSubmitting = false);
                                      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("خطا در تخصیص کار: $e", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
                                    }
                                  },
                                  child: isSubmitting
                                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                      : const Text("ثبت و ارجاع هوشمند", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'Vazirmatn')),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }
        );
      },
    );
  }

  Widget _buildBuildingsView() {
    final displayList = _filteredBuildings;
    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _searchController,
                style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14),
                decoration: InputDecoration(
                  hintText: "جستجوی نام ساختمان...",
                  hintStyle: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(icon: const Icon(Icons.clear, size: 18, color: Colors.grey), onPressed: () { _searchController.clear(); FocusScope.of(context).unfocus(); })
                      : null,
                  filled: true,
                  fillColor: Colors.grey.shade100,
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildFilterChip("همه (${_buildings.length})", 0),
                    const SizedBox(width: 8),
                    _buildFilterChip("بدون ارجاع", 2),
                    const SizedBox(width: 8),
                    _buildFilterChip("دارای تکنسین", 1),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: displayList.isEmpty
              ? const Center(child: Text("ساختمانی یافت نشد", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)))
              : ListView.builder(
            padding: const EdgeInsets.only(left: 20, right: 20, top: 12, bottom: 80),
            physics: const BouncingScrollPhysics(),
            itemCount: displayList.length,
            itemBuilder: (context, index) {
              final building = displayList[index];
              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 12),
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.shade200)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_city, color: Colors.blue, size: 20),
                          const SizedBox(width: 8),
                          Text(building['name'], style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textBlack)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Divider(),
                      Wrap(
                        children: _buildTechnicianBadgesForBuilding(building['id'].toString(), building['name'].toString()),
                      )
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTechniciansView() {
    if (_activeTechnicians.isEmpty) {
      return const Center(child: Text("تکنسین فعالی ثبت نشده است", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)));
    }

    return ListView.builder(
      padding: const EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 80),
      physics: const BouncingScrollPhysics(),
      itemCount: _activeTechnicians.length,
      itemBuilder: (context, index) {
        final tech = _activeTechnicians[index];
        final myAssignments = _assignments.where((a) => a['technician_id'].toString() == tech['id'].toString()).toList();

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: AppColors.primaryGreen.withValues(alpha: 0.3))),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(backgroundColor: AppColors.primaryGreen, radius: 16, child: Icon(Icons.engineering, color: Colors.white, size: 18)),
                    const SizedBox(width: 12),
                    Text(tech['full_name'], style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textBlack)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
                      child: Text("${myAssignments.length} پروژه", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold)),
                    )
                  ],
                ),
                if (myAssignments.isNotEmpty) ...[
                  const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
                  ...myAssignments.map((assignment) {
                    final b = _buildings.firstWhere((b) => b['id'].toString() == assignment['building_id'].toString(), orElse: () => {'name': 'نامشخص'});
                    final aId = assignment['id'].toString();

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Row(
                        children: [
                          // 👈 چک‌باکس‌های مربوط به حذف گروهی در لیست تکنسین‌ها
                          Checkbox(
                              value: _selectedAssignmentsToDelete.contains(aId),
                              activeColor: Colors.red.shade600,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              onChanged: (val) {
                                setState(() {
                                  if (val == true) {
                                    _selectedAssignmentsToDelete.add(aId);
                                  } else {
                                    _selectedAssignmentsToDelete.remove(aId);
                                  }
                                });
                              }
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(b['name'], style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.black87, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                                Text(_toShamsiDisplay(assignment['task_date_shamsi'] ?? assignment['created_at']), style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey)),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Icon(Icons.delete_outline, color: Colors.red.shade400, size: 18),
                            tooltip: 'لغو ارجاع',
                            onPressed: () => _confirmDeleteAssignment(aId, tech['full_name'], b['name'].toString()),
                          )
                        ],
                      ),
                    );
                  }),
                ] else ...[
                  const SizedBox(height: 12),
                  const Text("در حال حاضر پروژه‌ای به این تکنسین ارجاع نشده است.", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey)),
                ]
              ],
            ),
          ),
        );
      },
    );
  }

  List<Widget> _buildTechnicianBadgesForBuilding(String buildingId, String buildingName) {
    final bAssignments = _assignments.where((a) => a['building_id'].toString() == buildingId).toList();
    if (bAssignments.isEmpty) {
      return [
        Container(
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(8)),
          child: const Text("بدون تکنسین / ارجاع داده نشده", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey, fontSize: 11)),
        )
      ];
    }
    return bAssignments.map((assignment) {
      final tech = _allUsers.firstWhere(
              (t) => t['id'].toString() == assignment['technician_id'].toString(),
          orElse: () => {'full_name': 'تکنسین غیرفعال یا حذف شده'}
      );

      final cleanDate = _toShamsiDisplay(assignment['task_date_shamsi'] ?? assignment['created_at']);

      return GestureDetector(
        onTap: () => _confirmDeleteAssignment(assignment['id'].toString(), tech['full_name'], buildingName),
        child: Container(
          margin: const EdgeInsets.only(left: 8, top: 8),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.primaryGreen.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.engineering, size: 14, color: AppColors.primaryGreen),
              const SizedBox(width: 4),
              Text(
                  "${tech['full_name']} ($cleanDate)",
                  style: const TextStyle(fontFamily: 'Vazirmatn', color: AppColors.primaryGreen, fontSize: 11, fontWeight: FontWeight.bold)
              ),
            ],
          ),
        ),
      );
    }).toList();
  }

  Widget _buildFilterChip(String label, int index) {
    final isSelected = _selectedFilterIndex == index;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? Colors.white : Colors.grey.shade700)),
      selected: isSelected,
      selectedColor: AppColors.primaryGreen,
      backgroundColor: Colors.grey.shade100,
      side: BorderSide.none,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      onSelected: (selected) {
        if (selected) setState(() => _selectedFilterIndex = index);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: DefaultTabController(
        length: 2,
        child: Scaffold(
          backgroundColor: AppColors.backgroundWhite,
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            title: const Text("نظارت و ارجاع کار", style: TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontWeight: FontWeight.bold, fontSize: 18)),
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
                Tab(text: "ساختمان‌ها", icon: Icon(Icons.domain)),
                Tab(text: "تکنسین‌ها", icon: Icon(Icons.engineering)),
              ],
            ),
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
              : Stack(
            children: [
              TabBarView(
                children: [
                  _buildBuildingsView(),
                  _buildTechniciansView(),
                ],
              ),
              // 👈 دکمه شناور هوشمند: اگر در حال حذف گروهی باشیم تغییر می‌کند
              Positioned(
                bottom: 110,
                left: 16,
                child: _selectedAssignmentsToDelete.isNotEmpty
                    ? FloatingActionButton.extended(
                  backgroundColor: Colors.red.shade600,
                  onPressed: _confirmBulkDeleteAssignments,
                  icon: const Icon(Icons.delete_sweep, color: Colors.white),
                  label: Text("لغو ${_selectedAssignmentsToDelete.length} مورد", style: const TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold)),
                )
                    : FloatingActionButton.extended(
                  backgroundColor: AppColors.primaryGreen,
                  onPressed: _showAssignTaskModal,
                  icon: const Icon(Icons.assignment_ind, color: Colors.white),
                  label: const Text("ارجاع جدید", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}