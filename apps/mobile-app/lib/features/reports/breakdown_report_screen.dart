import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/app_colors.dart';
import 'models/checklist_item_model.dart';
import 'data/breakdown_report_repository.dart';
import 'bloc/breakdown_report_bloc.dart';
import 'bloc/breakdown_report_event.dart';
import 'bloc/breakdown_report_state.dart';

// ==========================================
// صفحه ثبت گزارش خرابی و تعمیرات اضطراری (BM)
// متصل به موتور BreakdownReportBloc با حفظ کامل ساختار UI
// ==========================================
class BreakdownReportScreen extends StatefulWidget {
  final String elevatorId;
  final String buildingName;

  const BreakdownReportScreen({
    super.key,
    required this.elevatorId,
    required this.buildingName,
  });

  @override
  State<BreakdownReportScreen> createState() => _BreakdownReportScreenState();
}

class _BreakdownReportScreenState extends State<BreakdownReportScreen> {
  late final BreakdownReportBloc _breakdownReportBloc;
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _employerCommentsController =
      TextEditingController();

  @override
  void initState() {
    super.initState();
    _breakdownReportBloc = BreakdownReportBloc()
      ..add(
        BreakdownReportInitRequested(
          elevatorId: widget.elevatorId,
          buildingName: widget.buildingName,
        ),
      );
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _employerCommentsController.dispose();
    _breakdownReportBloc.close();
    super.dispose();
  }

  void _showFinalizeBottomSheet(BreakdownReportLoaded state) {
    HapticFeedback.heavyImpact();
    // بررسی اینکه حداقل فیلدهای ستاره‌دار مهم انتخاب شده باشند
    if (!state.isRequiredFieldsValid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            "لطفاً تمام بخش‌های ستاره‌دار (*) فرم را انتخاب کنید.",
            style: TextStyle(fontFamily: 'Vazirmatn'),
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) {
        return BlocProvider.value(
          value: _breakdownReportBloc,
          child: _BMFinalizeSheet(
            elevatorId: widget.elevatorId,
            buildingName: widget.buildingName,
            descriptionController: _descriptionController,
            employerCommentsController: _employerCommentsController,
          ),
        );
      },
    );
  }

  Widget _buildSectionTitle(String title, {bool isRequired = true}) {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 12),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
              fontFamily: 'Vazirmatn',
            ),
          ),
          if (isRequired)
            const Text(
              " *",
              style: TextStyle(
                color: Colors.red,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildChipGroup(
    Map<String, String> items,
    String? selectedKey,
    Function(String) onSelected,
  ) {
    return Wrap(
      spacing: 8.0,
      runSpacing: 8.0,
      children: items.keys.map((String key) {
        final bool isSelected = selectedKey == key;
        return ChoiceChip(
          label: Text(
            key,
            style: TextStyle(
              fontFamily: 'Vazirmatn',
              fontSize: 13,
              color: isSelected ? Colors.white : Colors.white70,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          selected: isSelected,
          selectedColor: AppColors.primaryGreen,
          backgroundColor: const Color(0xFF2A2A35),
          side: BorderSide(
            color: isSelected ? AppColors.primaryGreen : Colors.white24,
          ),
          onSelected: (bool selected) {
            if (selected) {
              HapticFeedback.lightImpact();
              onSelected(key);
            }
          },
        );
      }).toList(),
    );
  }

  Widget _buildTextField(
    String hint,
    TextEditingController controller, {
    int maxLines = 3,
    required Function(String) onChanged,
  }) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      style: const TextStyle(
        color: Colors.white,
        fontFamily: 'Vazirmatn',
        fontSize: 14,
      ),
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white30, fontSize: 12),
        filled: true,
        fillColor: const Color(0xFF2A2A35),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.white12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryGreen),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _breakdownReportBloc,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: BlocConsumer<BreakdownReportBloc, BreakdownReportState>(
          listener: (context, state) {
            if (state is BreakdownReportError) {
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
            if (state is! BreakdownReportLoaded) {
              return const Scaffold(
                backgroundColor: Color(0xFF1E1E24),
                body: Center(
                  child:
                      CircularProgressIndicator(color: AppColors.primaryGreen),
                ),
              );
            }

            return Scaffold(
              backgroundColor: const Color(0xFF1E1E24),
              appBar: AppBar(
                backgroundColor: const Color(0xFF1E1E24),
                elevation: 0,
                iconTheme: const IconThemeData(color: Colors.white),
                title: Text(
                  "تعمیرات اضطراری: ${widget.buildingName}",
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Vazirmatn',
                  ),
                ),
                centerTitle: true,
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(1),
                  child: Container(color: Colors.white12, height: 1),
                ),
              ),
              body: ListView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                children: [
                  _buildSectionTitle("علت مراجعه"),
                  _buildChipGroup(
                    BreakdownReportRepository.dispatchReasons,
                    state.selectedDispatchReason,
                    (val) => _breakdownReportBloc
                        .add(BreakdownDispatchReasonChanged(val)),
                  ),
                  _buildSectionTitle("وضعیت هنگام مراجعه"),
                  _buildChipGroup(
                    BreakdownReportRepository.arrivalStatuses,
                    state.selectedArrivalStatus,
                    (val) => _breakdownReportBloc
                        .add(BreakdownArrivalStatusChanged(val)),
                  ),
                  _buildSectionTitle("علت خرابی"),
                  _buildChipGroup(
                    BreakdownReportRepository.causes,
                    state.selectedCause,
                    (val) =>
                        _breakdownReportBloc.add(BreakdownCauseChanged(val)),
                  ),
                  _buildSectionTitle("اقدام انجام شده"),
                  _buildChipGroup(
                    BreakdownReportRepository.actions,
                    state.selectedAction,
                    (val) =>
                        _breakdownReportBloc.add(BreakdownActionChanged(val)),
                  ),
                  _buildSectionTitle("توضیحات تکنسین تعمیر",
                      isRequired: false),
                  _buildTextField(
                    "توضیحات فنی، سریال قطعه یا جزئیات کار را اینجا بنویسید...",
                    _descriptionController,
                    onChanged: (val) => _breakdownReportBloc
                        .add(BreakdownDescriptionChanged(val)),
                  ),
                  _buildSectionTitle("وضعیت هنگام ترک پروژه"),
                  _buildChipGroup(
                    BreakdownReportRepository.projectStatuses,
                    state.selectedProjectStatus,
                    (val) => _breakdownReportBloc
                        .add(BreakdownProjectStatusChanged(val)),
                  ),
                  _buildSectionTitle("نظرات کارفرما", isRequired: false),
                  _buildTextField(
                    "در صورت نیاز نظر کارفرما را اینجا بنویسید...",
                    _employerCommentsController,
                    maxLines: 2,
                    onChanged: (val) => _breakdownReportBloc
                        .add(BreakdownEmployerCommentsChanged(val)),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
              floatingActionButtonLocation:
                  FloatingActionButtonLocation.centerFloat,
              floatingActionButton: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE53935),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 8,
                    ),
                    onPressed: () => _showFinalizeBottomSheet(state),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.assignment_turned_in, size: 24),
                        SizedBox(width: 8),
                        Text(
                          "تایید و ثبت جزئیات نهایی",
                          style: TextStyle(
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
}

// ==========================================
// Bottom Sheet ویژه فرم خرابی (BM) برای ثبت عکس و قطعه
// متصل به BreakdownReportBloc
// ==========================================
class _BMFinalizeSheet extends StatefulWidget {
  final String elevatorId;
  final String buildingName;
  final TextEditingController descriptionController;
  final TextEditingController employerCommentsController;

  const _BMFinalizeSheet({
    required this.elevatorId,
    required this.buildingName,
    required this.descriptionController,
    required this.employerCommentsController,
  });

  @override
  State<_BMFinalizeSheet> createState() => _BMFinalizeSheetState();
}

class _BMFinalizeSheetState extends State<_BMFinalizeSheet> {
  final ImagePicker _picker = ImagePicker();

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
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
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
                      style: const TextStyle(
                        color: Colors.white,
                        fontFamily: 'Vazirmatn',
                        fontSize: 14,
                      ),
                      decoration: InputDecoration(
                        labelText: "نام قطعه",
                        labelStyle: const TextStyle(
                          color: Colors.white54,
                          fontSize: 12,
                        ),
                        filled: true,
                        fillColor: const Color(0xFF1E1E24),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Colors.white24),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide:
                              const BorderSide(color: Color(0xFFE53935)),
                        ),
                      ),
                      onChanged: (val) => partName = val,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      "نوع اقدام:",
                      style: TextStyle(color: Colors.white70, fontSize: 12),
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
                        child: DropdownButton<String>(
                          isExpanded: true,
                          dropdownColor: const Color(0xFF1E1E24),
                          value: action,
                          icon: const Icon(Icons.arrow_drop_down,
                              color: Colors.white70),
                          items: ["مصرف شده", "تعویض شده", "درخواست خرید"]
                              .map((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(
                                value,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontFamily: 'Vazirmatn',
                                ),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setDialogState(() => action = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "تعداد:",
                          style:
                              TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline,
                                  color: Colors.orange),
                              onPressed: () {
                                if (quantity > 1) {
                                  setDialogState(() => quantity--);
                                }
                              },
                            ),
                            Text(
                              quantity.toString(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline,
                                  color: Color(0xFFE53935)),
                              onPressed: () =>
                                  setDialogState(() => quantity++),
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
                    child: const Text(
                      "انصراف",
                      style: TextStyle(
                        color: Colors.white54,
                        fontFamily: 'Vazirmatn',
                      ),
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE53935),
                    ),
                    onPressed: () {
                      if (partName.trim().isEmpty) return;
                      sheetContext.read<BreakdownReportBloc>().add(
                            BreakdownPartAdded(
                              partName: partName.trim(),
                              quantity: quantity,
                              actionType: action,
                            ),
                          );
                      Navigator.pop(dialogContext);
                    },
                    child: const Text(
                      "ثبت قطعه",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        fontFamily: 'Vazirmatn',
                      ),
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
    return BlocConsumer<BreakdownReportBloc, BreakdownReportState>(
      listener: (sheetContext, state) {
        if (state is BreakdownReportLoaded) {
          if (state.submissionStatus == BreakdownSubmissionStatus.success) {
            final scaffoldMessenger = ScaffoldMessenger.of(sheetContext);
            final message = state.submissionResultMessage ??
                (state.isOfflineSaved
                    ? "سرور قطع است. گزارش خرابی در صف آفلاین ذخیره شد."
                    : "گزارش خرابی با موفقیت ثبت شد!");
            final color = state.isOfflineSaved
                ? Colors.orange.shade800
                : Colors.green.shade800;

            Navigator.of(sheetContext).pop(); // بستن باتم‌شیت
            Navigator.of(sheetContext).pop(); // بستن صفحه اصلی خرابی

            scaffoldMessenger.showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Colors.white),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        message,
                        style: const TextStyle(fontFamily: 'Vazirmatn'),
                      ),
                    ),
                  ],
                ),
                backgroundColor: color,
                behavior: SnackBarBehavior.floating,
                duration: const Duration(seconds: 4),
              ),
            );
          } else if (state.submissionStatus ==
              BreakdownSubmissionStatus.failure) {
            ScaffoldMessenger.of(sheetContext).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.white),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        state.errorMessage ?? "خطا در ثبت گزارش خرابی",
                        style: const TextStyle(fontFamily: 'Vazirmatn'),
                      ),
                    ),
                  ],
                ),
                backgroundColor: Colors.red.shade800,
                behavior: SnackBarBehavior.floating,
                duration: const Duration(seconds: 4),
              ),
            );
          }
        }
      },
      builder: (sheetContext, state) {
        final BreakdownReportLoaded loadedState = state is BreakdownReportLoaded
            ? state
            : const BreakdownReportLoaded(
                elevatorId: '',
                buildingName: '',
              );

        final bool isLoading = loadedState.submissionStatus ==
            BreakdownSubmissionStatus.inProgress;
        final String loadingText = loadedState.submissionLoadingMessage;
        final List<String> addedMedia = loadedState.addedMediaPaths;
        final List<ReportPartItem> addedParts = loadedState.addedParts;

        return Directionality(
          textDirection: TextDirection.rtl,
          child: Container(
            height: MediaQuery.of(sheetContext).size.height * 0.85,
            decoration: const BoxDecoration(
              color: Color(0xFF1E1E24),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 16),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white30,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                Text(
                  "مستندات خرابی: ${widget.buildingName}",
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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "عکس‌های خرابی / فاکتور",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Vazirmatn',
                            ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(
                                  Icons.photo_library,
                                  color: Colors.blueGrey,
                                  size: 22,
                                ),
                                onPressed: () async {
                                  final List<XFile> images =
                                      await _picker.pickMultiImage();
                                  if (images.isNotEmpty) {
                                    for (final img in images) {
                                      if (sheetContext.mounted) {
                                        sheetContext
                                            .read<BreakdownReportBloc>()
                                            .add(
                                              BreakdownMediaAdded(
                                                filePath: img.path,
                                              ),
                                            );
                                      }
                                    }
                                  }
                                },
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.camera_alt,
                                  color: Color(0xFFE53935),
                                  size: 22,
                                ),
                                onPressed: () async {
                                  final XFile? photo = await _picker.pickImage(
                                    source: ImageSource.camera,
                                  );
                                  if (photo != null) {
                                    if (sheetContext.mounted) {
                                      sheetContext
                                          .read<BreakdownReportBloc>()
                                          .add(
                                            BreakdownMediaAdded(
                                              filePath: photo.path,
                                            ),
                                          );
                                    }
                                  }
                                },
                              ),
                            ],
                          )
                        ],
                      ),
                      if (addedMedia.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8.0),
                          child: Text(
                            "عکسی ضمیمه نشده است.",
                            style: TextStyle(
                              color: Colors.white54,
                              fontSize: 12,
                              fontFamily: 'Vazirmatn',
                            ),
                          ),
                        ),
                      ...addedMedia.asMap().entries.map((entry) {
                        final int index = entry.key;
                        return Card(
                          color: const Color(0xFF2A2A35),
                          child: ListTile(
                            leading: const Icon(
                              Icons.image,
                              color: Colors.white70,
                            ),
                            title: const Text(
                              "مدرک پیوست شد",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontFamily: 'Vazirmatn',
                              ),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.check_circle,
                                  color: Colors.green,
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () {
                                    sheetContext
                                        .read<BreakdownReportBloc>()
                                        .add(
                                          BreakdownMediaRemoved(index: index),
                                        );
                                  },
                                  child: const Icon(
                                    Icons.close,
                                    color: Colors.white54,
                                    size: 18,
                                  ),
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
                            icon: const Icon(
                              Icons.build,
                              color: Colors.orange,
                              size: 18,
                            ),
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
                            style: TextStyle(
                              color: Colors.white54,
                              fontSize: 12,
                              fontFamily: 'Vazirmatn',
                            ),
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
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontFamily: 'Vazirmatn',
                              ),
                            ),
                            subtitle: Text(
                              "اقدام: ${part.action} | تعداد: ${part.qty}",
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                                fontFamily: 'Vazirmatn',
                              ),
                            ),
                            trailing: InkWell(
                              onTap: () {
                                sheetContext
                                    .read<BreakdownReportBloc>()
                                    .add(
                                      BreakdownPartRemoved(index: index),
                                    );
                              },
                              child: const Icon(
                                Icons.close,
                                color: Colors.white54,
                                size: 18,
                              ),
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
                          backgroundColor: isLoading
                              ? Colors.grey.shade700
                              : const Color(0xFFE53935),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: isLoading
                            ? null
                            : () {
                                sheetContext.read<BreakdownReportBloc>().add(
                                      BreakdownSubmitRequested(
                                        description: widget
                                            .descriptionController.text
                                            .trim(),
                                        employerComments: widget
                                            .employerCommentsController.text
                                            .trim(),
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
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
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
