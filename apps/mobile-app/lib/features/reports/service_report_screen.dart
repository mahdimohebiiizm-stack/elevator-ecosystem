import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/app_colors.dart';
import 'models/checklist_item_model.dart';
import 'bloc/service_report_bloc.dart';
import 'bloc/service_report_event.dart';
import 'bloc/service_report_state.dart';

// ==========================================
// صفحه اصلی گزارش سرویس دوره‌ای آسانسور
// متصل به موتور BLoC با جداسازی کامل بیزینس‌لاجیک از رابط کاربری
// ==========================================
class ServiceReportScreen extends StatefulWidget {
  final String elevatorId;
  final String buildingName;

  const ServiceReportScreen({
    super.key,
    required this.elevatorId,
    required this.buildingName,
  });

  @override
  State<ServiceReportScreen> createState() => _ServiceReportScreenState();
}

class _ServiceReportScreenState extends State<ServiceReportScreen> {
  late final ServiceReportBloc _serviceReportBloc;

  @override
  void initState() {
    super.initState();
    _serviceReportBloc = ServiceReportBloc()
      ..add(
        ServiceReportInitRequested(
          elevatorId: widget.elevatorId,
          buildingName: widget.buildingName,
        ),
      );
  }

  @override
  void dispose() {
    _serviceReportBloc.close();
    super.dispose();
  }

  void _showFinalizeBottomSheet(BuildContext context, ServiceReportLoaded state) {
    HapticFeedback.heavyImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) {
        return BlocProvider.value(
          value: _serviceReportBloc,
          child: _FinalizeReportSheet(
            buildingName: widget.buildingName,
            elevatorId: widget.elevatorId,
          ),
        );
      },
    );
  }

  void _updateItemStatus(ChecklistItemModel item, CheckStatus status, int catIndex) {
    HapticFeedback.lightImpact();
    _serviceReportBloc.add(
      ServiceReportItemStatusChanged(
        keyName: item.keyName,
        status: status,
        categoryIndex: catIndex,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _serviceReportBloc,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: BlocConsumer<ServiceReportBloc, ServiceReportState>(
          listener: (context, state) {
            if (state is ServiceReportError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    state.message,
                    style: const TextStyle(fontFamily: 'Vazirmatn'),
                  ),
                  backgroundColor: Colors.red.shade800,
                ),
              );
            }
          },
          builder: (context, state) {
            if (state is! ServiceReportLoaded) {
              return const Scaffold(
                backgroundColor: Color(0xFF1E1E24),
                body: Center(
                  child: CircularProgressIndicator(color: AppColors.primaryGreen),
                ),
              );
            }

            final double progressPercent = state.progressPercent;
            final bool isFinished = state.isAllItemsChecked;
            final int completedItems = state.completedItems;
            final int totalItems = state.totalItems;
            final categories = state.categories;

            return Scaffold(
              backgroundColor: const Color(0xFF1E1E24),
              body: CustomScrollView(
                slivers: [
                  SliverAppBar(
                    expandedHeight: 120.0,
                    floating: false,
                    pinned: true,
                    backgroundColor: Colors.transparent,
                    elevation: 0,
                    iconTheme: const IconThemeData(color: Colors.white),
                    flexibleSpace: ClipRRect(
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                        child: Container(
                          color: const Color(0xFF1E1E24).withValues(alpha: 0.8),
                          child: FlexibleSpaceBar(
                            titlePadding: const EdgeInsets.only(left: 20, right: 20, bottom: 16),
                            centerTitle: true,
                            title: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.buildingName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'Vazirmatn',
                                  ),
                                ),
                                const SizedBox(height: 8),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: progressPercent,
                                    backgroundColor: Colors.white.withValues(alpha: 0.1),
                                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryGreen),
                                    minHeight: 6,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      "پیشرفت: ${(progressPercent * 100).toInt()}٪",
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.6),
                                        fontSize: 9,
                                        fontFamily: 'Vazirmatn',
                                      ),
                                    ),
                                    Text(
                                      "$completedItems از $totalItems آیتم",
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.6),
                                        fontSize: 9,
                                        fontFamily: 'Vazirmatn',
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.all(16.0),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          return _buildCategoryExpansionTile(categories[index], index);
                        },
                        childCount: categories.length,
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              ),
              floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
              floatingActionButton: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isFinished ? AppColors.primaryGreen : Colors.grey.shade800,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: isFinished ? 8 : 0,
                    ),
                    onPressed: isFinished
                        ? () => _showFinalizeBottomSheet(context, state)
                        : () {
                            HapticFeedback.vibrate();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  "لطفاً ${state.remainingItemsCount} آیتم باقی‌مانده را بررسی کنید.",
                                  style: const TextStyle(fontFamily: 'Vazirmatn'),
                                ),
                                backgroundColor: Colors.orange.shade800,
                              ),
                            );
                          },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(isFinished ? Icons.assignment_turned_in : Icons.pending_actions, size: 24),
                        const SizedBox(width: 8),
                        Text(
                          isFinished
                              ? "تایید و ثبت جزئیات نهایی"
                              : "${state.remainingItemsCount} آیتم بررسی نشده",
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Vazirmatn',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCategoryExpansionTile(ChecklistCategoryModel category, int catIndex) {
    return Card(
      key: ValueKey('cat_${catIndex}_${category.isExpanded}'),
      margin: const EdgeInsets.only(bottom: 12),
      color: const Color(0xFF2A2A35),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 4,
      child: ExpansionTile(
        initiallyExpanded: category.isExpanded,
        onExpansionChanged: (expanded) {
          _serviceReportBloc.add(
            ServiceReportCategoryToggleRequested(categoryIndex: catIndex),
          );
        },
        iconColor: AppColors.primaryGreen,
        collapsedIconColor: Colors.white70,
        title: Row(
          children: [
            Icon(category.icon, color: Colors.white70, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                category.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Vazirmatn',
                ),
              ),
            ),
          ],
        ),
        children: category.items.map((item) => _buildCompactRowItem(item, catIndex)).toList(),
      ),
    );
  }

  Widget _buildCompactRowItem(ChecklistItemModel item, int catIndex) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.05))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.title,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
              fontWeight: FontWeight.w600,
              fontFamily: 'Vazirmatn',
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _SegmentButton(
                  title: "سالم",
                  icon: Icons.check,
                  isSelected: item.status == CheckStatus.OK,
                  activeColor: const Color(0xFF00C853),
                  onTap: () => _updateItemStatus(item, CheckStatus.OK, catIndex),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _SegmentButton(
                  title: "تعمیر",
                  icon: Icons.build_outlined,
                  isSelected: item.status == CheckStatus.NEEDS_REPAIR,
                  activeColor: const Color(0xFFFFAB00),
                  onTap: () => _updateItemStatus(item, CheckStatus.NEEDS_REPAIR, catIndex),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _SegmentButton(
                  title: "معیوب",
                  icon: Icons.close,
                  isSelected: item.status == CheckStatus.DEFECTIVE,
                  activeColor: const Color(0xFFFF3D00),
                  onTap: () => _updateItemStatus(item, CheckStatus.DEFECTIVE, catIndex),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SegmentButton extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final Color activeColor;
  final VoidCallback onTap;

  const _SegmentButton({
    required this.title,
    required this.icon,
    required this.isSelected,
    required this.activeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? activeColor.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? activeColor : Colors.white.withValues(alpha: 0.1),
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: isSelected ? activeColor : Colors.white54),
            const SizedBox(width: 4),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? activeColor : Colors.white54,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontFamily: 'Vazirmatn',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FinalizeReportSheet extends StatefulWidget {
  final String buildingName;
  final String elevatorId;

  const _FinalizeReportSheet({
    required this.buildingName,
    required this.elevatorId,
  });

  @override
  State<_FinalizeReportSheet> createState() => _FinalizeReportSheetState();
}

class _FinalizeReportSheetState extends State<_FinalizeReportSheet> {
  final ImagePicker _picker = ImagePicker();

  void _showAddMediaDialog(BuildContext sheetContext, List<ChecklistItemModel> allItems) {
    ChecklistItemModel? selectedDefect;

    showDialog(
      context: sheetContext,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return Directionality(
              textDirection: TextDirection.rtl,
              child: AlertDialog(
                backgroundColor: const Color(0xFF2A2A35),
                title: const Text(
                  "ثبت عکس مستندات",
                  style: TextStyle(color: Colors.white, fontFamily: 'Vazirmatn', fontSize: 16),
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "این مدرک مربوط به کدام بخش است؟",
                      style: TextStyle(color: Colors.white70, fontSize: 12, fontFamily: 'Vazirmatn'),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1E24),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<ChecklistItemModel?>(
                          isExpanded: true,
                          dropdownColor: const Color(0xFF1E1E24),
                          value: selectedDefect,
                          icon: const Icon(Icons.arrow_drop_down, color: Colors.white70),
                          items: [
                            const DropdownMenuItem(
                              value: null,
                              child: Text(
                                "عمومی (مربوط به کل پروژه)",
                                style: TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'Vazirmatn'),
                              ),
                            ),
                            ...allItems.map((item) {
                              return DropdownMenuItem(
                                value: item,
                                child: Text(
                                  item.title,
                                  style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'Vazirmatn'),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }),
                          ],
                          onChanged: (val) {
                            setDialogState(() {
                              selectedDefect = val;
                            });
                          },
                        ),
                      ),
                    ),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: const Text("انصراف", style: TextStyle(color: Colors.white54, fontFamily: 'Vazirmatn')),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blueGrey),
                    icon: const Icon(Icons.photo_library, size: 16),
                    label: const Text("گالری", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'Vazirmatn')),
                    onPressed: () async {
                      final List<XFile> images = await _picker.pickMultiImage();
                      if (images.isNotEmpty) {
                        for (final img in images) {
                          if (sheetContext.mounted) {
                            sheetContext.read<ServiceReportBloc>().add(
                              ServiceReportMediaAdded(
                                filePath: img.path,
                                relatedToKey: selectedDefect?.keyName ?? "general",
                                relatedToTitle: selectedDefect?.title ?? "عمومی",
                              ),
                            );
                          }
                        }
                        if (dialogContext.mounted) {
                          Navigator.pop(dialogContext);
                        }
                      }
                    },
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen),
                    icon: const Icon(Icons.camera_alt, size: 16),
                    label: const Text("دوربین", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'Vazirmatn')),
                    onPressed: () async {
                      final XFile? photo = await _picker.pickImage(source: ImageSource.camera);
                      if (photo != null) {
                        if (sheetContext.mounted) {
                          sheetContext.read<ServiceReportBloc>().add(
                            ServiceReportMediaAdded(
                              filePath: photo.path,
                              relatedToKey: selectedDefect?.keyName ?? "general",
                              relatedToTitle: selectedDefect?.title ?? "عمومی",
                            ),
                          );
                        }
                        if (dialogContext.mounted) {
                          Navigator.pop(dialogContext);
                        }
                      }
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showAddPartDialog(BuildContext sheetContext) {
    String partName = "";
    int quantity = 1;
    String action = "مصرف شده";

    showDialog(
      context: sheetContext,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return Directionality(
              textDirection: TextDirection.rtl,
              child: AlertDialog(
                backgroundColor: const Color(0xFF2A2A35),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                title: const Text(
                  "ثبت قطعه جدید",
                  style: TextStyle(
                    color: Colors.white,
                    fontFamily: 'Vazirmatn',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      style: const TextStyle(color: Colors.white, fontFamily: 'Vazirmatn', fontSize: 14),
                      decoration: InputDecoration(
                        labelText: "نام قطعه (مثلاً لنت ترمز، روغن)",
                        labelStyle: const TextStyle(color: Colors.white54, fontSize: 12, fontFamily: 'Vazirmatn'),
                        filled: true,
                        fillColor: const Color(0xFF1E1E24),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Colors.white24)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.primaryGreen)),
                      ),
                      onChanged: (val) => partName = val,
                    ),
                    const SizedBox(height: 16),
                    const Text("نوع اقدام:", style: TextStyle(color: Colors.white70, fontSize: 12, fontFamily: 'Vazirmatn')),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1E24),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          dropdownColor: const Color(0xFF1E1E24),
                          value: action,
                          icon: const Icon(Icons.arrow_drop_down, color: Colors.white70),
                          items: ["مصرف شده", "تعویض شده", "درخواست خرید"].map((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(
                                value,
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'Vazirmatn'),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setDialogState(() => action = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("تعداد / مقدار:", style: TextStyle(color: Colors.white70, fontSize: 12, fontFamily: 'Vazirmatn')),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Colors.orange),
                              onPressed: () {
                                if (quantity > 1) setDialogState(() => quantity--);
                              },
                            ),
                            Text(quantity.toString(), style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline, color: AppColors.primaryGreen),
                              onPressed: () => setDialogState(() => quantity++),
                            ),
                          ],
                        )
                      ],
                    )
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: const Text("انصراف", style: TextStyle(color: Colors.white54, fontFamily: 'Vazirmatn')),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen),
                    onPressed: () {
                      if (partName.trim().isEmpty) {
                        ScaffoldMessenger.of(sheetContext).showSnackBar(
                          const SnackBar(
                            content: Text("لطفاً نام قطعه را وارد کنید", style: TextStyle(fontFamily: 'Vazirmatn')),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }
                      sheetContext.read<ServiceReportBloc>().add(
                        ServiceReportPartAdded(
                          partName: partName.trim(),
                          quantity: quantity,
                          actionType: action,
                        ),
                      );
                      Navigator.pop(dialogContext);
                    },
                    child: const Text(
                      "ثبت قطعه",
                      style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'Vazirmatn'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ServiceReportBloc, ServiceReportState>(
      listener: (sheetContext, state) {
        if (state is ServiceReportLoaded) {
          if (state.submissionStatus == ReportSubmissionStatus.success) {
            final scaffoldMessenger = ScaffoldMessenger.of(sheetContext);
            final message = state.submissionResultMessage ??
                (state.isOfflineSaved
                    ? "سرور در دسترس نبود. گزارش شما در صف آفلاین ذخیره شد."
                    : "گزارش با موفقیت ثبت شد!");
            final color = state.isOfflineSaved ? Colors.orange.shade800 : Colors.green.shade800;

            Navigator.of(sheetContext).pop(); // بستن باتم‌شیت
            Navigator.of(sheetContext).pop(); // خروج از صفحه ثبت گزارش

            scaffoldMessenger.showSnackBar(
              SnackBar(
                content: Text(
                  message,
                  style: const TextStyle(fontFamily: 'Vazirmatn', color: Colors.white),
                ),
                backgroundColor: color,
                behavior: SnackBarBehavior.floating,
              ),
            );
          } else if (state.submissionStatus == ReportSubmissionStatus.failure) {
            ScaffoldMessenger.of(sheetContext).showSnackBar(
              SnackBar(
                content: Text(
                  state.errorMessage ?? "خطا در ثبت گزارش",
                  style: const TextStyle(fontFamily: 'Vazirmatn', color: Colors.white),
                ),
                backgroundColor: Colors.red.shade800,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        }
      },
      builder: (sheetContext, state) {
        final ServiceReportLoaded loadedState = state is ServiceReportLoaded
            ? state
            : const ServiceReportLoaded(
                elevatorId: '',
                buildingName: '',
                categories: [],
              );

        final bool isLoading = loadedState.submissionStatus == ReportSubmissionStatus.inProgress;
        final String loadingText = loadedState.submissionLoadingMessage;
        final List<ReportMediaItem> addedMedia = loadedState.addedMedia;
        final List<ReportPartItem> addedParts = loadedState.addedParts;
        final List<ChecklistItemModel> defectiveItems = loadedState.defectiveItems;

        return Directionality(
          textDirection: TextDirection.rtl,
          child: Container(
            height: MediaQuery.of(sheetContext).size.height * 0.85,
            decoration: const BoxDecoration(
              color: Color(0xFF1E1E24),
              borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 16),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.white30, borderRadius: BorderRadius.circular(4)),
                ),
                Text(
                  "جزئیات نهایی: ${widget.buildingName}",
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Vazirmatn',
                  ),
                ),
                const SizedBox(height: 24),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      if (defectiveItems.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.orange.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.orange.withValues(alpha: 0.5)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.warning_amber_rounded, color: Colors.orange),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  "شما ${defectiveItems.length} خرابی ثبت کرده‌اید. پیشنهاد می‌شود عکس آن‌ها را پیوست کنید.",
                                  style: const TextStyle(
                                    color: Colors.orange,
                                    fontSize: 12,
                                    fontFamily: 'Vazirmatn',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "مدارک و عکس‌ها",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Vazirmatn',
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () => _showAddMediaDialog(sheetContext, loadedState.allItems),
                            icon: const Icon(Icons.add_a_photo_outlined, color: AppColors.primaryGreen, size: 18),
                            label: const Text(
                              "افزودن",
                              style: TextStyle(
                                color: AppColors.primaryGreen,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'Vazirmatn',
                              ),
                            ),
                          )
                        ],
                      ),
                      if (addedMedia.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8.0),
                          child: Text(
                            "هیچ عکسی ضمیمه نشده است.",
                            style: TextStyle(color: Colors.white54, fontSize: 12, fontFamily: 'Vazirmatn'),
                          ),
                        ),
                      ...addedMedia.asMap().entries.map((entry) {
                        final int index = entry.key;
                        final ReportMediaItem media = entry.value;
                        return Card(
                          color: const Color(0xFF2A2A35),
                          child: ListTile(
                            leading: const Icon(Icons.image, color: Colors.white70),
                            title: Text(
                              "مربوط به: ${media.relatedToTitle ?? 'عمومی'}",
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'Vazirmatn'),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.check_circle, color: Colors.green, size: 18),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () {
                                    sheetContext.read<ServiceReportBloc>().add(
                                      ServiceReportMediaRemoved(index: index),
                                    );
                                  },
                                  child: const Icon(Icons.close, color: Colors.white54, size: 18),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const Divider(color: Colors.white12, height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "قطعات مصرفی / تعویضی",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Vazirmatn',
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () => _showAddPartDialog(sheetContext),
                            icon: const Icon(Icons.build, color: Colors.orange, size: 18),
                            label: const Text(
                              "افزودن قطعه",
                              style: TextStyle(
                                color: Colors.orange,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'Vazirmatn',
                              ),
                            ),
                          )
                        ],
                      ),
                      if (addedParts.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8.0),
                          child: Text(
                            "قطعه‌ای ثبت نشده است.",
                            style: TextStyle(color: Colors.white54, fontSize: 12, fontFamily: 'Vazirmatn'),
                          ),
                        ),
                      ...addedParts.asMap().entries.map((entry) {
                        final int index = entry.key;
                        final ReportPartItem part = entry.value;
                        return Card(
                          color: const Color(0xFF2A2A35),
                          child: ListTile(
                            title: Text(
                              part.name,
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontFamily: 'Vazirmatn'),
                            ),
                            subtitle: Text(
                              "اقدام: ${part.action} | تعداد: ${part.qty}",
                              style: const TextStyle(color: Colors.white70, fontSize: 12, fontFamily: 'Vazirmatn'),
                            ),
                            trailing: InkWell(
                              onTap: () {
                                sheetContext.read<ServiceReportBloc>().add(
                                  ServiceReportPartRemoved(index: index),
                                );
                              },
                              child: const Icon(Icons.close, color: Colors.white54, size: 18),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLoading ? Colors.grey.shade700 : AppColors.primaryGreen,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        onPressed: isLoading
                            ? null
                            : () {
                                sheetContext.read<ServiceReportBloc>().add(
                                  ServiceReportSubmitRequested(
                                    elevatorId: widget.elevatorId,
                                  ),
                                );
                              },
                        child: isLoading
                            ? Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    loadingText,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                      fontFamily: 'Vazirmatn',
                                    ),
                                  ),
                                ],
                              )
                            : Text(
                                loadingText,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  fontFamily: 'Vazirmatn',
                                ),
                              ),
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
