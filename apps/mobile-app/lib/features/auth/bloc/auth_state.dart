import 'package:equatable/equatable.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// وضعیت اولیه احراز هویت
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// وضعیت در حال پردازش یا انتظار برای پاسخ سرور
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// وضعیت احراز هویت موفق با اطلاعات کاربر لاگین‌شده
class AuthAuthenticated extends AuthState {
  final String token;
  final String role;
  final String fullName;

  const AuthAuthenticated({
    required this.token,
    required this.role,
    required this.fullName,
  });

  @override
  List<Object?> get props => [token, role, fullName];
}

/// وضعیت عدم احراز هویت یا خروج از سیستم
class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// وضعیت شکست در احراز هویت همراه با پیام خطا
class AuthFailure extends AuthState {
  final String errorMessage;

  const AuthFailure({required this.errorMessage});

  @override
  List<Object?> get props => [errorMessage];
}
