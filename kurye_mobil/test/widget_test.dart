import 'package:flutter_test/flutter_test.dart';
import 'package:kurye_mobil/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const KuryeMobilApp());
    expect(find.text('Kurye Portalı'), findsOneWidget);
  });
}
