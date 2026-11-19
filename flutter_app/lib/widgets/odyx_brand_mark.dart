import 'package:flutter/material.dart';
import '../core/constants/odyx_constants.dart';
import '../theme/odyx_colors.dart';

class OdyxBrandMark extends StatelessWidget {
  const OdyxBrandMark({
    super.key,
    this.size = 40,
    this.borderRadius = 12,
  });

  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.08),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: isDark
              ? OdyxColors.accentCyan.withValues(alpha: 0.45)
              : OdyxColors.lightBorder,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: OdyxColors.accentBlue.withValues(alpha: 0.22),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular((borderRadius - 2).clamp(2, 24)),
        child: Image.asset(
          'assets/images/odyx_emblem.jpg',
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => const Center(
            child: Icon(
              Icons.bolt_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      ),
    );
  }
}

class OdyxBrandHeader extends StatelessWidget {
  const OdyxBrandHeader({
    super.key,
    this.subtitle = OdyxConstants.appTagline,
    this.compact = false,
  });

  final String subtitle;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        OdyxBrandMark(size: compact ? 34 : 42, borderRadius: compact ? 10 : 12),
        const SizedBox(width: 10),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                OdyxConstants.appName,
                style: (compact
                        ? textTheme.titleMedium
                        : textTheme.titleLarge)
                    ?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.4,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                subtitle,
                style: textTheme.labelSmall?.copyWith(
                  letterSpacing: 0.2,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
