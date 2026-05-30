import React from "react";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const theme = useTheme();

  return (
    <button
      onClick={onPress}
      data-testid="create-note-fab"
      aria-label="Create new note"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: theme.colors.accent,
        color: theme.colors.accentText,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 4px 16px rgba(232, 93, 74, 0.3), 0 1px 3px rgba(0,0,0,0.08)`,
        transition:
          "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease",
        zIndex: 100,
        animation: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 6px 24px rgba(232, 93, 74, 0.4), 0 2px 6px rgba(0,0,0,0.1)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 16px rgba(232, 93, 74, 0.3), 0 1px 3px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(0.9)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
      }}
    >
      <Icon name="plus" size={22} color={theme.colors.accentText} />
    </button>
  );
}
