import React, { useEffect } from "react";
import "@/i18n";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";
import { useSettingsStore } from "@/store/settingsStore";
import { useTagStore } from "@/store/tagStore";
import { useNoteStore } from "@/store/noteStore";
import { useUIStore } from "@/store/uiStore";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { useAppKeyboardShortcuts } from "@/hooks/useAppKeyboardShortcuts";
import { TagsScreen } from "@/screens/TagsScreen";
import { NoteListScreen } from "@/screens/NoteListScreen";
import { EditorScreen } from "@/screens/EditorScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { ToastContainer } from "@/components/common/Toast";
import { useTranslation } from "react-i18next";
import { noteStorage } from "@/storage/noteStorage";
import { createWelcomeNotesIfNeeded } from "@/storage/welcomeNotes";

function AppContent() {
  const layout = useAdaptiveLayout();
  const { currentScreen, showSidebar, sidebarVisible, hideSidebar, focusMode } =
    useUIStore();
  const { loadTags } = useTagStore();
  const { loadNotes } = useNoteStore();
  const { i18n } = useTranslation();
  const { locale } = useSettingsStore();
  const theme = useTheme();
  const borderColor = theme.colors.border;

  useAppKeyboardShortcuts();

  useEffect(() => {
    async function init() {
      await createWelcomeNotesIfNeeded(locale);
      loadTags();
      loadNotes({ status: "active" });
      noteStorage.purgeTrash(30 * 24 * 60 * 60 * 1000);
    }
    init();
  }, []);

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale, i18n]);

  if (layout === "desktop") {
    const panelTransition =
      "width 0.2s ease, min-width 0.2s ease, opacity 0.2s ease";
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          position: "absolute",
          inset: 0,
        }}
      >
        {!focusMode && (
          <>
            <div
              style={{
                width: 220,
                minWidth: 180,
                flexShrink: 0,
                borderRight: `1px solid ${borderColor}`,
                overflow: "hidden",
                backgroundColor: theme.colors.surface,
                transition: panelTransition,
              }}
            >
              <TagsScreen layout="desktop" />
            </div>
            <div
              style={{
                width: 300,
                minWidth: 240,
                flexShrink: 0,
                borderRight: `1px solid ${borderColor}`,
                overflow: "hidden",
                position: "relative",
                transition: panelTransition,
              }}
            >
              <NoteListScreen layout="desktop" />
            </div>
          </>
        )}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            transition: panelTransition,
          }}
        >
          {currentScreen === "settings" ? (
            <SettingsScreen layout="desktop" />
          ) : (
            <EditorScreen layout="desktop" />
          )}
        </div>
        <ToastContainer />
      </div>
    );
  }

  if (layout === "tablet") {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          position: "absolute",
          inset: 0,
        }}
      >
        {/* Sidebar backdrop */}
        <div
          onClick={hideSidebar}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 90,
            backgroundColor: "rgba(0,0,0,0.3)",
            opacity: sidebarVisible ? 1 : 0,
            pointerEvents: sidebarVisible ? "auto" : "none",
            transition: "opacity 0.3s ease",
            willChange: "opacity",
          }}
        />
        {/* Sidebar panel */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            width: 280,
            backgroundColor: theme.colors.surface,
            boxShadow: sidebarVisible ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
            overflow: "hidden",
            transform: sidebarVisible ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
            willChange: "transform",
          }}
        >
          <TagsScreen layout="tablet" />
        </div>
        <div
          style={{
            width: 320,
            minWidth: 260,
            flexShrink: 0,
            borderRight: `1px solid ${borderColor}`,
            overflow: "hidden",
          }}
        >
          <NoteListScreen layout="tablet" />
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          {currentScreen === "settings" ? (
            <SettingsScreen layout="tablet" />
          ) : (
            <EditorScreen layout="tablet" />
          )}
        </div>
        <ToastContainer />
      </div>
    );
  }

  // Mobile - full screen stack with slide-over sidebar
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      {/* Sidebar backdrop */}
      <div
        onClick={hideSidebar}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 90,
          backgroundColor: "rgba(0,0,0,0.35)",
          opacity: sidebarVisible ? 1 : 0,
          pointerEvents: sidebarVisible ? "auto" : "none",
          transition: "opacity 0.3s ease",
          willChange: "opacity",
        }}
      />
      {/* Sidebar panel */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          width: 280,
          backgroundColor: theme.colors.surface,
          boxShadow: sidebarVisible ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
          overflow: "hidden",
          transform: sidebarVisible ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: "transform",
        }}
      >
        <TagsScreen layout="mobile" />
      </div>
      {currentScreen === "noteList" && (
        <div style={{ height: "100%", animation: "fadeIn 0.2s ease" }}>
          <NoteListScreen layout="mobile" />
        </div>
      )}
      {currentScreen === "editor" && (
        <div
          style={{
            height: "100%",
            animation:
              "screenSlideInRight 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          <EditorScreen layout="mobile" />
        </div>
      )}
      {currentScreen === "settings" && (
        <div
          style={{
            height: "100%",
            animation:
              "screenSlideInRight 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          <SettingsScreen layout="mobile" />
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export function App() {
  const { theme, isLoaded, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (!isLoaded) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#E85D4A",
            letterSpacing: -0.5,
            animation: "fadeIn 0.4s ease",
            opacity: 0.9,
          }}
        >
          Hunos
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider mode={theme}>
      <AppContent />
    </ThemeProvider>
  );
}
