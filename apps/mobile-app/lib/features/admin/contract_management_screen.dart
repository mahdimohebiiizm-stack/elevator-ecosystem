import 'package:flutter/material.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';
import '../../core/theme/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../core/services/pdf_generator_service.dart';

class ContractManagementScreen extends StatefulWidget {
  const ContractManagementScreen({super.key});

  @override
  State<ContractManagementScreen> createState() => _ContractManagementScreenState();
}

class _ContractManagementScreenState extends State<ContractManagementScreen> {
  List<dynamic> _contracts = [];
  List<dynamic> _buildings = [];
  bool _isLoading = true;

  final TextEditingController _searchController = TextEditingController();
  int _selectedFilterIndex = 0;

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
      final buildings = await ApiClient().getBuildings();

      List<dynamic> allContracts = [];
      for (var b in buildings) {
        final c = await ApiClient().getBuildingContracts(b['id'].toString());
        for (var contract in c) {
          contract['building_name'] = b['name'];
          allContracts.add(contract);
        }
      }

      if (mounted) {
        setState(() {
          _buildings = buildings;
          _contracts = allContracts;
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

  void _confirmDeleteContract(String contractId, String buildingName) {
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
              Text("حذف قرارداد", style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: Text("آیا از حذف قرارداد «$buildingName» اطمینان دارید؟\nاین عملیات غیرقابل بازگشت است.", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14)),
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
                  final success = await ApiClient().deleteContract(contractId);
                  if (success && mounted) {
                    _fetchData();
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("قرارداد با موفقیت حذف شد", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
                  }
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

  void _showAddOrEditContractModal({Map<String, dynamic>? contractData}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return _ContractFormModal(
          contractData: contractData,
          buildings: _buildings,
          onSuccess: () {
            Navigator.pop(context);
            _fetchData();
          },
        );
      },
    );
  }

  List<dynamic> get _filteredContracts {
    final query = _searchController.text.trim().toLowerCase();

    return _contracts.where((c) {
      final bName = c['building_name']?.toString().toLowerCase() ?? '';
      final eName = c['employer_name']?.toString().toLowerCase() ?? '';
      final status = c['status']?.toString() ?? '';

      final matchesSearch = bName.contains(query) || eName.contains(query);

      bool matchesFilter = true;
      if (_selectedFilterIndex == 1) matchesFilter = status == 'ACTIVE';
      if (_selectedFilterIndex == 2) matchesFilter = status == 'PENDING';
      if (_selectedFilterIndex == 3) matchesFilter = status != 'ACTIVE' && status != 'PENDING';

      return matchesSearch && matchesFilter;
    }).toList();
  }

  Widget _buildFilterChip(String label, int index) {
    final isSelected = _selectedFilterIndex == index;
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? Colors.white : Colors.grey.shade700)),
        selected: isSelected,
        selectedColor: AppColors.primaryGreen,
        backgroundColor: Colors.grey.shade100,
        side: BorderSide.none,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        onSelected: (selected) {
          if (selected) setState(() => _selectedFilterIndex = index);
        },
      ),
    );
  }

  // 🌟 تابع مرکزی و قطعی برای تبدیل ریال به تومان و حذف اعشار
  String _formatCurrency(dynamic value) {
    if (value == null) return "0";
    double val = double.tryParse(value.toString()) ?? 0.0;
    int tomanValue = (val / 10).toInt();
    return tomanValue.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
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

  String _translatePaymentFrequency(String? frequency) {
    switch (frequency) {
      case 'MONTHLY':
        return 'پرداخت ماهانه';
      case 'QUARTERLY':
        return 'پرداخت سه‌ماهه (فصلی)';
      default:
        return 'زمان پرداخت منعطف / نامشخص';
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayList = _filteredContracts;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundWhite,
        appBar: AppBar(
          title: const Text("مدیریت قراردادها", style: TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontSize: 18, fontWeight: FontWeight.bold)),
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: const IconThemeData(color: AppColors.textBlack),
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchData),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : Column(
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              child: Column(
                children: [
                  TextField(
                    controller: _searchController,
                    style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14),
                    decoration: InputDecoration(
                      hintText: "جستجوی ساختمان یا کارفرما...",
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
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: [
                        _buildFilterChip("همه", 0),
                        _buildFilterChip("فعال", 1),
                        _buildFilterChip("در انتظار", 2),
                        _buildFilterChip("پایان‌یافته", 3),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: displayList.isEmpty
                  ? Center(child: Text(_searchController.text.isNotEmpty ? "نتیجه‌ای یافت نشد" : "قراردادی در این بخش یافت نشد", style: const TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)))
                  : ListView.builder(
                padding: const EdgeInsets.all(20),
                physics: const BouncingScrollPhysics(),
                itemCount: displayList.length,
                itemBuilder: (context, index) {
                  final contract = displayList[index];
                  final String status = contract['status'] ?? 'UNKNOWN';

                  String statusText = 'پایان‌یافته';
                  Color statusColor = Colors.grey.shade700;
                  Color statusBg = Colors.grey.shade200;
                  Color cardBorderColor = Colors.grey.shade300;

                  if (status == 'ACTIVE') {
                    statusText = 'فعال';
                    statusColor = Colors.green;
                    statusBg = Colors.green.withValues(alpha: 0.1);
                    cardBorderColor = Colors.green.shade200;
                  } else if (status == 'PENDING') {
                    statusText = 'در انتظار';
                    statusColor = Colors.orange.shade800;
                    statusBg = Colors.orange.withValues(alpha: 0.1);
                    cardBorderColor = Colors.orange.shade200;
                  }

                  // 🌟 فراخوانی تابع مرکزی برای رفع مشکل نمایشی
                  final totalAmountFormatted = _formatCurrency(contract['total_amount']);

                  final shamsiStart = _toShamsiDisplay(contract['start_date']);
                  final shamsiEnd = _toShamsiDisplay(contract['end_date']);

                  final contractNo = contract['contract_number'] ?? contract['id'].toString().substring(0, 8).toUpperCase();

                  return Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 12),
                    color: status == 'ACTIVE' ? Colors.white : Colors.grey.shade50,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: cardBorderColor),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => _showAddOrEditContractModal(contractData: contract),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.description, color: statusColor, size: 20),
                                    const SizedBox(width: 8),
                                    Text(contract['building_name'] ?? 'نامشخص', style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 15)),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(8)),
                                      child: Text(statusText, style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 10, fontWeight: FontWeight.bold, color: statusColor)),
                                    ),
                                    const SizedBox(width: 8),
                                    GestureDetector(
                                      onTap: () {
                                        PdfGeneratorService.generateContractPdf(
                                          contractNumber: contractNo,
                                          employerName: contract['employer_name'] ?? '-',
                                          buildingName: contract['building_name'] ?? '-',
                                          startDate: shamsiStart,
                                          endDate: shamsiEnd,
                                          totalAmount: totalAmountFormatted,
                                          paymentFrequency: _translatePaymentFrequency(contract['payment_frequency']),
                                        );
                                      },
                                      child: const Icon(Icons.print_rounded, color: Colors.blue, size: 20),
                                    ),
                                    const SizedBox(width: 12),
                                    GestureDetector(
                                      onTap: () => _confirmDeleteContract(contract['id'].toString(), contract['building_name']),
                                      child: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                    )
                                  ],
                                )
                              ],
                            ),
                            const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
                            Text("کارفرما: ${contract['employer_name']}", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey.shade800)),
                            const SizedBox(height: 4),
                            Text("مدت: از $shamsiStart تا $shamsiEnd", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade600)),
                            const SizedBox(height: 8),
                            Text("مبلغ کل: $totalAmountFormatted تومان", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, fontWeight: FontWeight.bold, color: Colors.blue)),
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
          onPressed: () => _showAddOrEditContractModal(),
          icon: const Icon(Icons.add, color: Colors.white),
          label: const Text("ثبت قرارداد جدید", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }
}

class _ContractFormModal extends StatefulWidget {
  final Map<String, dynamic>? contractData;
  final List<dynamic> buildings;
  final VoidCallback onSuccess;

  const _ContractFormModal({this.contractData, required this.buildings, required this.onSuccess});

  @override
  State<_ContractFormModal> createState() => _ContractFormModalState();
}

class _ContractFormModalState extends State<_ContractFormModal> {
  final _formKey = GlobalKey<FormState>();

  String? _selectedBuildingId;
  Jalali? _startDate;
  Jalali? _endDate;
  late String _selectedPaymentFrequency;
  late String _selectedStatus;
  bool _isSubmitting = false;

  late final TextEditingController _employerNameController;
  late final TextEditingController _nationalIdController;
  late final TextEditingController _phoneController;
  late final TextEditingController _amountController;
  late final TextEditingController _periodicFeeController;
  late final TextEditingController _startDateDisplay;
  late final TextEditingController _endDateDisplay;

  bool get isEditMode => widget.contractData != null;

  Jalali? _parseJalali(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return null;
    try {
      if (dateStr.startsWith('13') || dateStr.startsWith('14')) {
        final parts = dateStr.split('-');
        return Jalali(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
      }
      return Jalali.fromDateTime(DateTime.parse(dateStr));
    } catch (e) {
      return null;
    }
  }

  @override
  void initState() {
    super.initState();
    final data = widget.contractData ?? {};

    _selectedBuildingId = data['building_id']?.toString();
    _employerNameController = TextEditingController(text: data['employer_name']?.toString() ?? '');
    _nationalIdController = TextEditingController(text: data['employer_national_id']?.toString() ?? '');
    _phoneController = TextEditingController(text: data['employer_phone']?.toString() ?? '');

    final double rawAmountRial = double.tryParse(data['total_amount']?.toString() ?? '0') ?? 0;
    final double rawFeeRial = double.tryParse(data['monthly_fee']?.toString() ?? '0') ?? 0;

    String amountTomanStr = rawAmountRial > 0 ? (rawAmountRial / 10).toInt().toString() : '';
    String feeTomanStr = rawFeeRial > 0 ? (rawFeeRial / 10).toInt().toString() : '';

    _amountController = TextEditingController(text: amountTomanStr.replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},'));
    _periodicFeeController = TextEditingController(text: feeTomanStr.replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},'));

    _startDateDisplay = TextEditingController();
    _endDateDisplay = TextEditingController();

    _startDate = _parseJalali(data['start_date']);
    if (_startDate != null) {
      _startDateDisplay.text = "${_startDate!.year}/${_startDate!.month.toString().padLeft(2, '0')}/${_startDate!.day.toString().padLeft(2, '0')}";
    }

    _endDate = _parseJalali(data['end_date']);
    if (_endDate != null) {
      _endDateDisplay.text = "${_endDate!.year}/${_endDate!.month.toString().padLeft(2, '0')}/${_endDate!.day.toString().padLeft(2, '0')}";
    }

    _selectedPaymentFrequency = data['payment_frequency'] ?? 'MONTHLY';
    _selectedStatus = data['status'] ?? 'PENDING';
  }

  @override
  void dispose() {
    _employerNameController.dispose();
    _nationalIdController.dispose();
    _phoneController.dispose();
    _amountController.dispose();
    _periodicFeeController.dispose();
    _startDateDisplay.dispose();
    _endDateDisplay.dispose();
    super.dispose();
  }

  Future<void> selectDate(bool isStart) async {
    Jalali? picked = await showPersianDatePicker(
      context: context,
      initialDate: (isStart ? _startDate : _endDate) ?? Jalali.now(),
      firstDate: Jalali(1390, 1),
      lastDate: Jalali(1450, 12),
    );

    if (picked != null) {
      setState(() {
        final formattedDate = "${picked.year}/${picked.month.toString().padLeft(2, '0')}/${picked.day.toString().padLeft(2, '0')}";
        if (isStart) {
          _startDate = picked;
          _startDateDisplay.text = formattedDate;
        } else {
          _endDate = picked;
          _endDateDisplay.text = formattedDate;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedBuildingId == null || _startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("لطفاً فیلدهای الزامی را پر کنید", style: TextStyle(fontFamily: 'Vazirmatn'))));
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      double totalAmountToman = double.parse(_amountController.text.replaceAll(',', ''));
      double periodicFeeToman = _periodicFeeController.text.isNotEmpty ? double.parse(_periodicFeeController.text.replaceAll(',', '')) : 0;

      final payload = {
        "building_id": _selectedBuildingId,
        "employer_name": _employerNameController.text.trim(),
        "employer_national_id": _nationalIdController.text.trim(),
        "employer_phone": _phoneController.text.trim(),
        "start_date": _startDate!.toDateTime().toIso8601String().split('T')[0],
        "end_date": _endDate!.toDateTime().toIso8601String().split('T')[0],
        "total_amount": totalAmountToman * 10,
        "monthly_fee": periodicFeeToman * 10,
        "payment_frequency": _selectedPaymentFrequency,
        "status": _selectedStatus,
      };

      if (isEditMode) {
        await ApiClient().updateContract(widget.contractData!['id'].toString(), payload);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("قرارداد با موفقیت ویرایش شد", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
      } else {
        await ApiClient().createContract(payload);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("قرارداد با موفقیت ثبت شد", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
      }

      widget.onSuccess();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("خطا: ${e.toString()}", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 16),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primaryGreen, size: 20),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textBlack)),
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
                Text(isEditMode ? "ویرایش اطلاعات قرارداد" : "ثبت پیش‌نویس / قرارداد جدید", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionTitle("وضعیت قرارداد", Icons.info_outline),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(color: _selectedStatus == 'ACTIVE' ? Colors.green.shade50 : Colors.orange.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: _selectedStatus == 'ACTIVE' ? Colors.green.shade200 : Colors.orange.shade200)),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: _selectedStatus,
                          items: const [
                            DropdownMenuItem(value: 'PENDING', child: Text("در انتظار / پیش‌نویس (هنوز قطعی نشده)", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, color: Colors.orange))),
                            DropdownMenuItem(value: 'ACTIVE', child: Text("فعال (قرارداد قطعی شده)", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, color: Colors.green))),
                            DropdownMenuItem(value: 'EXPIRED', child: Text("پایان‌‌یافته / لغو شده", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, color: Colors.grey))),
                          ],
                          onChanged: (val) => setState(() => _selectedStatus = val!),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    _buildSectionTitle("ساختمان طرف قرارداد", Icons.domain),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          hint: const Text("انتخاب ساختمان...", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, color: Colors.grey)),
                          value: _selectedBuildingId,
                          items: widget.buildings.map<DropdownMenuItem<String>>((b) => DropdownMenuItem(value: b['id'].toString(), child: Text(b['name'], style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14)))).toList(),
                          onChanged: isEditMode ? null : (val) => setState(() => _selectedBuildingId = val),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    _buildSectionTitle("اطلاعات کارفرما", Icons.person_outline),
                    CustomTextField(controller: _employerNameController, hint: "نام کامل کارفرما (الزامی)", isRequired: true),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: CustomTextField(controller: _nationalIdController, hint: "کد ملی", isNumber: true)),
                        const SizedBox(width: 12),
                        Expanded(child: CustomTextField(controller: _phoneController, hint: "شماره تماس", isNumber: true, isRequired: true)),
                      ],
                    ),

                    _buildSectionTitle("بازه زمانی قرارداد", Icons.calendar_month),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: CustomTextField(controller: _startDateDisplay, hint: "تاریخ شروع", readOnly: true, isRequired: true, onTap: () => selectDate(true), suffixIcon: const Icon(Icons.calendar_today, size: 18, color: Colors.grey))),
                        const SizedBox(width: 12),
                        Expanded(child: CustomTextField(controller: _endDateDisplay, hint: "تاریخ پایان", readOnly: true, isRequired: true, onTap: () => selectDate(false), suffixIcon: const Icon(Icons.calendar_today, size: 18, color: Colors.grey))),
                      ],
                    ),

                    _buildSectionTitle("اطلاعات مالی و پرداخت", Icons.monetization_on_outlined),
                    CustomTextField(controller: _amountController, hint: "مبلغ کل قرارداد (تومان)", isCurrency: true, isRequired: true),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: _selectedPaymentFrequency,
                          items: const [
                            DropdownMenuItem(value: 'MONTHLY', child: Text("پرداخت ماهانه", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14))),
                            DropdownMenuItem(value: 'QUARTERLY', child: Text("پرداخت سه‌ماهه", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14))),
                            DropdownMenuItem(value: 'FLEXIBLE', child: Text("زمان پرداخت منعطف", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14))),
                          ],
                          onChanged: (val) => setState(() => _selectedPaymentFrequency = val!),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(controller: _periodicFeeController, hint: "مبلغ هر دوره / قسط", isCurrency: true),

                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: isEditMode ? Colors.blue.shade600 : AppColors.primaryGreen, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                        onPressed: _isSubmitting ? null : _submit,
                        child: _isSubmitting
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Text(isEditMode ? "ذخیره تغییرات" : "ثبت و ذخیره قرارداد", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'Vazirmatn')),
                      ),
                    ),
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