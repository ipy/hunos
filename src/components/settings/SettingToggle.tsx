import React from "react";
import { useTheme } from "@/theme/ThemeContext";

interface SettingToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
}

export function SettingToggle({
  label,
  checked,
  onChange,
  testId,
}: SettingToggleProps) {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: `1px solid ${theme.colors.borderLight}`,
      }}
    >
      <span style={{ fontSize: 15, color: theme.colors.text }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        style={{
          width: 51,
          height: 31,
          borderRadius: 16,
          border: "none",
          padding: 2,
          cursor: "pointer",
          backgroundColor: checked ? theme.colors.accent : theme.colors.surface,
          boxShadow: `inset 0 0 0 0.5px ${checked ? "transparent" : theme.colors.border}`,
          transition: "background-color 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: 27,
            height: 27,
            borderRadius: "50%",
            backgroundColor: theme.colors.background,
            boxShadow: `0 1px 3px ${theme.colors.shadow}`,
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        />
      </button>
    </div>
  );
}
