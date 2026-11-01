import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/network/api_client.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiClient().getNotifications();
      if (mounted) {
        setState(() {
          _notifications = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString(), style: const TextStyle(fontFamily: 'Vazirmatn')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // 👈 متد تغییر وضعیت پیام به خوانده‌شده هنگام کلیک
  Future<void> _markAsRead(String id, int index) async {
    if (_notifications[index]['is_read'] == true) return;

    setState(() {
      _notifications[index]['is_read'] = true;
    });

    await ApiClient().markNotificationAsRead(id);
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
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: AppColors.textBlack, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text(
            "پیام‌ها و اعلانات",
            style: TextStyle(fontFamily: 'Vazirmatn', color: AppColors.textBlack, fontWeight: FontWeight.bold, fontSize: 18),
          ),
          centerTitle: true,
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : RefreshIndicator(
          color: AppColors.primaryGreen,
          onRefresh: _fetchNotifications,
          child: _notifications.isEmpty
              ? Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.notifications_off_outlined, size: 64, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                const Text(
                  "پیام جدیدی ندارید",
                  style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 16, color: Colors.grey),
                ),
              ],
            ),
          )
              : ListView.builder(
            padding: const EdgeInsets.all(20),
            physics: const AlwaysScrollableScrollPhysics(), // 👈 برای فعال ماندن رفرش
            itemCount: _notifications.length,
            itemBuilder: (context, index) {
              final notif = _notifications[index];
              final isRead = notif['is_read'] ?? false;

              return GestureDetector(
                onTap: () => _markAsRead(notif['id'], index), // 👈 کلیک برای خوانده‌شدن
                child: Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 12),
                  color: isRead ? Colors.white : Colors.blue.shade50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isRead ? Colors.grey.shade200 : Colors.blue.shade200,
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: _getIconColor(notif['type']).withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(_getIcon(notif['type']), color: _getIconColor(notif['type']), size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    notif['title'],
                                    style: TextStyle(
                                      fontFamily: 'Vazirmatn',
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: isRead ? AppColors.textBlack : Colors.blue.shade900,
                                    ),
                                  ),
                                  Text(
                                    notif['time'],
                                    style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 11, color: Colors.grey.shade600),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                notif['body'],
                                style: TextStyle(fontFamily: 'Vazirmatn', fontSize: 13, color: Colors.grey.shade800, height: 1.5),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  IconData _getIcon(String type) {
    switch (type) {
      case 'assign': return Icons.assignment_ind;
      case 'cancel': return Icons.cancel_outlined;
      default: return Icons.info_outline;
    }
  }

  Color _getIconColor(String type) {
    switch (type) {
      case 'assign': return AppColors.primaryGreen;
      case 'cancel': return Colors.red;
      default: return Colors.blue;
    }
  }
}