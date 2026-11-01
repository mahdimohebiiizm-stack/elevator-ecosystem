import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../core/widgets/custom_text_field.dart';

class BuildingManagementScreen extends StatefulWidget {
  const BuildingManagementScreen({super.key});

  @override
  State<BuildingManagementScreen> createState() => _BuildingManagementScreenState();
}

class _BuildingManagementScreenState extends State<BuildingManagementScreen> {
  List<dynamic> _buildings = [];
  bool _isLoading = true;
  final TextEditingController _searchController = TextEditingController(); // 👈 کنترلر جستجو

  @override
  void initState() {
    super.initState();
    _fetchBuildings();
    _searchController.addListener(() {
      setState(() {}); // 👈 آپدیت لحظه‌ای لیست هنگام تایپ
    });
  }

  @override
  void dispose() {
    _searchController.dispose(); // 👈 جلوگیری از نشت حافظه
    super.dispose();
  }

  Future<void> _fetchBuildings() async {
    setState(() => _isLoading = true);
    try {
      final buildings = await ApiClient().getBuildings();
      if (mounted) {
        setState(() {
          _buildings = buildings;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("خطا در دریافت لیست پروژه‌ها: $e", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red),
        );
      }
    }
  }

  // -------------------------------------------------------------
  // متد حذف ساختمان با پیام تایید
  // -------------------------------------------------------------
  void _confirmDeleteBuilding(String buildingId, String buildingName) {
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: Colors.red),
              SizedBox(width: 8),
              Text("حذف ساختمان", style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: Text("آیا از حذف ساختمان «$buildingName» اطمینان دارید؟\nدقت کنید که این عملیات فقط ساختمان را از لیست مخفی می‌کند (Soft Delete).", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14)),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text("انصراف", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey, fontWeight: FontWeight.bold))
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              onPressed: () async {
                Navigator.pop(ctx);
                setState(() => _isLoading = true);
                try {
                  final success = await ApiClient().deleteBuilding(buildingId);
                  if (success && mounted) {
                    _fetchBuildings();
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("ساختمان با موفقیت حذف شد", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
                  }
                } catch (e) {
                  setState(() => _isLoading = false);
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
                }
              },
              child: const Text("بله، حذف شود", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // متد هوشمند برای باز کردن فرم (ثبت جدید / ویرایش)
  // -------------------------------------------------------------
  void _showAddOrEditBuildingModal({Map<String, dynamic>? buildingData}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return _BuildingFormModal(
          buildingData: buildingData,
          onSuccess: () {
            Navigator.pop(context);
            _fetchBuildings();
          },
        );
      },
    );
  }

  // 👈 منطق جستجو
  List<dynamic> get _filteredBuildings {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _buildings;

    return _buildings.where((b) {
      final name = b['name']?.toString().toLowerCase() ?? '';
      final address = b['address']?.toString().toLowerCase() ?? '';
      final manager = b['manager_name']?.toString().toLowerCase() ?? '';
      return name.contains(query) || address.contains(query) || manager.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final displayList = _filteredBuildings;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundWhite,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: const IconThemeData(color: AppColors.textBlack),
          title: const Text("مدیریت ساختمان‌ها", style: TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontWeight: FontWeight.bold, fontSize: 18)),
          centerTitle: true,
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchBuildings),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : Column(
          children: [
            // 👈 نوار جستجو
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14),
                decoration: InputDecoration(
                  hintText: "جستجوی ساختمان، آدرس یا مدیر...",
                  hintStyle: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(icon: const Icon(Icons.clear, size: 18, color: Colors.grey), onPressed: () => _searchController.clear())
                      : null,
                  filled: true,
                  fillColor: Colors.grey.shade100,
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
            ),
            Expanded(
              child: displayList.isEmpty
                  ? Center(child: Text(_searchController.text.isNotEmpty ? "نتیجه‌ای یافت نشد" : "هیچ ساختمانی ثبت نشده است", style: const TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)))
                  : ListView.builder(
                padding: const EdgeInsets.all(20),
                physics: const BouncingScrollPhysics(),
                itemCount: displayList.length,
                itemBuilder: (context, index) {
                  final building = displayList[index];
                  return Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 12),
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => _showAddOrEditBuildingModal(buildingData: building),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.domain, color: Colors.orange, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(building['name'] ?? 'نامشخص', style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on_outlined, size: 14, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          building['address'] ?? 'آدرس ثبت نشده',
                                          style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade600),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (building['manager_name'] != null && building['manager_name'].toString().isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.person_outline, size: 14, color: Colors.grey),
                                        const SizedBox(width: 4),
                                        Text(
                                          "مدیر: ${building['manager_name']}",
                                          style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade600),
                                        ),
                                      ],
                                    ),
                                  ]
                                ],
                              ),
                            ),
                            // دکمه‌های کنترلی (حذف + ویرایش)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                                  tooltip: 'حذف ساختمان',
                                  onPressed: () => _confirmDeleteBuilding(building['id'].toString(), building['name'] ?? 'نامشخص'),
                                ),
                                Icon(Icons.edit_note_rounded, size: 22, color: AppColors.primaryGreen.withValues(alpha: 0.7)),
                              ],
                            )
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          backgroundColor: AppColors.primaryGreen,
          onPressed: () => _showAddOrEditBuildingModal(),
          icon: const Icon(Icons.add, color: Colors.white),
          label: const Text("ثبت پروژه جدید", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }
}

// =========================================================
// 🌟 ویجت مستقل فرم (هوشمند برای جلوگیری از نشت حافظه)
// =========================================================
class _BuildingFormModal extends StatefulWidget {
  final Map<String, dynamic>? buildingData;
  final VoidCallback onSuccess;

  const _BuildingFormModal({this.buildingData, required this.onSuccess});

  @override
  State<_BuildingFormModal> createState() => _BuildingFormModalState();
}

class _BuildingFormModalState extends State<_BuildingFormModal> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController nameController;
  late final TextEditingController addressController;
  late final TextEditingController postalCodeController;
  late final TextEditingController registrationPlateController;
  late final TextEditingController managerNameController;
  late final TextEditingController managerNationalIdController;
  late final TextEditingController managerPhoneController;
  late final TextEditingController stopsController;
  late final TextEditingController capacityController;
  late final TextEditingController speedController;

  late String selectedUsageType;
  bool isSubmitting = false;

  bool get isEditMode => widget.buildingData != null;

  @override
  void initState() {
    super.initState();
    final data = widget.buildingData ?? {};

    nameController = TextEditingController(text: data['name']?.toString() ?? '');
    addressController = TextEditingController(text: data['address']?.toString() ?? '');
    postalCodeController = TextEditingController(text: data['postal_code']?.toString() ?? '');
    registrationPlateController = TextEditingController(text: data['registration_plate']?.toString() ?? '');

    managerNameController = TextEditingController(text: data['manager_name']?.toString() ?? '');
    managerNationalIdController = TextEditingController(text: data['manager_national_id']?.toString() ?? '');
    managerPhoneController = TextEditingController(text: data['manager_phone']?.toString() ?? '');

    stopsController = TextEditingController(text: data['elevator_stops']?.toString() ?? '');
    capacityController = TextEditingController(text: data['elevator_capacity']?.toString() ?? '');
    speedController = TextEditingController(text: data['elevator_speed']?.toString() ?? '');

    final validUsages = ['مسافری', 'باربری', 'بیمارستانی', 'خودروبر'];
    selectedUsageType = validUsages.contains(data['elevator_usage_type'])
        ? data['elevator_usage_type']
        : 'مسافری';
  }

  @override
  void dispose() {
    nameController.dispose();
    addressController.dispose();
    postalCodeController.dispose();
    registrationPlateController.dispose();
    managerNameController.dispose();
    managerNationalIdController.dispose();
    managerPhoneController.dispose();
    stopsController.dispose();
    capacityController.dispose();
    speedController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => isSubmitting = true);

    try {
      final payload = {
        "name": nameController.text.trim(),
        "address": addressController.text.trim(),
        "postal_code": postalCodeController.text.trim(),
        "registration_plate": registrationPlateController.text.trim(),
        "manager_name": managerNameController.text.trim(),
        "manager_national_id": managerNationalIdController.text.trim(),
        "manager_phone": managerPhoneController.text.trim(),
        "elevator_stops": int.tryParse(stopsController.text.trim()) ?? 0,
        "elevator_capacity": int.tryParse(capacityController.text.trim()) ?? 0,
        "elevator_speed": double.tryParse(speedController.text.trim()) ?? 1.0,
        "elevator_usage_type": selectedUsageType,
      };

      if (isEditMode) {
        await ApiClient().updateBuilding(widget.buildingData!['id'].toString(), payload);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("اطلاعات ساختمان با موفقیت ویرایش شد", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
      } else {
        await ApiClient().createBuilding(payload);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("ساختمان جدید با موفقیت ثبت شد", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
      }

      widget.onSuccess();

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => isSubmitting = false);
    }
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16, top: 8),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primaryGreen, size: 22),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textBlack)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
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
                Text(isEditMode ? "ویرایش اطلاعات ساختمان" : "ثبت ساختمان و آسانسور جدید", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textBlack)),
                IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionHeader("اطلاعات پایه ساختمان", Icons.domain),
                    CustomTextField(controller: nameController, hint: "نام ساختمان / پروژه (الزامی)", isRequired: true, icon: Icons.business),
                    CustomTextField(controller: addressController, hint: "آدرس دقیق", isRequired: true, icon: Icons.location_on_outlined),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: CustomTextField(controller: postalCodeController, hint: "کد پستی", isNumber: true)),
                        const SizedBox(width: 12),
                        Expanded(child: CustomTextField(controller: registrationPlateController, hint: "پلاک ثبتی")),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildSectionHeader("اطلاعات کارفرما / مدیر", Icons.person_outline),
                    CustomTextField(controller: managerNameController, hint: "نام کامل مدیر ساختمان (الزامی)", isRequired: true, icon: Icons.person),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: CustomTextField(controller: managerNationalIdController, hint: "کد ملی", isNumber: true)),
                        const SizedBox(width: 12),
                        Expanded(child: CustomTextField(controller: managerPhoneController, hint: "شماره تماس", isNumber: true, isRequired: true)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildSectionHeader("مشخصات فنی آسانسور (جهت قرارداد)", Icons.elevator_outlined),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: CustomTextField(controller: stopsController, hint: "تعداد توقف", isNumber: true, isRequired: true)),
                        const SizedBox(width: 12),
                        Expanded(child: CustomTextField(controller: capacityController, hint: "ظرفیت (مثلا: ۴۵۰)", isNumber: true)),
                      ],
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: CustomTextField(controller: speedController, hint: "سرعت (m/s)", isNumber: true)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                isExpanded: true,
                                value: selectedUsageType,
                                style: const TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontSize: 14),
                                items: const [
                                  DropdownMenuItem(value: 'مسافری', child: Text("مسافری", style: TextStyle(fontFamily: 'Vazirmatn'))),
                                  DropdownMenuItem(value: 'باربری', child: Text("باربری", style: TextStyle(fontFamily: 'Vazirmatn'))),
                                  DropdownMenuItem(value: 'بیمارستانی', child: Text("بیمارستانی (تخت‌بر)", style: TextStyle(fontFamily: 'Vazirmatn'))),
                                  DropdownMenuItem(value: 'خودروبر', child: Text("خودروبر", style: TextStyle(fontFamily: 'Vazirmatn'))),
                                ],
                                onChanged: (val) => setState(() => selectedUsageType = val!),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isEditMode ? Colors.blue.shade600 : AppColors.primaryGreen,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 2,
                        ),
                        onPressed: isSubmitting ? null : _submit,
                        child: isSubmitting
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Text(isEditMode ? "ذخیره تغییرات" : "ثبت و ذخیره پروژه", style: const TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}