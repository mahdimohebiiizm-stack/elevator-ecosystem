import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/network/api_client.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});

  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  List<dynamic> _users = [];
  bool _isLoading = true;
  String? _currentUserPhone;
  String? _currentUserRole; // 👈 ذخیره نقش کاربری که الان لاگین است

  @override
  void initState() {
    super.initState();
    _fetchUsersAndCurrentUser();
  }

  Future<void> _fetchUsersAndCurrentUser() async {
    setState(() => _isLoading = true);
    try {
      final phone = await ApiClient().storage.read(key: 'username');
      final role = await ApiClient().getUserRole(); // 👈 دریافت نقش کاربر فعلی از استوریج
      final users = await ApiClient().getUsers();

      if (mounted) {
        setState(() {
          _currentUserPhone = phone;
          _currentUserRole = role;
          _users = users;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("خطا در دریافت لیست: $e", style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red),
        );
      }
    }
  }

  // 👈 متد بررسی سطح دسترسی برای روشن/خاموش کردن کلید
  bool _canModifyStatus(String targetRole, bool isMe) {
    if (isMe) return false; // هیچکس نمی‌تواند حساب خودش را غیرفعال کند
    if (_currentUserRole == 'ADMIN') return true; // ادمین می‌تواند همه را تغییر دهد
    if (_currentUserRole == 'MANAGER' && targetRole == 'TECHNICIAN') return true; // مدیر فقط تکنسین را می‌تواند تغییر دهد
    return false; // در سایر حالت‌ها دسترسی بسته است
  }

  // 👈 متد نمایش دیالوگ تایید قبل از تغییر وضعیت
  void _confirmToggleStatus(String userId, String userName, bool currentStatus) {
    final actionText = currentStatus ? "غیرفعال" : "فعال";
    final actionColor = currentStatus ? Colors.red.shade600 : AppColors.primaryGreen;

    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: actionColor),
              const SizedBox(width: 8),
              Text("$actionText کردن کاربر", style: const TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: Text("آیا از $actionText کردن حساب «$userName» اطمینان دارید؟", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 14)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("انصراف", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: actionColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              onPressed: () {
                Navigator.pop(ctx);
                _toggleUserStatus(userId, currentStatus); // اجرای تغییر پس از تایید
              },
              child: Text("بله، $actionText شود", style: const TextStyle(fontFamily: 'Vazirmatn', color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleUserStatus(String userId, bool currentStatus) async {
    try {
      final success = await ApiClient().updateUser(userId, {'is_active': !currentStatus});
      if (success) {
        _fetchUsersAndCurrentUser();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showAddUserDialog() {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final passwordController = TextEditingController();
    String selectedRole = 'TECHNICIAN';
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
            builder: (context, setDialogState) {
              return Directionality(
                textDirection: TextDirection.rtl,
                child: AlertDialog(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  title: const Text("افزودن پرسنل جدید", style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 18)),
                  content: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildTextField(nameController, "نام و نام خانوادگی", Icons.person),
                        const SizedBox(height: 12),
                        _buildTextField(phoneController, "شماره موبایل", Icons.phone, isNumber: true),
                        const SizedBox(height: 12),
                        _buildTextField(passwordController, "رمز عبور اولیه", Icons.lock),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: selectedRole,
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: Colors.grey.shade100,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                          items: [
                            const DropdownMenuItem(value: 'TECHNICIAN', child: Text("تکنسین (TECHNICIAN)", style: TextStyle(fontFamily: 'Vazirmatn'))),
                            // مدیر فقط اگر خودش ادمین باشد می‌تواند مدیر یا ادمین جدید بسازد
                            if (_currentUserRole == 'ADMIN') ...[
                              const DropdownMenuItem(value: 'MANAGER', child: Text("مدیر (MANAGER)", style: TextStyle(fontFamily: 'Vazirmatn'))),
                              const DropdownMenuItem(value: 'ADMIN', child: Text("ادمین کل (ADMIN)", style: TextStyle(fontFamily: 'Vazirmatn'))),
                            ]
                          ],
                          onChanged: (val) => setDialogState(() => selectedRole = val!),
                        ),
                      ],
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: isSubmitting ? null : () => Navigator.pop(context),
                      child: const Text("انصراف", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.grey)),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen),
                      onPressed: isSubmitting ? null : () async {
                        if (nameController.text.isEmpty || phoneController.text.isEmpty || passwordController.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("همه فیلدها الزامی است")));
                          return;
                        }

                        setDialogState(() => isSubmitting = true);
                        try {
                          await ApiClient().createUser({
                            "full_name": nameController.text.trim(),
                            "phone_number": phoneController.text.trim(),
                            "password": passwordController.text.trim(),
                            "role": selectedRole,
                          });
                          if (context.mounted) {
                            Navigator.pop(context);
                            _fetchUsersAndCurrentUser();
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("کاربر با موفقیت ثبت شد", style: TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.green));
                          }
                        } catch (e) {
                          setDialogState(() => isSubmitting = false);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Vazirmatn')), backgroundColor: Colors.red));
                          }
                        }
                      },
                      child: isSubmitting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text("ثبت پرسنل", style: TextStyle(fontFamily: 'Vazirmatn', color: Colors.white)),
                    ),
                  ],
                ),
              );
            }
        );
      },
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, IconData icon, {bool isNumber = false}) {
    return TextField(
      controller: controller,
      keyboardType: isNumber ? TextInputType.phone : TextInputType.text,
      style: const TextStyle(fontFamily: 'Vazirmatn'),
      decoration: InputDecoration(
        prefixIcon: Icon(icon, color: Colors.grey),
        hintText: hint,
        hintStyle: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 13),
        filled: true,
        fillColor: Colors.grey.shade100,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundWhite,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: const IconThemeData(color: AppColors.textBlack),
          title: const Text("مدیریت پرسنل", style: TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontWeight: FontWeight.bold)),
          centerTitle: true,
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchUsersAndCurrentUser),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: _users.length,
          itemBuilder: (context, index) {
            final user = _users[index];
            final bool isActive = user['is_active'] ?? false;
            final String role = user['role'] ?? 'N/A';

            final bool isMe = _currentUserPhone != null && user['phone_number'] == _currentUserPhone;
            final bool canModify = _canModifyStatus(role, isMe); // 👈 بررسی مجوز تغییر وضعیت

            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 12),
              color: isActive ? Colors.white : Colors.grey.shade100,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: isActive ? Colors.grey.shade200 : Colors.red.shade100),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: isActive ? Colors.blue.withValues(alpha: 0.1) : Colors.grey.shade300,
                      child: Icon(Icons.person, color: isActive ? Colors.blue : Colors.grey),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(user['full_name'], style: TextStyle(fontFamily: 'Vazirmatn', fontWeight: FontWeight.bold, fontSize: 16, color: isActive ? Colors.black87 : Colors.grey)),
                              if (isMe) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(4)),
                                  child: const Text("شما", style: TextStyle(fontSize: 10, fontFamily: 'Vazirmatn', color: Colors.black54, fontWeight: FontWeight.bold)),
                                )
                              ]
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(user['phone_number'], style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey.shade600)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: role == 'ADMIN' ? Colors.purple.withValues(alpha: 0.1) : (role == 'MANAGER' ? Colors.orange.withValues(alpha: 0.1) : Colors.green.withValues(alpha: 0.1)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(role, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: role == 'ADMIN' ? Colors.purple : (role == 'MANAGER' ? Colors.orange : Colors.green))),
                    ),
                    const SizedBox(width: 12),
                    // 👈 اختصاص دیالوگ تایید به جای تغییر مستقیم
                    Switch(
                      value: isActive,
                      activeColor: AppColors.primaryGreen,
                      onChanged: canModify
                          ? (val) => _confirmToggleStatus(user['id'], user['full_name'], isActive)
                          : null,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        floatingActionButton: FloatingActionButton(
          backgroundColor: AppColors.primaryGreen,
          onPressed: _showAddUserDialog,
          child: const Icon(Icons.add, color: Colors.white),
        ),
      ),
    );
  }
}