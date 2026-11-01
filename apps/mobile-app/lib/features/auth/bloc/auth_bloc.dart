import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/auth_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';

export 'auth_event.dart';
export 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({AuthRepository? authRepository})
      : _authRepository = authRepository ?? AuthRepository(),
        super(const AuthInitial()) {
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthCheckStatusRequested>(_onCheckStatusRequested);
  }

  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final isSuccess = await _authRepository.login(event.phone, event.password);
      if (isSuccess) {
        final token = await _authRepository.getToken() ?? '';
        final role = await _authRepository.getUserRole() ?? 'TECHNICIAN';
        final fullName = await _authRepository.getUserName() ?? 'کاربر سیستم';
        emit(AuthAuthenticated(
          token: token,
          role: role,
          fullName: fullName,
        ));
      } else {
        emit(const AuthFailure(errorMessage: 'نام کاربری یا رمز عبور نامعتبر است.'));
      }
    } catch (e) {
      final errorMessage = e.toString().replaceAll("Exception: ", "");
      emit(AuthFailure(errorMessage: errorMessage));
    }
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      await _authRepository.logout();
    } catch (_) {
      // پاک‌سازی استیت در کلاینت حتی در صورت خطای شبکه
    } finally {
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> _onCheckStatusRequested(
    AuthCheckStatusRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final isAuth = await _authRepository.isAuthenticated();
      if (isAuth) {
        final token = await _authRepository.getToken() ?? '';
        final role = await _authRepository.getUserRole() ?? 'TECHNICIAN';
        final fullName = await _authRepository.getUserName() ?? 'کاربر سیستم';
        emit(AuthAuthenticated(
          token: token,
          role: role,
          fullName: fullName,
        ));
      } else {
        emit(const AuthUnauthenticated());
      }
    } catch (_) {
      emit(const AuthUnauthenticated());
    }
  }
}
