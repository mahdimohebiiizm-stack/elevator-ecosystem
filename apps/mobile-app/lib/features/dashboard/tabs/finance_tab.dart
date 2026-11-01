import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/utils/app_formatters.dart';
import 'contract_finance_details_screen.dart';
import '../bloc/finance/finance_bloc.dart';
import '../bloc/finance/finance_event.dart';
import '../bloc/finance/finance_state.dart';
import '../data/finance_repository.dart';

// ==========================================
// تب مدیریت و حسابداری مالی شرکت
// متصل به FinanceBloc با حفظ کامل ساختار UI و طراحی بصری
// ==========================================
class FinanceTab extends StatefulWidget {
  const FinanceTab({super.key});

  @override
  State<FinanceTab> createState() => _FinanceTabState();
}

class _FinanceTabState extends State<FinanceTab> {
  late final FinanceBloc _financeBloc;

  @override
  void initState() {
    super.initState();
    _financeBloc = FinanceBloc()..add(const FinanceFetchRequested());
  }

  @override
  void dispose() {
    _financeBloc.close();
    super.dispose();
  }

  void _showAddPaymentModal(BuildContext parentContext) {
    parentContext
        .read<FinanceBloc>()
        .add(const FinanceLoadActiveContractsRequested());

    showModalBottomSheet(
      context: parentContext,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) {
        return BlocProvider.value(
          value: _financeBloc,
          child: const _AddPaymentModalContent(),
        );
      },
    );
  }

  Widget _buildBarChart(Map<String, dynamic>? chartData) {
    final List<dynamic> dataList = chartData?['chart_data'] ?? [];

    final double maxAmountRial =
        (chartData?['max_amount'] ?? 1.0).toDouble();
    final double maxAmountToman = maxAmountRial / 10;
    final double ceilingToman =
        maxAmountToman == 0 ? 1 : maxAmountToman * 1.2;

    if (dataList.isEmpty || maxAmountToman == 0) {
      return Container(
        height: 150,
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.bar_chart_rounded,
                size: 40, color: Colors.grey.shade300),
            const SizedBox(height: 8),
            Text(
              "دیتای کافی برای رسم نمودار وجود ندارد.",
              style: TextStyle(
                fontFamily: 'Vazirmatn',
                color: Colors.grey.shade500,
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    }

    return SizedBox(
      height: 180,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: dataList.map((dayData) {
          final double amountRial = (dayData['amount'] ?? 0.0).toDouble();
          final double amountToman = amountRial / 10;
          final double percentage =
              (amountToman / ceilingToman).clamp(0.0, 1.0);

          String label = "";
          if (amountToman >= 1000000) {
            label = "${(amountToman / 1000000).toStringAsFixed(1)}M";
          } else if (amountToman > 0) {
            label = "${(amountToman / 1000).toInt()}K";
          }

          return Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 10,
                  color: Colors.blue,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                width: 24,
                height: 120 * percentage,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade400, Colors.blue.shade800],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                dayData['day'].toString(),
                style: TextStyle(
                  fontFamily: 'Vazirmatn',
                  fontSize: 10,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildOverdueCard(Map<String, dynamic> data) {
    final debtFormatted = AppFormatters.rialToToman(data['debt_amount']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.red.shade100,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.money_off, color: Colors.red),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "پروژه: ${data['building_name']}",
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Vazirmatn',
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "کارفرما: ${data['employer_name']}",
                  style: TextStyle(
                    color: Colors.red.shade700,
                    fontFamily: 'Vazirmatn',
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red.shade100,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    "تاخیر: ${data['days_passed']} روز (${AppFormatters.translatePaymentFrequency(data['frequency'])})",
                    style: TextStyle(
                      color: Colors.red.shade900,
                      fontFamily: 'Vazirmatn',
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                "مبلغ بدهی",
                style: TextStyle(
                  color: Colors.grey,
                  fontFamily: 'Vazirmatn',
                  fontSize: 11,
                ),
              ),
              Text(
                debtFormatted,
                style: const TextStyle(
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Vazirmatn',
                  fontSize: 15,
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildTransactionItem(Map<String, dynamic> tx) {
    final amountFormatted = AppFormatters.rialToToman(tx['amount']);
    final String shamsiDate = AppFormatters.toShamsi(tx['payment_date']);
    String methodText = "نقدی";
    Color methodColor = Colors.green;

    if (tx['payment_method'] == 'CHECK') {
      methodText = "چک بانکی";
      methodColor = Colors.orange;
    } else if (tx['payment_method'] == 'TRANSFER') {
      methodText = "کارت به کارت";
      methodColor = Colors.blue;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: methodColor.withValues(alpha: 0.1),
            child: Icon(Icons.payment, color: methodColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx['building_name'] ?? 'نامشخص',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Vazirmatn',
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "پرداخت‌کننده: ${tx['employer_name'] ?? '-'}",
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontFamily: 'Vazirmatn',
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                "$amountFormatted ت",
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Vazirmatn',
                  fontSize: 14,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: methodColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      shamsiDate,
                      style: TextStyle(
                        color: methodColor,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Vazirmatn',
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      methodText,
                      style: TextStyle(
                        color: methodColor,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Vazirmatn',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildMiniStatCard(
    String title,
    String value,
    IconData icon,
    Color color, {
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 12,
                fontFamily: 'Vazirmatn',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                color: Colors.black87,
                fontSize: 15,
                fontWeight: FontWeight.bold,
                fontFamily: 'Vazirmatn',
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _financeBloc,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: BlocConsumer<FinanceBloc, FinanceState>(
          listener: (context, state) {
            if (state is FinanceLoaded) {
              if (state.excelFilePath != null) {
                Share.shareXFiles(
                  [XFile(state.excelFilePath!)],
                  text: 'گزارش کامل مالی و تراکنش‌های شرکت',
                );
                context
                    .read<FinanceBloc>()
                    .add(const FinanceResetPaymentStatusRequested());
              }
              if (state.errorMessage != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      state.errorMessage!,
                      style: const TextStyle(fontFamily: 'Vazirmatn'),
                    ),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            } else if (state is FinanceError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    state.errorMessage,
                    style: const TextStyle(fontFamily: 'Vazirmatn'),
                  ),
                  backgroundColor: Colors.red,
                ),
              );
            }
          },
          builder: (context, state) {
            if (state is FinanceLoading || state is FinanceInitial) {
              return const Scaffold(
                backgroundColor: AppColors.backgroundWhite,
                body: Center(
                  child:
                      CircularProgressIndicator(color: AppColors.primaryGreen),
                ),
              );
            }

            if (state is FinanceError && state.cachedData == null) {
              return Scaffold(
                backgroundColor: AppColors.backgroundWhite,
                body: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline,
                          color: Colors.red, size: 48),
                      const SizedBox(height: 12),
                      Text(
                        state.errorMessage,
                        style: const TextStyle(
                          color: Colors.red,
                          fontFamily: 'Vazirmatn',
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryGreen,
                        ),
                        onPressed: () => context
                            .read<FinanceBloc>()
                            .add(const FinanceFetchRequested()),
                        child: const Text(
                          "تلاش مجدد",
                          style: TextStyle(
                            fontFamily: 'Vazirmatn',
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            final FinanceDataModel financeData = state is FinanceLoaded
                ? state.data
                : (state as FinanceError).cachedData!;

            final overdueContracts = financeData.overdueContracts;
            final transactions = financeData.transactions;
            final chartData = financeData.chartData;

            return Scaffold(
              backgroundColor: AppColors.backgroundWhite,
              body: RefreshIndicator(
                color: AppColors.primaryGreen,
                onRefresh: () async {
                  context
                      .read<FinanceBloc>()
                      .add(const FinanceRefreshRequested());
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.only(
                    left: 20,
                    right: 20,
                    top: 20,
                    bottom: 140,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "مدیریت و حسابداری",
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textBlack,
                              fontFamily: 'Vazirmatn',
                            ),
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.download_for_offline,
                              color: AppColors.primaryGreen,
                              size: 30,
                            ),
                            tooltip: "دانلود گزارش اکسل",
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    "در حال ساخت فایل اکسل...",
                                    style: TextStyle(fontFamily: 'Vazirmatn'),
                                  ),
                                  backgroundColor: Colors.orange,
                                ),
                              );
                              context
                                  .read<FinanceBloc>()
                                  .add(const FinanceExportExcelRequested());
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1A237E), Color(0xFF3949AB)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF1A237E)
                                  .withValues(alpha: 0.4),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            )
                          ],
                        ),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Positioned(
                              left: -20,
                              top: -10,
                              child: Icon(
                                Icons.account_balance,
                                size: 120,
                                color: Colors.white.withValues(alpha: 0.05),
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      "کل مطالبات از بازار (بدهی‌ها)",
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 14,
                                        fontFamily: 'Vazirmatn',
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white
                                            .withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(
                                            financeData.isFromCache
                                                ? Icons.cloud_off
                                                : Icons.sync,
                                            color: Colors.white,
                                            size: 12,
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            financeData.isFromCache
                                                ? "آفلاین (کش)"
                                                : "زنده",
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 10,
                                              fontFamily: 'Vazirmatn',
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      AppFormatters.rialToToman(
                                          financeData.totalMarketDebt),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 32,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 1,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Padding(
                                      padding: EdgeInsets.only(bottom: 6),
                                      child: Text(
                                        "تومان",
                                        style: TextStyle(
                                          color: Colors.white70,
                                          fontSize: 14,
                                          fontFamily: 'Vazirmatn',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: _buildMiniStatCard(
                              "درآمد ۳۰ روز اخیر",
                              AppFormatters.rialToToman(
                                  financeData.incomeLast30Days),
                              Icons.trending_up,
                              Colors.green,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildMiniStatCard(
                              "قراردادهای فعال",
                              "${financeData.activeContractsCount} مورد",
                              Icons.description_outlined,
                              Colors.orange,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        const ContractFinanceDetailsScreen(),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 10,
                              offset: const Offset(0, 5),
                            )
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "روند درآمد ۷ روز اخیر",
                              style: TextStyle(
                                fontFamily: 'Vazirmatn',
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 16),
                            _buildBarChart(chartData),
                          ],
                        ),
                      ),
                      const SizedBox(height: 30),
                      const Text(
                        "عملیات مالی",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textBlack,
                          fontFamily: 'Vazirmatn',
                        ),
                      ),
                      const SizedBox(height: 12),
                      ListTile(
                        tileColor: const Color(0xFFF7F8FA),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Colors.grey.shade200),
                        ),
                        leading: const CircleAvatar(
                          backgroundColor: Colors.white,
                          child: Icon(Icons.add_card, color: Colors.blue),
                        ),
                        title: const Text(
                          "ثبت پرداختی جدید",
                          style: TextStyle(
                            fontFamily: 'Vazirmatn',
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: const Text(
                          "ثبت چک یا واریزی برای یک قرارداد",
                          style:
                              TextStyle(fontFamily: 'Vazirmatn', fontSize: 12),
                        ),
                        trailing: const Icon(
                          Icons.arrow_forward_ios,
                          size: 14,
                          color: AppColors.textGrey,
                        ),
                        onTap: () => _showAddPaymentModal(context),
                      ),
                      if (overdueContracts.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded,
                                color: Colors.red),
                            const SizedBox(width: 8),
                            Text(
                              "هشدارهای معوقات مالی (${overdueContracts.length})",
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.red,
                                fontFamily: 'Vazirmatn',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ...overdueContracts
                            .map((overdue) => _buildOverdueCard(overdue)),
                      ],
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "آخرین واریزی‌ها و تراکنش‌ها",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textBlack,
                              fontFamily: 'Vazirmatn',
                            ),
                          ),
                          Text(
                            "${transactions.length} مورد اخیر",
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                              fontFamily: 'Vazirmatn',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      transactions.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(20.0),
                                child: Text(
                                  "هنوز هیچ تراکنشی ثبت نشده است.",
                                  style: TextStyle(
                                    fontFamily: 'Vazirmatn',
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                              ),
                            )
                          : Column(
                              children: transactions
                                  .map((tx) => _buildTransactionItem(tx))
                                  .toList(),
                            ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

// ==========================================
// فرم مودال ثبت پرداختی جدید متصل به FinanceBloc
// ==========================================
class _AddPaymentModalContent extends StatefulWidget {
  const _AddPaymentModalContent();

  @override
  State<_AddPaymentModalContent> createState() =>
      _AddPaymentModalContentState();
}

class _AddPaymentModalContentState extends State<_AddPaymentModalContent> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _trackingCodeController = TextEditingController();
  final _descController = TextEditingController();

  String _selectedPaymentMethod = 'CASH';
  String? _selectedContractId;

  @override
  void dispose() {
    _amountController.dispose();
    _trackingCodeController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<FinanceBloc, FinanceState>(
      listener: (context, state) {
        if (state is FinanceLoaded) {
          if (state.paymentModalStatus == PaymentModalStatus.success) {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  state.paymentResultMessage ?? "پرداختی با موفقیت ثبت شد.",
                  style: const TextStyle(fontFamily: 'Vazirmatn'),
                ),
                backgroundColor: Colors.green,
              ),
            );
            context
                .read<FinanceBloc>()
                .add(const FinanceResetPaymentStatusRequested());
          } else if (state.paymentModalStatus == PaymentModalStatus.failure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  state.errorMessage ?? "خطا در ثبت اطلاعات مالی",
                  style: const TextStyle(fontFamily: 'Vazirmatn'),
                ),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      },
      builder: (context, state) {
        final bool isFetchingContracts = state is FinanceLoaded &&
            state.paymentModalStatus == PaymentModalStatus.loadingContracts;
        final bool isSubmitting = state is FinanceLoaded &&
            state.paymentModalStatus == PaymentModalStatus.submitting;
        final activeContracts = state is FinanceLoaded
            ? state.activeContracts
            : <Map<String, dynamic>>[];

        return Directionality(
          textDirection: TextDirection.rtl,
          child: Container(
            height: MediaQuery.of(context).size.height * 0.75,
            padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom),
            decoration: const BoxDecoration(
              color: AppColors.backgroundWhite,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 40,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "ثبت پرداختی جدید",
                        style: TextStyle(
                          fontFamily: 'Vazirmatn',
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textBlack,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.grey),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const Divider(),
                Expanded(
                  child: isFetchingContracts && activeContracts.isEmpty
                      ? const Center(
                          child: CircularProgressIndicator(
                              color: AppColors.primaryGreen),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(24),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "انتخاب قرارداد مربوطه:",
                                  style: TextStyle(
                                    fontFamily: 'Vazirmatn',
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      isExpanded: true,
                                      hint: const Text(
                                        "قرارداد / کارفرما را انتخاب کنید...",
                                        style: TextStyle(
                                          fontFamily: 'Vazirmatn',
                                          fontSize: 13,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      value: _selectedContractId,
                                      items: activeContracts
                                          .map<DropdownMenuItem<String>>((c) {
                                        return DropdownMenuItem(
                                          value: c['id'].toString(),
                                          child: Text(
                                            "${c['employer_name']} (قرارداد: ${c['contract_number'] ?? '-'})",
                                            style: const TextStyle(
                                              fontFamily: 'Vazirmatn',
                                              fontSize: 13,
                                            ),
                                          ),
                                        );
                                      }).toList(),
                                      onChanged: (val) {
                                        setState(
                                            () => _selectedContractId = val);
                                      },
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 20),
                                const Text(
                                  "مبلغ پرداختی (تومان):",
                                  style: TextStyle(
                                    fontFamily: 'Vazirmatn',
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                CustomTextField(
                                  controller: _amountController,
                                  hint: "مثال: 5,000,000",
                                  isCurrency: true,
                                  isRequired: true,
                                  icon: Icons.monetization_on_outlined,
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  "روش پرداخت:",
                                  style: TextStyle(
                                    fontFamily: 'Vazirmatn',
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      isExpanded: true,
                                      value: _selectedPaymentMethod,
                                      items: const [
                                        DropdownMenuItem(
                                          value: 'CASH',
                                          child: Text(
                                            "نقدی",
                                            style: TextStyle(
                                              fontFamily: 'Vazirmatn',
                                              fontSize: 14,
                                            ),
                                          ),
                                        ),
                                        DropdownMenuItem(
                                          value: 'CHECK',
                                          child: Text(
                                            "چک بانکی",
                                            style: TextStyle(
                                              fontFamily: 'Vazirmatn',
                                              fontSize: 14,
                                            ),
                                          ),
                                        ),
                                        DropdownMenuItem(
                                          value: 'TRANSFER',
                                          child: Text(
                                            "کارت به کارت / واریز",
                                            style: TextStyle(
                                              fontFamily: 'Vazirmatn',
                                              fontSize: 14,
                                            ),
                                          ),
                                        ),
                                      ],
                                      onChanged: (val) {
                                        if (val != null) {
                                          setState(() =>
                                              _selectedPaymentMethod = val);
                                        }
                                      },
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 20),
                                CustomTextField(
                                  controller: _trackingCodeController,
                                  hint: "شماره پیگیری / فیش / چک (اختیاری)",
                                  icon: Icons.receipt_long_outlined,
                                ),
                                const SizedBox(height: 12),
                                CustomTextField(
                                  controller: _descController,
                                  hint: "توضیحات تکمیلی...",
                                  icon: Icons.description_outlined,
                                ),
                                const SizedBox(height: 32),
                                SizedBox(
                                  width: double.infinity,
                                  height: 55,
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primaryGreen,
                                      shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(16),
                                      ),
                                    ),
                                    onPressed: isSubmitting
                                        ? null
                                        : () {
                                            if (_selectedContractId == null) {
                                              ScaffoldMessenger.of(context)
                                                  .showSnackBar(
                                                const SnackBar(
                                                  content: Text(
                                                    "لطفاً قرارداد را انتخاب کنید",
                                                    style: TextStyle(
                                                        fontFamily:
                                                            'Vazirmatn'),
                                                  ),
                                                ),
                                              );
                                              return;
                                            }
                                            if (!_formKey.currentState!
                                                .validate()) {
                                              return;
                                            }

                                            final double amountInToman =
                                                double.parse(
                                              _amountController.text
                                                  .replaceAll(',', ''),
                                            );
                                            final double amountInRial =
                                                amountInToman * 10;

                                            context.read<FinanceBloc>().add(
                                                  FinanceSubmitPaymentRequested(
                                                    contractId:
                                                        _selectedContractId!,
                                                    amountInRial: amountInRial,
                                                    paymentMethod:
                                                        _selectedPaymentMethod,
                                                    trackingCode:
                                                        _trackingCodeController
                                                            .text
                                                            .trim(),
                                                    description: _descController
                                                        .text
                                                        .trim(),
                                                  ),
                                                );
                                          },
                                    child: isSubmitting
                                        ? const SizedBox(
                                            width: 24,
                                            height: 24,
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : const Text(
                                            "ثبت پرداختی و کسر از بدهی",
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                              fontFamily: 'Vazirmatn',
                                            ),
                                          ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
