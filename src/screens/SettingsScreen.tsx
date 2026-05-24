import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';
import { Icon } from '@/components/common/Icon';
import { TypographySettings } from '@/components/settings/TypographySettings';
import type { ThemeMode, Locale } from '@/types/settings';
import type { LayoutMode } from '@/hooks/useAdaptiveLayout';

interface SettingsScreenProps {
  layout?: LayoutMode;
}

type SettingsView = 'main' | 'typography';

function SettingRow({ label, value, onClick }: {
  label: string; value?: string; onClick?: () => void;
}) {
  const theme = useTheme();
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize: 15, color: theme.colors.text }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {value && <span style={{ fontSize: 15, color: theme.colors.textSecondary }}>{value}</span>}
        {onClick && <Icon name="chevronRight" size={16} color={theme.colors.textTertiary} />}
      </div>
    </div>
  );
}

function SegmentControl<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const theme = useTheme();
  return (
    <div style={{
      display: 'flex', gap: 1,
      borderRadius: 9,
      backgroundColor: theme.colors.surface,
      padding: 2,
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 12px',
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: value === opt.value ? '600' : '400',
            backgroundColor: value === opt.value ? theme.colors.background : 'transparent',
            color: value === opt.value ? theme.colors.text : theme.colors.textSecondary,
            boxShadow: value === opt.value
              ? `0 1px 3px ${theme.colors.shadow}, 0 0 0 0.5px ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`
              : 'none',
            transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <h3 style={{
      fontSize: 13, fontWeight: '600', color: theme.colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: 24, marginBottom: 8,
    }}>
      {title}
    </h3>
  );
}

function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (ua.includes('ArkWeb')) return true;
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  return false;
}

export function SettingsScreen({ layout = 'mobile' }: SettingsScreenProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { goBack } = useUIStore();
  const { theme: themeMode, locale, setTheme, setLocale } = useSettingsStore();
  const [view, setView] = useState<SettingsView>('main');
  const showBackButton = layout === 'mobile' || layout === 'tablet';
  const showDownloads = !isNativeShell();

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    i18n.changeLanguage(newLocale);
  };

  if (view === 'typography') {
    return <TypographySettings onBack={() => setView('main')} />;
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: theme.colors.background,
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', padding: '12px 12px',
        gap: 6, borderBottom: `1px solid ${theme.colors.borderLight}`,
        flexShrink: 0,
      }}>
        {showBackButton && (
          <button
            onClick={goBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 6, display: 'flex',
            }}
          >
            <Icon name="back" size={20} color={theme.colors.accent} />
          </button>
        )}
        <h2 style={{
          margin: 0, fontSize: 17, fontWeight: '600', color: theme.colors.text,
        }}>
          {t('settings.title')}
        </h2>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        <SectionHeader title={t('settings.general', { defaultValue: 'General' })} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0', borderBottom: `1px solid ${theme.colors.borderLight}`,
        }}>
          <span style={{ fontSize: 15, color: theme.colors.text }}>{t('settings.theme.title')}</span>
          <SegmentControl<ThemeMode>
            options={[
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'system', label: t('settings.theme.system') },
            ]}
            value={themeMode}
            onChange={setTheme}
          />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0', borderBottom: `1px solid ${theme.colors.borderLight}`,
        }}>
          <span style={{ fontSize: 15, color: theme.colors.text }}>{t('settings.language.title')}</span>
          <SegmentControl<Locale>
            options={[
              { value: 'en', label: 'EN' },
              { value: 'es', label: 'ES' },
              { value: 'zh', label: '中' },
            ]}
            value={locale}
            onChange={handleLocaleChange}
          />
        </div>

        <SectionHeader title={t('settings.editor.title')} />
        <SettingRow
          label={t('settings.typography.title')}
          onClick={() => setView('typography')}
        />

        {showDownloads && (
          <>
            <SectionHeader title={t('settings.downloads.title', { defaultValue: 'Downloads' })} />
            <SettingRow
              label="HarmonyOS (.hap)"
              value={t('settings.downloads.download', { defaultValue: 'Download' })}
              onClick={() => {
              const link = document.createElement('a');
              link.href = '/downloads/hunos-1d364d4a.hap';
              link.download = 'hunos.hap';
              link.click();
              }}
            />
          </>
        )}

        <SectionHeader title={t('settings.about.title')} />
        <SettingRow label={t('settings.about.version')} value="1.0.0" />
        <p style={{ fontSize: 13, color: theme.colors.textTertiary, marginTop: 4, marginBottom: 24 }}>
          {t('settings.about.description')}
        </p>
      </div>
    </div>
  );
}
