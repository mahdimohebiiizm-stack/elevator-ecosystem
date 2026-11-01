import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../data/finance_repository.dart';
import '../../../core/utils/app_formatters.dart'; // 👈 اضافه شدن هسته مرکزی فرمت‌ها
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class ContractFinanceDetailsScreen extends StatefulWidget {
  const ContractFinanceDetailsScreen({super.key});

  @override
  State<ContractFinanceDetailsScreen> createState() => _ContractFinanceDetailsScreenState();
}

class _ContractFinanceDetailsScreenState extends State<ContractFinanceDetailsScreen> {
  final FinanceRepository _financeRepository = FinanceRepository();
  List<dynamic> _activeContracts = [];
  Map<String, String> _buildingNames = {};
  bool _isLoading = true;
  final TextEditingController _searchController = TextEditingController();

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
      final buildings = await _financeRepository.getBuildings();
      final activeContracts = await _financeRepository.getActiveContracts();

      Map<String, String> bMap = {};
      for (var b in buildings) {
        bMap[b['id'].toString()] = b['name'].toString();
      }

      if (mounted) {
        setState(() {
          _buildingNames = bMap;
          _activeContracts = activeContracts;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("خطا در دریافت لیست قراردادها", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
      }
    }
  }

  List<dynamic> get _filteredContracts {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _activeContracts;

    return _activeContracts.where((c) {
      final bId = c['building_id'].toString();
      final bName = (_buildingNames[bId] ?? '').toLowerCase();
      final eName = c['employer_name']?.toString().toLowerCase() ?? '';
      return bName.contains(query) || eName.contains(query);
    }).toList();
  }

  Future<void> _generateAndDownloadPdf(Map<String, dynamic> contract, List<dynamic> payments, String bName) async {
    final font = await PdfGoogleFonts.vazirmatnRegular();
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        theme: pw.ThemeData(defaultTextStyle: pw.TextStyle(font: font, fontSize: 12)),
        build: (pw.Context context) {
          return pw.Directionality(
              textDirection: pw.TextDirection.rtl,
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Center(
                    child: pw.Text("گزارش وضعیت مالی و تراکنش‌ها", style: pw.TextStyle(font: font, fontSize: 24, fontWeight: pw.FontWeight.bold)),
                  ),
                  pw.SizedBox(height: 30),

                  pw.Container(
                    padding: const pw.EdgeInsets.all(15),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.grey100,
                      border: pw.Border.all(color: PdfColors.grey400),
                      borderRadius: const pw.BorderRadius.all(pw.Radius.circular(10)),
                    ),
                    child: pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Text("ساختمان: $bName", style: pw.TextStyle(font: font, fontWeight: pw.FontWeight.bold)),
                              pw.SizedBox(height: 5),
                              pw.Text("کارفرما: ${contract['employer_name']}", style: pw.TextStyle(font: font)),
                            ],
                          ),
                          pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Text("مبلغ قرارداد: ${AppFormatters.rialToToman(contract['total_amount'])} تومان", style: pw.TextStyle(font: font)),
                              pw.SizedBox(height: 5),
                              pw.Text("بدهی فعلی: ${AppFormatters.rialToToman(contract['total_debt'])} تومان", style: pw.TextStyle(font: font, color: PdfColors.red800, fontWeight: pw.FontWeight.bold)),
                            ],
                          ),
                        ]
                    ),
                  ),

                  pw.SizedBox(height: 30),
                  pw.Text("لیست پرداختی‌های ثبت شده:", style: pw.TextStyle(font: font, fontSize: 16, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 15),

                  if (payments.isEmpty)
                    pw.Text("تاکنون تراکنشی برای این قرارداد ثبت نشده است.", style: pw.TextStyle(font: font, color: PdfColors.grey600))
                  else
                    pw.TableHelper.fromTextArray(
                      context: context,
                      cellAlignment: pw.Alignment.center,
                      headerStyle: pw.TextStyle(font: font, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                      headerDecoration: const pw.BoxDecoration(color: PdfColors.blue800),
                      cellStyle: pw.TextStyle(font: font),
                      headers: ['مبلغ (تومان)', 'تاریخ پرداخت', 'روش', 'کد پیگیری'],
                      data: payments.map((tx) => [
                        AppFormatters.rialToToman(tx['amount']),
                        AppFormatters.toShamsi(tx['payment_date']),
                        tx['payment_method'] == 'CASH' ? 'نقدی' : (tx['payment_method'] == 'CHECK' ? 'چک' : 'واریز'),
                        tx['tracking_code'] ?? '-'
                      ]).toList(),
                    ),
                ],
              )
          );
        },
      ),
    );

    final bytes = await pdf.save();
    await Printing.sharePdf(bytes: bytes, filename: 'Finance_Report_${contract['contract_number'] ?? bName}.pdf');
  }

  void _showContractFinancialDetails(Map<String, dynamic> contract, String bName) async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final double totalAmount = (contract['total_amount'] ?? 0).toDouble();
        final double totalDebt = (contract['total_debt'] ?? 0).toDouble();
        final double paidAmount = totalAmount - totalDebt;
        final double progress = totalAmount > 0 ? (paidAmount / totalAmount) : 0.0;

        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: const BoxDecoration(
            color: AppColors.backgroundWhite,
            borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(margin: const EdgeInsets.only(top: 12, bottom: 8), width: 40, height: 5, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("پرونده مالی قرارداد", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(context)),
                  ],
                ),
              ),
              const Divider(),

              Padding(
                padding: const EdgeInsets.all(20),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 15, offset: const Offset(0, 8))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("پروژه: $bName", style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 6),
                      Text("کارفرما: ${contract['employer_name']}", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey.shade600)),
                      const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Divider()),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("وضعیت تسویه", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, fontWeight: FontWeight.bold)),
                          Text("${(progress * 100).toInt()}٪", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 16, fontWeight: FontWeight.bold, color: progress >= 1.0 ? Colors.green : Colors.blue.shade700)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 12,
                          backgroundColor: Colors.grey.shade100,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            progress >= 1.0 ? Colors.green : (progress > 0.5 ? Colors.blue : Colors.orange),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("مبلغ کل", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey)),
                              const SizedBox(height: 4),
                              Text(AppFormatters.rialToToman(totalAmount), style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 15, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text("بدهی باقی‌مانده", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey)),
                              const SizedBox(height: 4),
                              Text(AppFormatters.rialToToman(totalDebt), style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 15, fontWeight: FontWeight.bold, color: totalDebt > 0 ? Colors.red : Colors.green)),
                            ],
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              ),

              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Text("تاریخچه واریزی‌های این قرارداد", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 12),

              Expanded(
                child: FutureBuilder<List<dynamic>>(
                  future: _financeRepository.getContractPayments(contract['id'].toString()),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen));
                    }
                    if (snapshot.hasError) {
                      return const Center(child: Text("خطا در دریافت تاریخچه تراکنش‌ها", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.red)));
                    }

                    final payments = snapshot.data ?? [];

                    return Column(
                      children: [
                        if (payments.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                            child: SizedBox(
                              width: double.infinity,
                              height: 45,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.blue.shade50,
                                    foregroundColor: Colors.blue.shade800,
                                    elevation: 0,
                                    // 👈 ارور Border اینجا کاملاً رفع شده است:
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.blue.shade200))
                                ),
                                onPressed: () => _generateAndDownloadPdf(contract, payments, bName),
                                icon: const Icon(Icons.download_rounded, size: 20),
                                label: const Text("دانلود فایل PDF تراکنش‌ها", style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ),
                        Expanded(
                          child: payments.isEmpty
                              ? const Center(child: Text("تاکنون پرداختی برای این قرارداد ثبت نشده است.", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)))
                              : ListView.builder(
                            padding: const EdgeInsets.only(left: 20, right: 20, bottom: 40),
                            physics: const BouncingScrollPhysics(),
                            itemCount: payments.length,
                            itemBuilder: (context, index) {
                              final tx = payments[index];
                              String methodText = "نقدی";
                              Color methodColor = Colors.green;
                              IconData methodIcon = Icons.payments_outlined;

                              if (tx['payment_method'] == 'CHECK') {
                                methodText = "چک بانکی";
                                methodColor = Colors.orange;
                                methodIcon = Icons.fact_check_outlined;
                              } else if (tx['payment_method'] == 'TRANSFER') {
                                methodText = "واریز بانکی";
                                methodColor = Colors.blue;
                                methodIcon = Icons.credit_card_outlined;
                              }

                              return Card(
                                elevation: 0,
                                margin: const EdgeInsets.only(bottom: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.shade100)),
                                child: ListTile(
                                  leading: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(color: methodColor.withValues(alpha: 0.1), shape: BoxShape.circle),
                                    child: Icon(methodIcon, color: methodColor, size: 22),
                                  ),
                                  title: Text("${AppFormatters.rialToToman(tx['amount'])} تومان", style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 14)),
                                  subtitle: Text("تاریخ: ${AppFormatters.toShamsi(tx['payment_date'])}\n${tx['tracking_code'] != null ? 'کد پیگیری: ${tx['tracking_code']}' : ''}", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade600, height: 1.5)),
                                  isThreeLine: tx['tracking_code'] != null,
                                  trailing: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(color: methodColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                                    child: Text(methodText, style: TextStyle(color: methodColor, fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn')),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
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
    final displayList = _filteredContracts;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundWhite,
        appBar: AppBar(
          title: const Text("گزارشات و جزئیات قراردادها", style: TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontSize: 18, fontWeight: FontWeight.bold)),
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: const IconThemeData(color: AppColors.textBlack),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : Column(
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              child: TextField(
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
                  fillColor: Colors.grey.shade50,
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                ),
              ),
            ),
            Expanded(
              child: displayList.isEmpty
                  ? const Center(child: Text("قراردادی یافت نشد", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)))
                  : ListView.builder(
                padding: const EdgeInsets.all(20),
                physics: const BouncingScrollPhysics(),
                itemCount: displayList.length,
                itemBuilder: (context, index) {
                  final contract = displayList[index];
                  final double debt = (contract['total_debt'] ?? 0).toDouble();
                  final double total = (contract['total_amount'] ?? 0).toDouble();
                  final progress = total > 0 ? ((total - debt) / total) : 0.0;

                  final buildingName = _buildingNames[contract['building_id'].toString()] ?? 'نامشخص';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey.shade200),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () => _showContractFinancialDetails(contract, buildingName),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 50,
                              height: 50,
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  CircularProgressIndicator(
                                    value: progress,
                                    strokeWidth: 5,
                                    backgroundColor: Colors.grey.shade100,
                                    valueColor: AlwaysStoppedAnimation<Color>(progress >= 1.0 ? Colors.green : Colors.blue),
                                  ),
                                  Center(child: Text("${(progress * 100).toInt()}٪", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, fontWeight: FontWeight.bold))),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(buildingName, style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16)),
                                  const SizedBox(height: 6),
                                  Text("کارفرما: ${contract['employer_name']}", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade500)),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                const Text("مانده بدهی", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey)),
                                const SizedBox(height: 4),
                                Text(AppFormatters.rialToToman(debt), style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 15, fontWeight: FontWeight.bold, color: debt > 0 ? Colors.red : Colors.green)),
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
      ),
    );
  }
}