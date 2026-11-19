enum ApiConfigStatus {
  configured,
  missing,
  invalid,
}

class ApiConfig {
  ApiConfig({String? overrideBaseUrl})
      : rawBaseUrl = (overrideBaseUrl ??
                const String.fromEnvironment('API_BASE_URL', defaultValue: ''))
            .trim() {
    final validation = _validate(rawBaseUrl);
    normalizedBaseUrl = validation.$1;
    status = validation.$2;
    errorMessage = validation.$3;
  }

  final String rawBaseUrl;
  late final String? normalizedBaseUrl;
  late final ApiConfigStatus status;
  late final String? errorMessage;

  bool get isConfigured => status == ApiConfigStatus.configured && normalizedBaseUrl != null;

  String get environmentLabel {
    if (!isConfigured) return 'Not Configured';
    final uri = Uri.parse(normalizedBaseUrl!);
    final host = uri.host.toLowerCase();
    if (host == 'localhost' ||
        host == '127.0.0.1' ||
        host == '10.0.2.2' ||
        host.startsWith('192.168.') ||
        uri.scheme == 'http') {
      return 'Development';
    }
    return 'Production';
  }

  String get displayHost {
    if (!isConfigured) return 'API_BASE_URL not set';
    return Uri.parse(normalizedBaseUrl!).host;
  }

  Uri resolveUri(String path, [Map<String, String>? queryParameters]) {
    if (!isConfigured) {
      throw StateError(
        errorMessage ??
            'Backend API URL is not configured. Rebuild with --dart-define=API_BASE_URL=https://your-project.vercel.app',
      );
    }

    final cleanPath = path.startsWith('/') ? path : '/$path';
    final base = Uri.parse(normalizedBaseUrl!);
    final basePath = base.path.endsWith('/')
        ? base.path.substring(0, base.path.length - 1)
        : base.path;

    return base.replace(
      path: '$basePath$cleanPath',
      queryParameters: (queryParameters == null || queryParameters.isEmpty)
          ? null
          : queryParameters,
    );
  }

  static (String?, ApiConfigStatus, String?) _validate(String raw) {
    if (raw.isEmpty) {
      return (
        null,
        ApiConfigStatus.missing,
        'API_BASE_URL is not configured for this build. Firebase feeds remain available, while live API features require API_BASE_URL.',
      );
    }

    final candidate = raw.endsWith('/') ? raw.substring(0, raw.length - 1) : raw;
    final parsed = Uri.tryParse(candidate);
    if (parsed == null ||
        !parsed.hasScheme ||
        (parsed.scheme != 'https' && parsed.scheme != 'http') ||
        parsed.host.trim().isEmpty) {
      return (
        null,
        ApiConfigStatus.invalid,
        'API_BASE_URL ("$raw") is invalid. Provide a full http:// or https:// URL without trailing garbage.',
      );
    }

    return (candidate, ApiConfigStatus.configured, null);
  }
}
