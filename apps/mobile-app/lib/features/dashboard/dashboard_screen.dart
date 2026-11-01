import 'package:flutter/material.dart';
import 'dart:ui';
import '../../core/theme/app_colors.dart';
import '../../core/network/api_client.dart';

// ایمپورت کردن تب‌هایی که در پوشه tabs ساختیم
import 'tabs/profile_tab.dart';
import 'tabs/workbench_tab.dart';
import 'tabs/reports_tab.dart';
import 'tabs/finance_tab.dart';
import 'tabs/team_tab.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 1; // تب پیش‌فرض روی میز کار است
  String _userRole = 'TECHNICIAN';
  String _userName = 'کاربر سیستم';
  bool _isLoading = true;

  List<Map<String, dynamic>> _navItems = [];

  @override
  void initState() {
    super.initState();
    _loadUserRoleAndSetupTabs();
  }

  Future<void> _loadUserRoleAndSetupTabs() async {
    String? role = await ApiClient().getUserRole();
    String? name = await ApiClient().getUserName();

    if (mounted) {
      setState(() {
        _userRole = role ?? 'TECHNICIAN';
        _userName = name ?? 'کاربر سیستم';
        _setupNavItems();
        _isLoading = false;
      });
    }
  }

  void _setupNavItems() {
    // ترتیب تب‌ها (برای جلوگیری از Overflow نام‌گذاری‌ها کوتاه و آیکون‌ها هماهنگ شده‌اند)
    _navItems = [
      {
        'page': const TeamTab(), // فقط ادمین
        'icon': Icons.people_outline,
        'activeIcon': Icons.people,
        'label': 'تیم',
        'adminOnly': true,
      },
      {
        'page': const FinanceTab(), // فقط ادمین
        'icon': Icons.account_balance_wallet_outlined,
        'activeIcon': Icons.account_balance_wallet,
        'label': 'مالی',
        'adminOnly': true,
      },
      {
        'page': const ReportsTab(),
        'icon': Icons.assignment_outlined,
        'activeIcon': Icons.assignment,
        'label': 'گزارش‌ها',
        'adminOnly': false,
      },
      {
        'page': WorkbenchTab(userRole: _userRole),
        'icon': Icons.dashboard_outlined,
        'activeIcon': Icons.dashboard,
        'label': 'میز کار',
        'adminOnly': false,
      },
      {
        'page': ProfileTab(userName: _userName, userRole: _userRole),
        'icon': Icons.person_outline,
        'activeIcon': Icons.person,
        'label': 'پروفایل',
        'adminOnly': false,
      },
    ];

    // حذف تب‌های ادمین برای تکنسین
    if (_userRole != 'ADMIN' && _userRole != 'MANAGER') {
      _navItems.removeWhere((item) => item['adminOnly'] == true);
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.backgroundWhite,
        body: Center(child: CircularProgressIndicator(color: AppColors.primaryGreen)),
      );
    }

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.backgroundWhite,
        extendBody: true,
        body: SafeArea(
          bottom: false,
          child: _navItems.length > _selectedIndex ? _navItems[_selectedIndex]['page'] : _navItems[0]['page'],
        ),
        bottomNavigationBar: _buildFloatingNavBar(),
      ),
    );
  }

  Widget _buildFloatingNavBar() {
    return Container(
      margin: const EdgeInsets.only(left: 16, right: 16, bottom: 20),
      height: 70, // 👈 کاهش ارتفاع برای جلوگیری از فشردگی در گوشی‌های کوچک
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(35),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(35),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(35),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.5),
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly, // 👈 توزیع مساوی فضای خالی برای جلوگیری از Overflow
              children: List.generate(_navItems.length, (index) {
                return _buildNavItem(
                  index: index,
                  icon: _navItems[index]['icon'],
                  activeIcon: _navItems[index]['activeIcon'],
                  label: _navItems[index]['label'],
                );
              }),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({required int index, required IconData icon, required IconData activeIcon, required String label}) {
    final isSelected = _selectedIndex == index;
    final color = isSelected ? Colors.green[600]! : AppColors.textGrey;

    return GestureDetector(
      onTap: () => _onItemTapped(index),
      behavior: HitTestBehavior.opaque,
      child: Container(
        // 👈 حذف padding افقی ثابت برای اینکه در گوشی‌های کوچک دکمه‌ها روی هم نیفتند
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        color: Colors.transparent, // برای افزایش ناحیه کلیک
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isSelected ? activeIcon : icon, color: color, size: 24), // 👈 سایز آیکون کمی کوچکتر شد
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10, // 👈 سایز فونت کمی کوچکتر شد تا در یک خط جا بشود
                fontFamily: 'Vazirmatn',
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis, // 👈 در صورت طولانی شدن متن، نقطه چین می‌گذارد به جای ارور
            ),
          ],
        ),
      ),
    );
  }
}