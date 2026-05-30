import React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { useSettingsStore } from "@/store/settingsStore";
import { Icon } from "@/components/common/Icon";
import { TEXT_FONTS, CODE_FONTS } from "@/utils/fonts";
import type { EditorFont } from "@/types/settings";
import type { FontDef } from "@/utils/fonts";

interface TypographySettingsProps {
  onBack: () => void;
}

function StepperRow({
  label,
  value,
  unit,
  onDecrease,
  onIncrease,
  min,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  onDecrease: () => void;
  onIncrease: () => void;
  min: number;
  max: number;
}) {
  const theme = useTheme();
  const canDecrease = value > min + 0.01;
  const canIncrease = value < max - 0.01;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: `1px solid ${theme.colors.borderLight}`,
      }}
    >
      <span style={{ fontSize: 15, color: theme.colors.text }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 14,
            color: theme.colors.textSecondary,
            minWidth: 48,
            textAlign: "right",
          }}
        >
          {typeof value === "number" && value % 1 !== 0
            ? value.toFixed(1)
            : value}{" "}
          {unit}
        </span>
        <button
          onClick={onDecrease}
          disabled={!canDecrease}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${canDecrease ? theme.colors.border : theme.colors.borderLight}`,
            cursor: canDecrease ? "pointer" : "default",
            background: theme.colors.background,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: canDecrease ? theme.colors.text : theme.colors.textTertiary,
          }}
        >
          −
        </button>
        <button
          onClick={onIncrease}
          disabled={!canIncrease}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${canIncrease ? theme.colors.border : theme.colors.borderLight}`,
            cursor: canIncrease ? "pointer" : "default",
            background: theme.colors.background,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: canIncrease ? theme.colors.text : theme.colors.textTertiary,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function TypographySettings({ onBack }: TypographySettingsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    editorFont,
    headingsFont,
    codeFont,
    fontSize,
    lineHeight,
    lineWidth,
    paragraphSpacing,
    paragraphIndent,
    setEditorFont,
    setHeadingsFont,
    setCodeFont,
    setFontSize,
    setLineHeight,
    setLineWidth,
    setParagraphSpacing,
    setParagraphIndent,
    resetTypography,
  } = useSettingsStore();

  const [showFontPicker, setShowFontPicker] = React.useState<
    "text" | "headings" | "code" | null
  >(null);

  const currentTextFont =
    TEXT_FONTS.find((f) => f.id === editorFont) || TEXT_FONTS[0];
  const currentHeadingsFont =
    TEXT_FONTS.find((f) => f.id === headingsFont) || TEXT_FONTS[0];
  const currentCodeFont =
    CODE_FONTS.find((f) => f.id === (codeFont || "mono")) || CODE_FONTS[0];

  if (showFontPicker) {
    const fonts = showFontPicker === "code" ? CODE_FONTS : TEXT_FONTS;
    const currentValue =
      showFontPicker === "text"
        ? editorFont
        : showFontPicker === "headings"
          ? headingsFont
          : codeFont || "mono";
    const title =
      showFontPicker === "text"
        ? t("settings.typography.textFont")
        : showFontPicker === "headings"
          ? t("settings.typography.headingsFont")
          : t("settings.typography.codeFont");

    const handleSelect = (font: FontDef) => {
      if (showFontPicker === "text") setEditorFont(font.id as EditorFont);
      else if (showFontPicker === "headings")
        setHeadingsFont(font.id as EditorFont);
      else if (showFontPicker === "code") setCodeFont(font.id as EditorFont);
      setShowFontPicker(null);
    };

    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.colors.background,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 12px",
            gap: 6,
            borderBottom: `1px solid ${theme.colors.borderLight}`,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setShowFontPicker(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
              display: "flex",
            }}
          >
            <Icon name="back" size={20} color={theme.colors.accent} />
          </button>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: "600",
              color: theme.colors.text,
            }}
          >
            {title}
          </h2>
        </header>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {fonts.map((font) => {
            const isSelected = currentValue === font.id;
            return (
              <div
                key={font.id}
                onClick={() => handleSelect(font)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: `1px solid ${theme.colors.borderLight}`,
                  cursor: "pointer",
                  backgroundColor: isSelected
                    ? theme.colors.accentLight
                    : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    color: theme.colors.text,
                    fontFamily: font.family,
                  }}
                >
                  {font.label}
                </span>
                {isSelected && (
                  <Icon name="taskList" size={18} color={theme.colors.accent} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const sliderPercent = ((fontSize - 12) / (28 - 12)) * 100;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.background,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 12px",
          borderBottom: `1px solid ${theme.colors.borderLight}`,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 6,
            borderRadius: 6,
            display: "flex",
          }}
        >
          <Icon name="back" size={20} color={theme.colors.accent} />
        </button>
        <h2
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: "600",
            color: theme.colors.text,
          }}
        >
          {t("settings.typography.title")}
        </h2>
        <div style={{ width: 32 }} />
      </header>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* FONTS section */}
        <div style={{ padding: "8px 0 0" }}>
          <div
            style={{
              padding: "0 20px 8px",
              fontSize: 12,
              fontWeight: "600",
              color: theme.colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {t("settings.typography.fonts")}
          </div>
          <div
            onClick={() => setShowFontPicker("text")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: `1px solid ${theme.colors.borderLight}`,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, color: theme.colors.text }}>
              {t("settings.typography.textFont")}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {currentTextFont.label}
              </span>
              <Icon
                name="chevronRight"
                size={14}
                color={theme.colors.textTertiary}
              />
            </div>
          </div>
          <div
            onClick={() => setShowFontPicker("headings")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: `1px solid ${theme.colors.borderLight}`,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, color: theme.colors.text }}>
              {t("settings.typography.headingsFont")}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {currentHeadingsFont.label}
              </span>
              <Icon
                name="chevronRight"
                size={14}
                color={theme.colors.textTertiary}
              />
            </div>
          </div>
          <div
            onClick={() => setShowFontPicker("code")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: `1px solid ${theme.colors.borderLight}`,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, color: theme.colors.text }}>
              {t("settings.typography.codeFont")}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {currentCodeFont.label}
              </span>
              <Icon
                name="chevronRight"
                size={14}
                color={theme.colors.textTertiary}
              />
            </div>
          </div>
        </div>

        {/* FONT SIZE */}
        <div style={{ padding: "24px 0 0" }}>
          <div
            style={{
              padding: "0 20px 12px",
              fontSize: 12,
              fontWeight: "600",
              color: theme.colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {t("settings.typography.fontSize")}
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min={12}
                max={28}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{
                  flex: 1,
                  appearance: "none",
                  WebkitAppearance: "none",
                  height: 4,
                  borderRadius: 2,
                  outline: "none",
                  cursor: "pointer",
                  background: `linear-gradient(to right, ${theme.colors.accent} 0%, ${theme.colors.accent} ${sliderPercent}%, ${theme.colors.surface} ${sliderPercent}%, ${theme.colors.surface} 100%)`,
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  color: theme.colors.textSecondary,
                  fontWeight: "500",
                  minWidth: 36,
                }}
              >
                {fontSize} pt
              </span>
            </div>
          </div>
        </div>

        {/* SPACING CONTROLS */}
        <div style={{ borderTop: `1px solid ${theme.colors.borderLight}` }}>
          <StepperRow
            label={t("settings.typography.lineHeight")}
            value={lineHeight}
            unit="em"
            min={1.0}
            max={3.0}
            onDecrease={() =>
              setLineHeight(
                Math.max(1.0, Math.round((lineHeight - 0.1) * 10) / 10),
              )
            }
            onIncrease={() =>
              setLineHeight(
                Math.min(3.0, Math.round((lineHeight + 0.1) * 10) / 10),
              )
            }
          />
          <StepperRow
            label={t("settings.typography.lineWidth")}
            value={lineWidth}
            unit="em"
            min={20}
            max={80}
            onDecrease={() => setLineWidth(Math.max(20, lineWidth - 2))}
            onIncrease={() => setLineWidth(Math.min(80, lineWidth + 2))}
          />
          <StepperRow
            label={t("settings.typography.paragraphSpacing")}
            value={paragraphSpacing}
            unit="em"
            min={0}
            max={3.0}
            onDecrease={() =>
              setParagraphSpacing(
                Math.max(0, Math.round((paragraphSpacing - 0.25) * 100) / 100),
              )
            }
            onIncrease={() =>
              setParagraphSpacing(
                Math.min(
                  3.0,
                  Math.round((paragraphSpacing + 0.25) * 100) / 100,
                ),
              )
            }
          />
          <StepperRow
            label={t("settings.typography.paragraphIndent")}
            value={paragraphIndent}
            unit="em"
            min={0}
            max={4.0}
            onDecrease={() =>
              setParagraphIndent(
                Math.max(0, Math.round((paragraphIndent - 0.5) * 10) / 10),
              )
            }
            onIncrease={() =>
              setParagraphIndent(
                Math.min(4.0, Math.round((paragraphIndent + 0.5) * 10) / 10),
              )
            }
          />
        </div>

        {/* PREVIEW - shown below controls */}
        <div
          style={{
            margin: "20px 20px 8px",
            padding: "20px",
            borderRadius: 12,
            border: `1px solid ${theme.colors.borderLight}`,
            backgroundColor: theme.colors.surface,
            maxWidth: `${lineWidth}em`,
          }}
        >
          <p
            style={{
              margin: 0,
              marginBottom: paragraphSpacing + "em",
              fontFamily: currentHeadingsFont.family,
              fontSize: fontSize * 1.4,
              fontWeight: 700,
              lineHeight: 1.2,
              color: theme.colors.text,
            }}
          >
            Heading Example
          </p>
          <p
            style={{
              margin: 0,
              marginBottom: paragraphSpacing + "em",
              fontFamily: currentTextFont.family,
              fontSize,
              lineHeight,
              color: theme.colors.text,
              textIndent:
                paragraphIndent > 0 ? `${paragraphIndent}em` : undefined,
            }}
          >
            This is <strong>bold text</strong> and <em>italic text</em> with a{" "}
            <span
              style={{
                color: theme.colors.accent,
                textDecoration: "underline",
              }}
            >
              [[wiki link]]
            </span>{" "}
            and a{" "}
            <span style={{ textDecoration: "line-through" }}>
              strikethrough
            </span>{" "}
            word.
          </p>
          <ul
            style={{
              margin: 0,
              marginBottom: paragraphSpacing + "em",
              paddingLeft: "1.5em",
              fontFamily: currentTextFont.family,
              fontSize,
              lineHeight,
              color: theme.colors.text,
            }}
          >
            <li>
              Bullet list item with <strong>bold</strong>
            </li>
            <li>
              Second item with{" "}
              <code
                style={{
                  fontFamily: currentCodeFont.family,
                  fontSize: fontSize * 0.88,
                  background: theme.colors.background,
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                inline code
              </code>
            </li>
          </ul>
          <blockquote
            style={{
              margin: 0,
              marginBottom: paragraphSpacing + "em",
              paddingLeft: 12,
              borderLeft: `3px solid ${theme.colors.accent}`,
              fontFamily: currentTextFont.family,
              fontSize,
              lineHeight,
              color: theme.colors.textSecondary,
              fontStyle: "italic",
            }}
          >
            A blockquote for emphasis.
          </blockquote>
          <pre
            style={{
              margin: 0,
              fontFamily: currentCodeFont.family,
              fontSize: fontSize * 0.88,
              lineHeight,
              color: theme.colors.text,
              background: theme.colors.background,
              padding: "8px 12px",
              borderRadius: 6,
              overflowX: "auto",
            }}
          >
            {`function greet(name) {
  return \`Hello, \${name}!\`;
}`}
          </pre>
        </div>

        <p
          style={{
            fontSize: 12,
            color: theme.colors.textTertiary,
            padding: "10px 20px 16px",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {t("settings.typography.hint")}
        </p>

        <div style={{ padding: "8px 20px 40px", textAlign: "center" }}>
          <button
            onClick={resetTypography}
            style={{
              padding: "12px 32px",
              borderRadius: 24,
              border: `1px solid ${theme.colors.border}`,
              background: "none",
              cursor: "pointer",
              fontSize: 15,
              color: theme.colors.accent,
              fontWeight: "500",
            }}
          >
            {t("settings.typography.restoreDefaults")}
          </button>
        </div>

        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px; height: 20px; border-radius: 50%;
            background: white;
            border: 1px solid ${theme.colors.border};
            box-shadow: 0 1px 4px ${theme.colors.shadow};
            cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}
