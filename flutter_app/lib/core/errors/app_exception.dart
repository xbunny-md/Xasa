sealed class OdyxException implements Exception {
  const OdyxException(this.message, {this.retryable = false});

  final String message;
  final bool retryable;

  @override
  String toString() => message;
}

class ConfigException extends OdyxException {
  const ConfigException(super.message) : super(retryable: false);
}

class NetworkException extends OdyxException {
  const NetworkException(super.message) : super(retryable: true);
}

class ApiException extends OdyxException {
  const ApiException(
    super.message, {
    this.statusCode,
    super.retryable = false,
  });

  final int? statusCode;
}

class AppAuthException extends OdyxException {
  const AppAuthException(super.message, {this.code}) : super(retryable: false);

  final String? code;
}

class FirestoreDataException extends OdyxException {
  const FirestoreDataException(super.message) : super(retryable: true);
}
