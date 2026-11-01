import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'core/theme/app_theme.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/dashboard/dashboard_screen.dart';

// 🌟 راه‌اندازی پلاگین نوتیفیکیشن برای پاپ‌آپ داخل اپلیکیشن
final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

// 🌟 هندلر دریافت پیام وقتی اپلیکیشن بسته است (باید بیرون از کلاس باشد)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint("📩 پیام در پس‌زمینه دریافت شد: ${message.messageId}");
}

Future<void> main() async {
  // اطمینان از اینکه افزونه‌های فلاتر لود شده‌اند (الزامی برای فایربیس)
  WidgetsFlutterBinding.ensureInitialized();

  // 🌟 اتصال به فایربیس و ثبت شنونده پس‌زمینه
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint("⚠️ فایربیس هنوز وصل نیست (نیاز به google-services.json): $e");
  }

  runApp(const ElevatorApp());
}

class ElevatorApp extends StatefulWidget {
  const ElevatorApp({Key? key}) : super(key: key);

  @override
  State<ElevatorApp> createState() => _ElevatorAppState();
}

class _ElevatorAppState extends State<ElevatorApp> {
  // یک صفحه لودینگ ساده تا زمانی که وضعیت لاگین چک شود
  Widget _defaultHome = const Scaffold(
    body: Center(
      child: CircularProgressIndicator(),
    ),
  );

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
    _setupPushNotifications(); // 👈 فراخوانی هوشمند نوتیفیکیشن هنگام لود برنامه
  }

  // 🌟 متد دریافت مجوز کاربر و تنظیم نوتیفیکیشن‌های آنی
  Future<void> _setupPushNotifications() async {
    try {
      FirebaseMessaging messaging = FirebaseMessaging.instance;

      // ۱. درخواست اجازه از کاربر (برای اندروید ۱۳ به بالا و iOS حیاتی است)
      NotificationSettings settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      debugPrint('وضعیت مجوز نوتیفیکیشن: ${settings.authorizationStatus}');

      // ۲. دریافت Token اختصاصی این گوشی برای ارسال به بک‌اند پایتون
      String? token = await messaging.getToken();
      debugPrint("🔑 توکن اختصاصی گوشی (FCM Token): $token");

      // ۳. تنظیمات کانال اندروید (الزامی برای اندروید ۸ به بالا تا صدا و پاپ‌آپ فعال شود)
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'high_importance_channel',
        'اعلانات مهم سیستم',
        description: 'این کانال برای اعلان‌های مهم مثل ارجاع کار جدید استفاده می‌شود.',
        importance: Importance.max,
      );

      await flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      // ۴. شنود نوتیفیکیشن‌ها وقتی کاربر دقیقاً داخل اپلیکیشن است
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        RemoteNotification? notification = message.notification;
        AndroidNotification? android = message.notification?.android;

        if (notification != null && android != null) {
          flutterLocalNotificationsPlugin.show(
            notification.hashCode,
            notification.title,
            notification.body,
            NotificationDetails(
              android: AndroidNotificationDetails(
                channel.id,
                channel.name,
                channelDescription: channel.description,
                icon: '@mipmap/ic_launcher',
                importance: Importance.max,
                priority: Priority.high,
              ),
            ),
          );
        }
      });
    } catch (e) {
      debugPrint("❌ خطای راه‌اندازی نوتیفیکیشن: $e");
    }
  }

  // متد بررسی وضعیت ورود کاربر
  Future<void> _checkLoginStatus() async {
    const storage = FlutterSecureStorage();
    String? token = await storage.read(key: 'jwt_token');

    if (mounted) {
      setState(() {
        if (token != null && token.isNotEmpty) {
          // کاربر قبلا لاگین کرده است -> انتقال به داشبورد
          _defaultHome = const DashboardScreen();
        } else {
          // کاربر لاگین نکرده است -> انتقال به صفحه معرفی شما
          _defaultHome = const OnboardingScreen();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Elevator+Pro',
      debugShowCheckedModeBanner: false, // حذف نوار قرمز رنگ دیباگ
      theme: AppTheme.lightTheme, // اعمال تمی که طراحی کردیم

      // اضافه شدن پشتیبانی از زبان فارسی و راست‌چین شدن کل اپلیکیشن
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('fa', 'IR'), // فارسی
      ],
      locale: const Locale('fa', 'IR'), // اجبار به استفاده از فارسی

      home: _defaultHome, // تعیین هوشمند صفحه شروع
    );
  }
}