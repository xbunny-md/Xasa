import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../theme/odyx_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/odyx_brand_mark.dart';

enum _AuthMode { signIn, signUp, reset }

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();

  _AuthMode _mode = _AuthMode.signIn;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthProvider>();

    bool success = false;
    switch (_mode) {
      case _AuthMode.signIn:
        success = await auth.signIn(
          email: _emailCtrl.text,
          password: _passwordCtrl.text,
        );
        if (success && mounted) {
          Navigator.of(context).pop();
        }
        break;
      case _AuthMode.signUp:
        success = await auth.signUp(
          email: _emailCtrl.text,
          password: _passwordCtrl.text,
          displayName: _nameCtrl.text,
        );
        if (success && mounted) {
          Navigator.of(context).pop();
        }
        break;
      case _AuthMode.reset:
        await auth.sendPasswordReset(_emailCtrl.text);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('ODYX Account')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: GlassCard(
              padding: const EdgeInsets.all(22),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: OdyxBrandMark(size: 56)),
                    const SizedBox(height: 14),
                    Text(
                      _mode == _AuthMode.signIn
                          ? 'Sign In to ODYX'
                          : _mode == _AuthMode.signUp
                              ? 'Create ODYX Account'
                              : 'Reset Your Password',
                      style: textTheme.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Access bookmarks, persistent bookmaker preferences, and cloud sync.',
                      style: textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 18),
                    SegmentedButton<_AuthMode>(
                      segments: const [
                        ButtonSegment(
                          value: _AuthMode.signIn,
                          label: Text('Sign In'),
                        ),
                        ButtonSegment(
                          value: _AuthMode.signUp,
                          label: Text('Register'),
                        ),
                        ButtonSegment(
                          value: _AuthMode.reset,
                          label: Text('Reset'),
                        ),
                      ],
                      selected: {_mode},
                      onSelectionChanged: (set) {
                        if (set.isEmpty) return;
                        auth.clearMessages();
                        setState(() => _mode = set.first);
                      },
                    ),
                    const SizedBox(height: 18),
                    if (auth.errorMessage != null) ...[
                      _FeedbackBox(
                        message: auth.errorMessage!,
                        color: OdyxColors.lostRose,
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (auth.infoMessage != null) ...[
                      _FeedbackBox(
                        message: auth.infoMessage!,
                        color: OdyxColors.wonEmerald,
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_mode == _AuthMode.signUp) ...[
                      TextFormField(
                        controller: _nameCtrl,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Display Name',
                          prefixIcon: Icon(Icons.person_outline_rounded),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: _mode == _AuthMode.reset
                          ? TextInputAction.done
                          : TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Email Address',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                      validator: (v) {
                        final val = (v ?? '').trim();
                        if (val.isEmpty || !val.contains('@')) {
                          return 'Enter a valid email address.';
                        }
                        return null;
                      },
                    ),
                    if (_mode != _AuthMode.reset) ...[
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                        validator: (v) {
                          if ((v ?? '').length < 6) {
                            return 'Password must be at least 6 characters.';
                          }
                          return null;
                        },
                      ),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: auth.isSubmitting ? null : _submit,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: auth.isSubmitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              _mode == _AuthMode.signIn
                                  ? 'Sign In'
                                  : _mode == _AuthMode.signUp
                                      ? 'Create Account'
                                      : 'Send Reset Link',
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FeedbackBox extends StatelessWidget {
  const _FeedbackBox({
    required this.message,
    required this.color,
  });

  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
