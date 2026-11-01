import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/theme/app_colors.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({Key? key}) : super(key: key);

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> with SingleTickerProviderStateMixin {
  final MobileScannerController cameraController = MobileScannerController();
  bool _isScanned = false;
  bool _isTorchOn = false;

  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    // راه‌اندازی انیمیشن خط لیزر
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animationController.dispose();
    cameraController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scanWindowSize = MediaQuery.of(context).size.width * 0.7;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            // ۱. دوربین اسکنر
            MobileScanner(
              controller: cameraController,
              onDetect: (capture) {
                if (_isScanned) return;

                final List<Barcode> barcodes = capture.barcodes;
                for (final barcode in barcodes) {
                  if (barcode.rawValue != null) {
                    _isScanned = true;
                    final String scannedCode = barcode.rawValue!;

                    // ایجاد ویبره برای تایید اسکن موفق
                    HapticFeedback.heavyImpact();

                    Navigator.pop(context, scannedCode);
                    break;
                  }
                }
              },
            ),

            // ۲. پوشش تاریک (Overlay) با کادر شفاف در وسط
            CustomPaint(
              painter: _ScannerOverlayPainter(scanWindowSize: scanWindowSize),
              child: Container(),
            ),

            // ۳. خط لیزر متحرک
            Center(
              child: SizedBox(
                width: scanWindowSize,
                height: scanWindowSize,
                child: AnimatedBuilder(
                  animation: _animationController,
                  builder: (context, child) {
                    return Positioned(
                      top: _animationController.value * scanWindowSize,
                      child: Container(
                        width: scanWindowSize,
                        height: 3,
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreen,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryGreen.withValues(alpha: 0.6),
                              blurRadius: 10,
                              spreadRadius: 2,
                            )
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

            // ۴. هدر اپلیکیشن (دکمه برگشت و چراغ‌قوه)
            Positioned(
              top: 50,
              left: 20,
              right: 20,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    decoration: BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                    child: IconButton(
                      icon: Icon(_isTorchOn ? Icons.flash_on : Icons.flash_off, color: _isTorchOn ? Colors.amber : Colors.white),
                      onPressed: () async {
                        await cameraController.toggleTorch();
                        setState(() => _isTorchOn = !_isTorchOn);
                      },
                    ),
                  ),
                ],
              ),
            ),

            // ۵. پیام راهنما در پایین صفحه
            Positioned(
              bottom: 80,
              left: 0,
              right: 0,
              child: Column(
                children: [
                  const Icon(Icons.qr_code_scanner, color: Colors.white54, size: 40),
                  const SizedBox(height: 12),
                  const Text(
                    'بارکد کابین آسانسور را در کادر قرار دهید',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Vazirmatn'),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'اسکن به صورت خودکار انجام می‌شود',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 12, fontFamily: 'Vazirmatn'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// نقاش سفارشی برای ساخت کادر تاریک و گوشه‌های برجسته اسکنر
// ==========================================
class _ScannerOverlayPainter extends CustomPainter {
  final double scanWindowSize;

  _ScannerOverlayPainter({required this.scanWindowSize});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.black.withValues(alpha: 0.65);

    // کشیدن پس‌زمینه تاریک
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()
          ..addRRect(RRect.fromRectAndRadius(
            Rect.fromCenter(center: Offset(size.width / 2, size.height / 2), width: scanWindowSize, height: scanWindowSize),
            const Radius.circular(16),
          ))
          ..close(),
      ),
      paint,
    );

    // کشیدن گوشه‌های برجسته (Corners)
    final cornerPaint = Paint()
      ..color = AppColors.primaryGreen
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height / 2);
    final halfSize = scanWindowSize / 2;
    const cornerLength = 30.0;

    // بالا راست
    canvas.drawPath(Path()..moveTo(center.dx + halfSize, center.dy - halfSize + cornerLength)..lineTo(center.dx + halfSize, center.dy - halfSize)..lineTo(center.dx + halfSize - cornerLength, center.dy - halfSize), cornerPaint);
    // بالا چپ
    canvas.drawPath(Path()..moveTo(center.dx - halfSize, center.dy - halfSize + cornerLength)..lineTo(center.dx - halfSize, center.dy - halfSize)..lineTo(center.dx - halfSize + cornerLength, center.dy - halfSize), cornerPaint);
    // پایین راست
    canvas.drawPath(Path()..moveTo(center.dx + halfSize, center.dy + halfSize - cornerLength)..lineTo(center.dx + halfSize, center.dy + halfSize)..lineTo(center.dx + halfSize - cornerLength, center.dy + halfSize), cornerPaint);
    // پایین چپ
    canvas.drawPath(Path()..moveTo(center.dx - halfSize, center.dy + halfSize - cornerLength)..lineTo(center.dx - halfSize, center.dy + halfSize)..lineTo(center.dx - halfSize + cornerLength, center.dy + halfSize), cornerPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}