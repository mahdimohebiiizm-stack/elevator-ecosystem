import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/network/api_client.dart';
import '../../auth/login_screen.dart';
import '../../admin/user_management_screen.dart';
import '../../admin/building_management_screen.dart';
import '../../admin/contract_management_screen.dart'; // 👈 ایمپورت صفحه جدید

class ProfileTab extends StatelessWidget {
  final String userName;
  final String userRole;

  const ProfileTab({
    super.key,
    required this.userName,
    required this.userRole,
  });

  void _handleLogout(BuildContext context) async {
    await ApiClient().logout();
    if (context.mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
            (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 40),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primaryGreen, width: 2),
              ),
              child: const CircleAvatar(
                radius: 50,
                backgroundColor: Color(0xFFF7F8FA),
                child: Icon(Icons.person, size: 50, color: AppColors.primaryGreen),
              ),
            ),
            const SizedBox(height: 16),
            Text(userName, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textBlack)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(color: Colors.blue.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Text("سطح دسترسی: $userRole", style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 32),

            // --- بخش اختصاصی مدیران (Admin Hub) ---
            if (userRole == 'ADMIN' || userRole == 'MANAGER') ...[
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text("پنل مدیریت سیستم", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textBlack)),
                ),
              ),
              const SizedBox(height: 16),
              _buildAdminActionCard(
                context: context,
                title: "مدیریت پرسنل",
                subtitle: "افزودن و ویرایش تکنسین‌ها",
                icon: Icons.manage_accounts,
                color: Colors.blue,
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (context) => const UserManagementScreen()));
                },
              ),
              _buildAdminActionCard(
                context: context,
                title: "مدیریت ساختمان‌ها",
                subtitle: "ثبت پروژه و اطلاعات پایه",
                icon: Icons.domain,
                color: Colors.orange,
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (context) => const BuildingManagementScreen()));
                },
              ),
              _buildAdminActionCard(
                context: context,
                title: "مدیریت قراردادها",
                subtitle: "ثبت و تمدید قرارداد پروژه‌ها", // 👈 حذف عبارت به زودی
                icon: Icons.description,
                color: Colors.green,
                onTap: () {
                  // 👈 اتصال به صفحه مدیریت قراردادها
                  Navigator.push(context, MaterialPageRoute(builder: (context) => const ContractManagementScreen()));
                },
              ),
              const SizedBox(height: 24),
            ],

            SizedBox(
              width: 200,
              child: ElevatedButton.icon(
                onPressed: () => _handleLogout(context),
                icon: const Icon(Icons.logout, size: 20),
                label: const Text("خروج از حساب", style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 14, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF5252),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 100), // فضای خالی برای اسکرول زیر منوی ناوبری
          ],
        ),
      ),
    );
  }

  Widget _buildAdminActionCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12, left: 24, right: 24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontFamily: 'Vazirmatn', fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(subtitle, style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}