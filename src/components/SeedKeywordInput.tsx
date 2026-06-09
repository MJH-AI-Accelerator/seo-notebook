"use client";

import { useState, useRef } from "react";
import { MJH_GOLD } from "./styles";

interface SeedKeywordInputProps {
  seeds: string[];
  onSeedsChange: (seeds: string[]) => void;
}

function parseSeedInput(input: string): string[] {
  return input
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function SeedKeywordInput({ seeds, onSeedsChange }: SeedKeywordInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleAdd = () => {
    const parsed = parseSeedInput(inputValue);
    if (parsed.length > 0) {
      const combined = [...new Set([...seeds, ...parsed])];
      onSeedsChange(combined);
      setInputValue("");
    }
  };

  const handleRemove = (term: string) => {
    onSeedsChange(seeds.filter((s) => s !== term));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={{
      borderRadius: 14,
      background: "rgba(255,255,255,0.55)",
      backdropFilter: "blur(16px) saturate(170%)",
      WebkitBackdropFilter: "blur(16px) saturate(170%)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.85), inset 1.5px 2px 1px -1px rgba(255,255,255,1), inset -2px -3px 2px -1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.08)",
      padding: "12px 14px",
    }}>
      <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4b5563", fontWeight: 600 }}>
        Desired Keywords
      </span>

      {seeds.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          {seeds.map((seed) => (
            <span key={seed} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 99,
              fontSize: 11.5,
              fontWeight: 500,
              background: `rgba(230,192,27,0.12)`,
              color: "#92810F",
              transition: "all 150ms",
            }}>
              {seed}
              <button
                onClick={() => handleRemove(seed)}
                aria-label={`Remove ${seed}`}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, color: "#8B7310", lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter 2-3 word phrases for best results"
          rows={2}
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: 12.5,
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#fafbfc",
            resize: "vertical",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          style={{
            marginTop: 4,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            border: "none",
            background: inputValue.trim() ? MJH_GOLD : "#e5e7eb",
            color: inputValue.trim() ? "#ffffff" : "#9ca3af",
            cursor: inputValue.trim() ? "pointer" : "not-allowed",
            transition: "all 150ms",
          }}
        >
          Add
        </button>
        <div style={{ marginTop: 4, fontSize: 10, color: "#4b5563" }}>
          Two- and three-word phrases give sharper results than single words.
        </div>
      </div>
    </div>
  );
}
