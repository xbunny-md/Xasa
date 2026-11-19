import 'package:flutter/material.dart';
import '../theme/odyx_colors.dart';

class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.borderRadius = 18,
    this.borderColor,
    this.accentGlowColor,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? borderColor;
  final Color? accentGlowColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final resolvedBorder = borderColor ??
        (isDark ? OdyxColors.darkBorder : OdyxColors.lightBorder);

    final decoration = BoxDecoration(
      borderRadius: BorderRadius.circular(borderRadius),
      gradient: isDark
          ? LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                OdyxColors.darkSurfaceElevated.withValues(alpha: 0.88),
                OdyxColors.darkSurface.withValues(alpha: 0.94),
              ],
            )
          : null,
      color: isDark ? null : OdyxColors.lightSurface,
      border: Border.all(color: resolvedBorder, width: 1),
      boxShadow: [
        if (accentGlowColor != null)
          BoxShadow(
            color: accentGlowColor!.withValues(alpha: isDark ? 0.16 : 0.10),
            blurRadius: 18,
            offset: const Offset(0, 6),
          )
        else
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.28 : 0.05),
            blurRadius: isDark ? 16 : 12,
            offset: const Offset(0, 4),
          ),
      ],
    );

    final cardContent = Container(
      padding: padding,
      child: child,
    );

    return Container(
      margin: margin,
      decoration: decoration,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(borderRadius),
        child: onTap != null
            ? InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(borderRadius),
                child: cardContent,
              )
            : cardContent,
      ),
    );
  }
}
