import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../core/errors/app_exception.dart';

class OdyxHttpClient {
  OdyxHttpClient({
    required this.config,
    http.Client? httpClient,
    this.requestTimeout = const Duration(seconds: 15),
    this.maxGetRetries = 2,
  }) : _client = httpClient ?? http.Client();

  final ApiConfig config;
  final http.Client _client;
  final Duration requestTimeout;
  final int maxGetRetries;

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? queryParameters,
    String? bearerToken,
  }) {
    return _request(
      method: 'GET',
      path: path,
      queryParameters: queryParameters,
      bearerToken: bearerToken,
      retriesLeft: maxGetRetries,
    );
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
    String? bearerToken,
  }) {
    return _request(
      method: 'POST',
      path: path,
      body: body,
      queryParameters: queryParameters,
      bearerToken: bearerToken,
      retriesLeft: 0,
    );
  }

  Future<Map<String, dynamic>> putJson(
    String path, {
    Map<String, dynamic>? body,
    String? bearerToken,
  }) {
    return _request(
      method: 'PUT',
      path: path,
      body: body,
      bearerToken: bearerToken,
      retriesLeft: 0,
    );
  }

  Future<Map<String, dynamic>> deleteJson(
    String path, {
    String? bearerToken,
  }) {
    return _request(
      method: 'DELETE',
      path: path,
      bearerToken: bearerToken,
      retriesLeft: 0,
    );
  }

  Future<Map<String, dynamic>> _request({
    required String method,
    required String path,
    Map<String, String>? queryParameters,
    Map<String, dynamic>? body,
    String? bearerToken,
    required int retriesLeft,
  }) async {
    if (!config.isConfigured) {
      throw ConfigException(
        config.errorMessage ??
            'Backend API URL is not configured for this build.',
      );
    }

    final uri = config.resolveUri(path, queryParameters);
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (bearerToken != null && bearerToken.trim().isNotEmpty) {
      headers['Authorization'] = 'Bearer ${bearerToken.trim()}';
    }

    try {
      final http.Response response;
      switch (method) {
        case 'GET':
          response = await _client.get(uri, headers: headers).timeout(requestTimeout);
          break;
        case 'POST':
          response = await _client
              .post(
                uri,
                headers: headers,
                body: body != null ? jsonEncode(body) : null,
              )
              .timeout(requestTimeout);
          break;
        case 'PUT':
          response = await _client
              .put(
                uri,
                headers: headers,
                body: body != null ? jsonEncode(body) : null,
              )
              .timeout(requestTimeout);
          break;
        case 'DELETE':
          response =
              await _client.delete(uri, headers: headers).timeout(requestTimeout);
          break;
        default:
          throw ApiException('Unsupported HTTP method: $method');
      }

      if (response.statusCode >= 500 && retriesLeft > 0 && method == 'GET') {
        await Future<void>.delayed(const Duration(milliseconds: 450));
        return _request(
          method: method,
          path: path,
          queryParameters: queryParameters,
          body: body,
          bearerToken: bearerToken,
          retriesLeft: retriesLeft - 1,
        );
      }

      Map<String, dynamic> decoded = {};
      if (response.body.trim().isNotEmpty) {
        try {
          final raw = jsonDecode(response.body);
          if (raw is Map<String, dynamic>) {
            decoded = raw;
          } else {
            throw const ApiException('Server returned an unexpected data format.');
          }
        } on FormatException {
          throw const ApiException('Server returned an invalid JSON response.');
        }
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final serverMsg = decoded['error']?.toString().trim();
        throw ApiException(
          (serverMsg != null && serverMsg.isNotEmpty)
              ? serverMsg
              : _friendlyStatusMessage(response.statusCode),
          statusCode: response.statusCode,
          retryable: response.statusCode >= 500 || response.statusCode == 429,
        );
      }

      return decoded;
    } on TimeoutException {
      if (retriesLeft > 0 && method == 'GET') {
        await Future<void>.delayed(const Duration(milliseconds: 500));
        return _request(
          method: method,
          path: path,
          queryParameters: queryParameters,
          body: body,
          bearerToken: bearerToken,
          retriesLeft: retriesLeft - 1,
        );
      }
      throw const NetworkException(
        'The ODYX server took too long to respond. Please check your connection and try again.',
      );
    } on SocketException {
      if (retriesLeft > 0 && method == 'GET') {
        await Future<void>.delayed(const Duration(milliseconds: 500));
        return _request(
          method: method,
          path: path,
          queryParameters: queryParameters,
          body: body,
          bearerToken: bearerToken,
          retriesLeft: retriesLeft - 1,
        );
      }
      throw const NetworkException(
        'Unable to reach the ODYX backend. Verify your internet connection and server availability.',
      );
    } on http.ClientException {
      throw const NetworkException(
        'Connection interrupted while communicating with ODYX services.',
      );
    }
  }

  static String _friendlyStatusMessage(int code) {
    switch (code) {
      case 400:
        return 'The request could not be processed. Please review your input.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested item was not found.';
      case 429:
        return 'Too many requests in a short time. Please wait a moment and try again.';
      case 503:
        return 'This sportsbook service is temporarily unavailable.';
      default:
        return 'Service temporarily unavailable (HTTP $code).';
    }
  }
}
