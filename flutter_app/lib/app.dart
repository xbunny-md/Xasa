import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'config/api_config.dart';
import 'core/constants/odyx_constants.dart';
import 'providers/auth_provider.dart';
import 'providers/feed_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/daily_feed_screen.dart';
import 'screens/history_screen.dart';
import 'screens/home_screen.dart';
import 'screens/settings_screen.dart';
import 'services/api_client.dart';
import 'services/firebase_auth_service.dart';
import 'services/firestore_service.dart';
import 'services/odyx_api_service.dart';
import 'theme/odyx_theme.dart';

class OdyxApp extends StatefulWidget {
  const OdyxApp({
    super.key,
    required this.apiConfig,
    this.authProviderOverride,
    this.feedProviderOverride,
    this.themeProviderOverride,
  });

  final ApiConfig apiConfig;
  final AuthProvider? authProviderOverride;
  final FeedProvider? feedProviderOverride;
  final ThemeProvider? themeProviderOverride;

  @override
  State<OdyxApp> createState() => _OdyxAppState();
}

class _OdyxAppState extends State<OdyxApp> {
  late final OdyxHttpClient _httpClient;
  late final OdyxApiService _apiService;
  late final FirebaseAuthService _firebaseAuthService;
  late final FirestoreService _firestoreService;

  late final ThemeProvider _themeProvider;
  late final AuthProvider _authProvider;
  late final FeedProvider _feedProvider;

  bool _ownsProviders = false;

  @override
  void initState() {
    super.initState();
    if (widget.authProviderOverride != null &&
        widget.feedProviderOverride != null &&
        widget.themeProviderOverride != null) {
      _themeProvider = widget.themeProviderOverride!;
      _authProvider = widget.authProviderOverride!;
      _feedProvider = widget.feedProviderOverride!;
      return;
    }

    _ownsProviders = true;
    _httpClient = OdyxHttpClient(apiConfig: widget.apiConfig);
    _apiService = OdyxApiService(_httpClient);
    _firebaseAuthService = FirebaseAuthService();
    _firestoreService = FirestoreService();

    _themeProvider = ThemeProvider()..loadSavedTheme();
    _feedProvider = FeedProvider(
      firestoreService: _firestoreService,
      apiService: _apiService,
      apiConfig: widget.apiConfig,
    )..initialize();

    _authProvider = AuthProvider(
      authService: _firebaseAuthService,
      firestoreService: _firestoreService,
      apiService: _apiService,
      apiConfig: widget.apiConfig,
    );
    _authProvider.onProfileSynced = (profile) {
      _themeProvider.applyRemotePreference(profile.themePreference);
      _feedProvider.applyRemoteBookmakerPreference(profile.preferredBookmaker);
    };
    _authProvider.initialize();
  }

  @override
  void dispose() {
    if (_ownsProviders) {
      _authProvider.dispose();
      _feedProvider.dispose();
      _themeProvider.dispose();
      _httpClient.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiConfig>.value(value: widget.apiConfig),
        ChangeNotifierProvider<ThemeProvider>.value(value: _themeProvider),
        ChangeNotifierProvider<AuthProvider>.value(value: _authProvider),
        ChangeNotifierProvider<FeedProvider>.value(value: _feedProvider),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, theme, _) {
          return MaterialApp(
            title: OdyxConstants.appName,
            debugShowCheckedModeBanner: false,
            theme: OdyxTheme.light(),
            darkTheme: OdyxTheme.dark(),
            themeMode: theme.themeMode,
            home: const OdyxShell(),
          );
        },
      ),
    );
  }
}

class OdyxShell extends StatefulWidget {
  const OdyxShell({super.key});

  @override
  State<OdyxShell> createState() => _OdyxShellState();
}

class _OdyxShellState extends State<OdyxShell> {
  int _currentIndex = 0;

  void _selectTab(int index) {
    if (index == _currentIndex) return;
    setState(() => _currentIndex = index.clamp(0, 3));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeScreen(onNavigateToTab: _selectTab),
          const DailyFeedScreen(),
          const HistoryScreen(),
          const SettingsScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _selectTab,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.bolt_outlined),
            selectedIcon: Icon(Icons.bolt_rounded),
            label: 'Daily Feed',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history_rounded),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings_rounded),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
