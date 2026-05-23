import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from './Icon';

type PremiumFeature = 'cloud_sync' | 'ai_assist' | 'advanced_export' | 'collaboration';

const premiumFeatures = new Set<PremiumFeature>(['cloud_sync', 'ai_assist', 'collaboration']);

export function isPremium(feature: PremiumFeature): boolean {
  return premiumFeatures.has(feature);
}

interface PaywallGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
}

export function PaywallGate({ feature, children }: PaywallGateProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!isPremium(feature)) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: theme.radius.full,
        backgroundColor: theme.colors.accentLight,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Icon name="settings" size={24} color={theme.colors.accent} />
      </div>
      <h3 style={{
        fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 8,
      }}>
        {t('paywall.title')}
      </h3>
      <p style={{
        fontSize: 14, color: theme.colors.textSecondary, marginBottom: 20,
      }}>
        {t('paywall.description')}
      </p>
      <button style={{
        padding: '10px 24px', borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.accent, color: theme.colors.accentText,
        border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: '600',
      }}>
        {t('paywall.upgrade')}
      </button>
    </div>
  );
}
