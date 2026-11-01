import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// درخواست لاگین با شماره موبایل و کلمه عبور
class AuthLoginRequested extends AuthEvent {
  final String phone;
  final String password;

  const AuthLoginRequested({
    required this.phone,
    required this.password,
  });

  @override
  List<Object?> get props => [phone, password];
}

/// درخواست خروج امن از حساب کاربری
class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

/// بررسی وضعیت توکن و جلسه کاری در آغاز اجرای برنامه
class AuthCheckStatusRequested extends AuthEvent {
  const AuthCheckStatusRequested();
}
