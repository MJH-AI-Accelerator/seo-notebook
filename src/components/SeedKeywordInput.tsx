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
      background: "#ffffff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
      padding: "12px 14px",
    }}>
      <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 600 }}>
        Seed Keywords
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
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: "#8B7310", lineHeight: 1 }}
              >
                x
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
        <div style={{ marginTop: 4, fontSize: 10, color: "#9ca3af" }}>
          Tip: Long-tail keywords (2-3+ words) give better results than single broad terms
        </div>
      </div>
    </div>
  );
}
