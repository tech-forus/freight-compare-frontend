// src/components/DecimalInput.tsx
import React, { useEffect, useRef, useState } from "react";

interface DecimalInputProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  max?: number;
  maxDecimals?: number;
  maxIntegerDigits?: number;
}

const DecimalInput: React.FC<DecimalInputProps> = ({
  value,
  onChange,
  placeholder = "Enter value (max 999, 3 decimals)",
  className = "border rounded-lg px-3 py-2 w-40",
  max = 999,
  maxDecimals = 3,
  maxIntegerDigits = 3,
}) => {
  const [display, setDisplay] = useState<string>("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value -> display, but only when NOT focused
  useEffect(() => {
    if (focused) return;
    if (value === null || value === undefined || Number.isNaN(value)) {
      setDisplay("");
    } else {
      setDisplay(String(value));
    }
  }, [value, focused]);

  const clean = (raw: string): { display: string; numeric: number | null } => {
    // keep digits and dots only
    let s = raw.replace(/[^\d.]/g, "");

    // compress to a single dot
    if ((s.match(/\./g) || []).length > 1) {
      const first = s.indexOf(".");
      s = s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, "");
    }

    // Parts (note: we preserve a trailing dot if present)
    const hasDot = s.includes(".");
    let [intPart = "", decPart = ""] = s.split(".");

    // enforce lengths
    if (intPart.length > maxIntegerDigits) intPart = intPart.slice(0, maxIntegerDigits);
    if (maxDecimals === 0) decPart = "";
    else if (decPart.length > maxDecimals) decPart = decPart.slice(0, maxDecimals);

    // rebuild; if user typed the dot, keep it
    let rebuilt = hasDot ? `${intPart}.${decPart}` : intPart;

    // edge cases
    if (rebuilt === "." || rebuilt === "") return { display: rebuilt, numeric: null };

    // numeric value for parent
    let num = Number(rebuilt);
    if (Number.isNaN(num)) return { display: "", numeric: null };

    // clamp to max (but keep the user's visible string; we’ll snap on blur)
    if (num > max) {
      num = max;
      // If user is still typing, we keep display as-is; on blur we'll normalize.
    }

    return { display: rebuilt, numeric: num };
  };

  const applyRaw = (raw: string) => {
    const { display: d, numeric } = clean(raw);
    setDisplay(d);

    // Send numeric to parent. If only a bare dot, send null.
    if (onChange) onChange(d === "" || d === "." ? null : Math.min(numeric ?? 0, max));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // allow nav/edit keys
    const nav = new Set([
      "Backspace","Delete","Tab","Escape","Enter",
      "ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"
    ]);
    if (nav.has(e.key)) return;

    // allow shortcuts
    if ((e.ctrlKey || e.metaKey) && ["a","c","v","x","z","y"].includes(e.key.toLowerCase())) {
      return;
    }

    // block scientific notation & signs
    if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
      e.preventDefault();
      return;
    }

    // decimal keys: ".", ",", and numpad "Decimal"
    if (e.key === "." || e.key === "," || e.key === "Decimal") {
      if (maxDecimals === 0 || display.includes(".")) {
        e.preventDefault();
        return;
      }
      // convert comma/numpad to "."
      if (e.key !== ".") {
        e.preventDefault();
        const el = e.currentTarget;
        const start = el.selectionStart ?? display.length;
        const end = el.selectionEnd ?? display.length;
        applyRaw(display.slice(0, start) + "." + display.slice(end));
      }
      return;
    }

    // only digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // enforce maxIntegerDigits when typing in integer part
    const dotIdx = display.indexOf(".");
    const selStart = e.currentTarget.selectionStart ?? display.length;
    const selEnd = e.currentTarget.selectionEnd ?? display.length;
    const inInt = dotIdx === -1 || selStart <= dotIdx;
    if (inInt) {
      const intPart = dotIdx === -1 ? display : display.slice(0, dotIdx);
      const selected = Math.max(0, selEnd - selStart);
      const newLen = intPart.length - selected + 1;
      if (newLen > maxIntegerDigits) {
        e.preventDefault();
      }
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const txt = e.clipboardData.getData("text") || "";
    const el = e.currentTarget;
    const start = el.selectionStart ?? display.length;
    const end = el.selectionEnd ?? display.length;
    applyRaw(display.slice(0, start) + txt + display.slice(end));
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (!node) return;
      const cleaned = clean(display.slice(0, start) + txt + display.slice(end)).display;
      const pos = Math.min(cleaned.length, node.value.length);
      try { node.setSelectionRange(pos, pos); } catch {}
    });
  };

  const onBlur = () => {
    setFocused(false);

    // Normalize: remove trailing dot, clamp to max
    if (display === "" || display === ".") {
      setDisplay("");
      if (onChange) onChange(null);
      return;
    }

    let num = Number(display);
    if (Number.isNaN(num)) {
      setDisplay("");
      if (onChange) onChange(null);
      return;
    }

    if (num > max) num = max;

    // Format: keep decimals only if present (no forced trailing zeros)
    const normalized = display.endsWith(".") ? String(num) : display;
    // If user typed something like "9999", clean() already enforced digit limits;
    // still finalize to numeric string.
    setDisplay(String(num));
    if (onChange) onChange(num);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      onChange={(e) => applyRaw(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      className={className}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
    />
  );
};

export default DecimalInput;
