import 'package:flutter_test/flutter_test.dart';
import 'package:elevator_mobile/features/reports/models/checklist_item_model.dart';
import 'package:elevator_mobile/features/dashboard/data/finance_repository.dart';

void main() {
  group('Enterprise Domain & Model Unit Tests', () {
    test('ChecklistItemModel initializes with NOT_CHECKED and toggles properly', () {
      const item = ChecklistItemModel(
        keyName: 'parachute_brake',
        title: 'سیستم پاراشوت و ترمز ایمنی',
      );
      expect(item.keyName, 'parachute_brake');
      expect(item.title, 'سیستم پاراشوت و ترمز ایمنی');
      expect(item.status, CheckStatus.NOT_CHECKED);

      final updatedItem = item.copyWith(status: CheckStatus.OK);
      expect(updatedItem.status, CheckStatus.OK);
      expect(updatedItem.title, item.title);
      expect(updatedItem.keyName, item.keyName);
    });

    test('FinanceDataModel computes debts and serializes correctly', () {
      final summary = {
        'finance': {
          'total_market_debt': 150000000.0,
          'income_last_30_days': 45000000.0,
          'overdue_contracts': [],
        },
        'business': {
          'active_contracts': 12,
        }
      };

      final model = FinanceDataModel.fromApiData(
        summary: summary,
        transactions: [],
        isFromCache: false,
      );

      expect(model.totalMarketDebt, 150000000.0);
      expect(model.incomeLast30Days, 45000000.0);
      expect(model.activeContractsCount, 12);
      expect(model.isFromCache, false);

      final json = model.toJson();
      final restored = FinanceDataModel.fromJson(json, isFromCache: true);
      expect(restored.totalMarketDebt, 150000000.0);
      expect(restored.incomeLast30Days, 45000000.0);
      expect(restored.activeContractsCount, 12);
      expect(restored.isFromCache, true);
    });
  });
}
