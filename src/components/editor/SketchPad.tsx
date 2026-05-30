import React, { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/theme/ThemeContext";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/common/Icon";

interface SketchPadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  initialImage?: string;
}

type Tool = "pen" | "eraser";

interface Point {
  x: number;
  y: number;
}

const COLORS = [
  "#1C1C1E",
  "#E85D4A",
  "#3478F6",
  "#34C759",
  "#FF9500",
  "#AF52DE",
  "#636366",
];
const STROKE_WIDTHS = [2, 4, 8, 16];
const DEFAULT_HEIGHT = 400;

export function SketchPad({ onSave, onCancel, initialImage }: SketchPadProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [canvasHeight] = useState(DEFAULT_HEIGHT);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPoint = useRef<Point | null>(null);
  const pathsRef = useRef<ImageData[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    initializedRef.current = true;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (initialImage) {
      const img = new window.Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        const drawWidth = Math.min(rect.width, img.naturalWidth);
        const drawHeight = drawWidth / aspect;
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
      };
      img.src = initialImage;
    }
  }, [initialImage, canvasHeight]);

  const getPoint = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    lastPoint.current = getPoint(e);

    const ctx = canvas.getContext("2d")!;
    pathsRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }, []);

  const draw = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const point = getPoint(e);

      ctx.beginPath();
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
      }

      if (lastPoint.current) {
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      lastPoint.current = point;
    },
    [isDrawing, tool, color, strokeWidth],
  );

  const endDraw = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const prev = pathsRef.current.pop();
    if (prev) {
      ctx.putImageData(prev, 0, 0);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    pathsRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: `1px solid ${theme.colors.borderLight}`,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 15,
            color: theme.colors.textSecondary,
            padding: "6px 12px",
          }}
        >
          {t("common.cancel", { defaultValue: "Cancel" })}
        </button>
        <span
          style={{ fontSize: 15, fontWeight: "600", color: theme.colors.text }}
        >
          {t("editor.sketch.title", { defaultValue: "Sketch" })}
        </span>
        <button
          onClick={handleSave}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: "600",
            color: theme.colors.accent,
            padding: "6px 12px",
          }}
        >
          {t("common.done", { defaultValue: "Done" })}
        </button>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          padding: 12,
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          style={{
            width: "100%",
            maxWidth: 800,
            height: canvasHeight,
            touchAction: "none",
            cursor: "crosshair",
            borderRadius: 8,
            border: `1px solid ${theme.colors.borderLight}`,
            boxShadow: `0 1px 4px ${theme.colors.shadow}`,
          }}
        />
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: "8px 12px 12px",
          borderTop: `1px solid ${theme.colors.borderLight}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Tools row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setTool("pen")}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor:
                tool === "pen"
                  ? theme.colors.accentLight
                  : theme.colors.surface,
              color: tool === "pen" ? theme.colors.accent : theme.colors.text,
              fontSize: 13,
              fontWeight: "500",
            }}
          >
            <Icon
              name="highlight"
              size={16}
              color={
                tool === "pen"
                  ? theme.colors.accent
                  : theme.colors.textSecondary
              }
            />
          </button>
          <button
            onClick={() => setTool("eraser")}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor:
                tool === "eraser"
                  ? theme.colors.accentLight
                  : theme.colors.surface,
              color:
                tool === "eraser" ? theme.colors.accent : theme.colors.text,
              fontSize: 13,
              fontWeight: "500",
            }}
          >
            <Icon
              name="close"
              size={16}
              color={
                tool === "eraser"
                  ? theme.colors.accent
                  : theme.colors.textSecondary
              }
            />
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleUndo}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor: theme.colors.surface,
              fontSize: 13,
            }}
          >
            <Icon name="back" size={16} color={theme.colors.textSecondary} />
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor: theme.colors.surface,
              fontSize: 13,
              color: theme.colors.danger,
            }}
          >
            <Icon name="trash" size={16} color={theme.colors.danger} />
          </button>
        </div>

        {/* Colors */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: c,
                border: "none",
                cursor: "pointer",
                boxShadow:
                  color === c && tool === "pen"
                    ? `0 0 0 2px ${theme.colors.background}, 0 0 0 4px ${c}`
                    : "none",
                transition: "box-shadow 0.15s ease",
              }}
            />
          ))}
          <div style={{ flex: 1 }} />
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  strokeWidth === w ? theme.colors.surface : "transparent",
              }}
            >
              <div
                style={{
                  width: w + 2,
                  height: w + 2,
                  borderRadius: w,
                  backgroundColor: theme.colors.text,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
