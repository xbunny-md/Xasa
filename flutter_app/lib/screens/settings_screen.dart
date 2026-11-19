import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/api_config.dart';
import '../core/constants/odyx_constants.dart';
import '../core/utils/formatters.dart';
import '../models/bookmaker.dart';
import '../providers/auth_provider.dart';
import '../providers/feed_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/odyx_colors.dart';
import '../widgets/glass_card.dart';
import 'auth_screen.dart';
import 'tools_screens.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _minOddsCtrl = TextEditingController();
  final TextEditingController _maxOddsCtrl = TextEditingController();
  final TextEditingController _stakeCtrl = TextEditingController();
  String _hydratedUid = '';
  bool _checkingHealth = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _minOddsCtrl.dispose();
    _maxOddsCtrl.dispose();
    _stakeCtrl.dispose();
    super.dispose();
  }

  void _syncControllersFromAuth(AuthProvider auth) {
    final uid = auth.firebaseUser?.uid ?? '';
    final profile = auth.userProfile;
    final key = '$uid:${profile?.displayName}:${profile?.defaultStakeTzs}';
    if (uid.isNotEmpty && _hydratedUid != key) {
      _hydratedUid = key;
      _nameCtrl.text = profile?.displayName ?? auth.displayName;
      _minOddsCtrl.text =
          (profile?.defaultMinOdds ?? 1.01).toStringAsFixed(2);
      _maxOddsCtrl.text =
          (profile?.defaultMaxOdds ?? 1.25).toStringAsFixed(2);
      _stakeCtrl.text = (profile?.defaultStakeTzs ?? 10000).toStringAsFixed(0);
    }
  }

  Future<void> _saveProfileSettings(AuthProvider auth) async {
    final minOdds = double.tryParse(_minOddsCtrl.text.trim()) ?? 1.01;
    final maxOdds = double.tryParse(_maxOddsCtrl.text.trim()) ?? 1.25;
    final stake = double.tryParse(_stakeCtrl.text.trim()) ?? 10000;

    final ok = await auth.updateProfileSettings(
      displayName: _nameCtrl.text.trim(),
      defaultMinOdds: minOdds,
      defaultMaxOdds: maxOdds,
      defaultStakeTzs: stake,
      autoScanIntervalSec: auth.userProfile?.autoScanIntervalSec ?? 0,
    );

    if (!mounted) return;
    final msg = ok
        ? (auth.infoMessage ?? 'Profile saved.')
        : (auth.errorMessage ?? 'Unable to save settings.');
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _testHealth(FeedProvider feed) async {
    setState(() => _checkingHealth = true);
    final ok = await feed.checkApiHealth();
    if (!mounted) return;
    setState(() => _checkingHealth = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ok
              ? 'Backend API connection is healthy.'
              : (feed.apiError ?? 'Backend API check failed.'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();
    final auth = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>();
    final apiConfig = context.read<ApiConfig>();
    final textTheme = Theme.of(context).textTheme;

    _syncControllersFromAuth(auth);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'SETTINGS',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.1,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          // 1. Preferred Bookmaker Selector (Exclusive Switching Point)
          Text('Preferred Bookmaker', style: textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(
            'Choose which independent Tanzania feed is displayed across Daily Picks and History. Existing tickets are always preserved.',
            style: textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          ...BookmakerId.values.map((id) {
            final info = OdyxConstants.bookmakers[id]!;
            final selected = feed.activeBookmaker == id;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                onTap: () async {
                  await feed.setPreferredBookmaker(
                    id,
                    onSyncRemote: (bk) => auth.syncPreferences(
                      preferredBookmaker: bk,
                    ),
                  );
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Active feed switched to ${info.name}'),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
                borderColor: selected
                    ? OdyxColors.accentBlue
                    : null,
                accentGlowColor: selected ? OdyxColors.accentBlue : null,
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: (selected
                                ? OdyxColors.accentBlue
                                : OdyxColors.voidSlate)
                            .withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        selected
                            ? Icons.radio_button_checked_rounded
                            : Icons.radio_button_unchecked_rounded,
                        color: selected
                            ? OdyxColors.accentBlue
                            : OdyxColors.voidSlate,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  info.name,
                                  style: textTheme.titleMedium,
                                ),
                              ),
                              if (selected)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: OdyxColors.wonEmerald
                                        .withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'ACTIVE',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: OdyxColors.wonEmerald,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(info.tagline, style: textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 16),

          // 2. Appearance
          Text('Appearance', style: textTheme.titleMedium),
          const SizedBox(height: 10),
          GlassCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Theme Mode', style: textTheme.bodyMedium),
                const SizedBox(height: 10),
                SegmentedButton<ThemeMode>(
                  segments: const [
                    ButtonSegment<ThemeMode>(
                      value: ThemeMode.dark,
                      icon: Icon(Icons.dark_mode_rounded, size: 18),
                      label: Text('Dark Glass'),
                    ),
                    ButtonSegment<ThemeMode>(
                      value: ThemeMode.light,
                      icon: Icon(Icons.light_mode_rounded, size: 18),
                      label: Text('Light Crisp'),
                    ),
                  ],
                  selected: {theme.themeMode},
                  onSelectionChanged: (set) {
                    if (set.isEmpty) return;
                    theme.setThemeMode(
                      set.first,
                      onSyncRemote: (pref) =>
                          auth.syncPreferences(themePreference: pref),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Account & Security
          Text('Account & Profile', style: textTheme.titleMedium),
          const SizedBox(height: 10),
          if (!auth.isSignedIn)
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sign in to ODYX',
                    style: textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sync bookmarked slips, preferred bookmaker, and profile settings across Android and web.',
                    style: textTheme.bodySmall,
                  ),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const AuthScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.login_rounded, size: 18),
                    label: const Text('Sign In / Create Account'),
                  ),
                ],
              ),
            )
          else
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(auth.displayName, style: textTheme.titleMedium),
                            Text(
                              auth.firebaseUser?.email ?? '',
                              style: textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: (auth.isAdmin
                                  ? OdyxColors.wonEmerald
                                  : OdyxColors.accentBlue)
                              .withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          auth.isAdmin ? 'ADMIN' : 'VERIFIED USER',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: auth.isAdmin
                                ? OdyxColors.wonEmerald
                                : OdyxColors.accentBlue,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (!auth.isEmailVerified) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: OdyxColors.liveAmber.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: OdyxColors.liveAmber.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Verify your email to unlock cloud sync & bookmarks.',
                            style: textTheme.bodySmall?.copyWith(
                              color: OdyxColors.liveAmber,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              OutlinedButton(
                                onPressed: auth.isSubmitting
                                    ? null
                                    : () => auth.resendVerificationEmail(),
                                child: const Text('Resend Email'),
                              ),
                              FilledButton.tonal(
                                onPressed: auth.isSubmitting
                                    ? null
                                    : () => auth.reloadVerificationStatus(),
                                child: const Text('I Verified — Refresh'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 14),
                    TextField(
                      controller: _nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Display Name',
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _minOddsCtrl,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Min Odds',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _maxOddsCtrl,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Max Odds',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _stakeCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Default Stake (TZS)',
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: auth.isSubmitting
                          ? null
                          : () => _saveProfileSettings(auth),
                      icon: const Icon(Icons.save_rounded, size: 18),
                      label: const Text('Save Profile Preferences'),
                    ),
                  ],
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      if (auth.isAdmin)
                        FilledButton.tonalIcon(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const AdminControlScreen(),
                              ),
                            );
                          },
                          icon: const Icon(
                            Icons.admin_panel_settings_rounded,
                            size: 18,
                          ),
                          label: const Text('Admin Control'),
                        ),
                      OutlinedButton.icon(
                        onPressed: () async {
                          final email = auth.firebaseUser?.email;
                          if (email == null || email.isEmpty) return;
                          await auth.sendPasswordReset(email);
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                auth.infoMessage ??
                                    auth.errorMessage ??
                                    'Password reset email sent.',
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.lock_reset_rounded, size: 18),
                        label: const Text('Reset Password'),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: OdyxColors.lostRose,
                          side: const BorderSide(color: OdyxColors.lostRose),
                        ),
                        onPressed: () => auth.signOut(),
                        icon: const Icon(Icons.logout_rounded, size: 18),
                        label: const Text('Sign Out'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          const SizedBox(height: 20),

          // 4. Backend & Connectivity Diagnostics
          Text('Server & Sync Status', style: textTheme.titleMedium),
          const SizedBox(height: 10),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoLine(
                  label: 'Environment',
                  value: apiConfig.environmentLabel,
                ),
                const SizedBox(height: 6),
                _InfoLine(
                  label: 'API Host',
                  value: apiConfig.displayHost,
                ),
                const SizedBox(height: 6),
                _InfoLine(
                  label: 'Last Sync',
                  value: feed.lastSyncedAt != null
                      ? OdyxFormatters.formatIsoCompact(
                          feed.lastSyncedAt!.toIso8601String(),
                        )
                      : 'Firestore Real-Time',
                ),
                const SizedBox(height: 6),
                _InfoLine(
                  label: 'API Health',
                  value: feed.apiHealthy == true
                      ? 'Connected'
                      : (feed.apiHealthy == false ? 'Unavailable' : 'Unchecked'),
                  valueColor: feed.apiHealthy == true
                      ? OdyxColors.wonEmerald
                      : (feed.apiHealthy == false ? OdyxColors.lostRose : null),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _checkingHealth ? null : () => _testHealth(feed),
                  icon: _checkingHealth
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.health_and_safety_rounded, size: 18),
                  label: const Text('Check Server Health'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({
    required this.label,
    required this.value,
    this.valueColor,
  });

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(label, style: Theme.of(context).textTheme.bodySmall),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: valueColor,
                ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
