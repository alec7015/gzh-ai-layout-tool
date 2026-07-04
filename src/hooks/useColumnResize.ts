import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

interface UseColumnResizeOptions {
  defaultWidth: number;
  minWidth: number;
  storage?: Storage;
  storageKey: string;
  getMaxWidth(): number;
}

function toNumber(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function useColumnResize({
  defaultWidth,
  minWidth,
  storage,
  storageKey,
  getMaxWidth,
}: UseColumnResizeOptions) {
  const [width, setWidth] = useState(() => toNumber(storage?.getItem(storageKey) ?? null, defaultWidth));
  const dragStartRef = useRef<{ pointerId: number; x: number; width: number } | null>(null);

  const clamp = useCallback(
    (nextWidth: number) => {
      const maxWidth = Math.max(minWidth, getMaxWidth());
      return Math.min(Math.max(Math.round(nextWidth), minWidth), maxWidth);
    },
    [getMaxWidth, minWidth]
  );

  const applyWidth = useCallback(
    (nextWidth: number) => {
      const clamped = clamp(nextWidth);
      setWidth(clamped);
      storage?.setItem(storageKey, String(clamped));
    },
    [clamp, storage, storageKey]
  );

  useEffect(() => {
    setWidth((current) => clamp(current));
  }, [clamp]);

  useEffect(() => {
    const onResize = () => applyWidth(width);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [applyWidth, width]);

  function endDrag(event?: PointerEvent<HTMLDivElement>) {
    document.body.classList.remove("is-col-resizing");
    if (event && dragStartRef.current) {
      event.currentTarget.releasePointerCapture?.(dragStartRef.current.pointerId);
    }
    dragStartRef.current = null;
  }

  return {
    width,
    handleProps: {
      role: "separator",
      tabIndex: 0,
      "aria-orientation": "vertical" as const,
      "aria-valuemin": minWidth,
      "aria-valuenow": width,
      "aria-valuemax": Math.max(minWidth, getMaxWidth()),
      onDoubleClick: () => applyWidth(defaultWidth),
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          applyWidth(width + 16);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          applyWidth(width - 16);
        } else if (event.key === "Home") {
          event.preventDefault();
          applyWidth(minWidth);
        } else if (event.key === "End") {
          event.preventDefault();
          applyWidth(getMaxWidth());
        }
      },
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        dragStartRef.current = { pointerId: event.pointerId, x: event.clientX, width };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        document.body.classList.add("is-col-resizing");
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        const dragStart = dragStartRef.current;
        if (!dragStart) {
          return;
        }
        applyWidth(dragStart.width - (event.clientX - dragStart.x));
      },
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => endDrag(event),
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => endDrag(event),
    },
  };
}
