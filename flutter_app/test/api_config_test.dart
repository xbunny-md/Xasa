import 'package:flutter_test/flutter_test.dart';
import 'package:odyx/config/api_config.dart';

void main() {
  group('ApiConfig', () {
    test('reports missing when API_BASE_URL is empty', () {
      final config = ApiConfig(overrideBaseUrl: '');
      expect(config.status, ApiConfigStatus.missing);
      expect(config.isConfigured, isFalse);
      expect(config.normalizedBaseUrl, isNull);
      expect(config.environmentLabel, 'Not Configured');
      expect(() => config.resolveUri('/api/health'), throwsStateError);
    });

    test('reports invalid for malformed URL without scheme or host', () {
      final config = ApiConfig(overrideBaseUrl: 'odyx-backend.vercel.app');
      expect(config.status, ApiConfigStatus.invalid);
      expect(config.isConfigured, isFalse);
    });

    test('normalizes valid https production URL and resolves endpoints', () {
      final config =
          ApiConfig(overrideBaseUrl: 'https://odyx-app.vercel.app/');
      expect(config.status, ApiConfigStatus.configured);
      expect(config.isConfigured, isTrue);
      expect(config.normalizedBaseUrl, 'https://odyx-app.vercel.app');
      expect(config.environmentLabel, 'Production');
      expect(config.displayHost, 'odyx-app.vercel.app');

      final uri = config.resolveUri(
        'api/tickets',
        {'bookmaker': 'BETPAWA_TZ'},
      );
      expect(
        uri.toString(),
        'https://odyx-app.vercel.app/api/tickets?bookmaker=BETPAWA_TZ',
      );
    });

    test('classifies local emulator URLs as Development', () {
      final config = ApiConfig(overrideBaseUrl: 'http://10.0.2.2:3000');
      expect(config.isConfigured, isTrue);
      expect(config.environmentLabel, 'Development');
    });
  });
}
