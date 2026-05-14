"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useState, useEffect, useRef, useCallback } from "react";
import type { DocumentFields } from "../lib/types";

interface WordEditorProps {
  onContentChange: (text: string, fields: DocumentFields) => void;
}

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"];
const COLORS = [
  "#1a1a1a", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed", "#db2777",
  "#6b7280", "#fca5a5", "#fdba74", "#fde047", "#86efac", "#93c5fd", "#c4b5fd", "#f9a8d4",
];

const AUTOSAVE_KEY = "seo-notebook-autosave";

function ToolbarButton({ onClick, active, disabled, title, children, style: extraStyle }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        border: "none", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
        background: active ? "#e0e7ff" : hovered ? "#f3f4f6" : "transparent",
        color: active ? "#3b82f6" : disabled ? "#d1d5db" : "#374151",
        transition: "all 100ms", fontSize: 13, fontWeight: active ? 700 : 400,
        flexShrink: 0, ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDropdown({ value, options, onChange, title, width = 70 }: {
  value: string; options: { label: string; value: string }[]; onChange: (v: string) => void; title: string; width?: number;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={title}
      style={{
        width, height: 28, fontSize: 11, borderRadius: 4, border: "1px solid #e5e7eb",
        background: "#ffffff", color: "#374151", cursor: "pointer", padding: "0 4px",
        outline: "none", flexShrink: 0,
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 3px", flexShrink: 0 }} />;
}

function ColorPicker({ currentColor, onColorChange }: { currentColor: string; onColorChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <ToolbarButton onClick={() => setOpen(!open)} active={open} title="Text color">
        <span style={{ fontSize: 14, fontWeight: 700, borderBottom: `3px solid ${currentColor}`, lineHeight: 1, paddingBottom: 1 }}>A</span>
      </ToolbarButton>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4, padding: 8,
          background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb", zIndex: 100, display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)", gap: 3, width: 200,
        }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { onColorChange(c); setOpen(false); }}
              style={{
                width: 20, height: 20, borderRadius: 4, background: c, border: c === currentColor ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                cursor: "pointer", padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InsertMenu({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const insertYouTube = () => {
    const url = prompt("Enter YouTube URL:");
    if (!url || !editor) return;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    const videoId = match?.[1];
    if (!videoId) { alert("Invalid YouTube URL"); return; }
    editor.chain().focus().insertContent(
      `<div data-type="youtube" data-video-id="${videoId}" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:16px 0;border-radius:8px;background:#000;">` +
      `<iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div><p></p>`
    ).run();
    setOpen(false);
  };

  const insertCallout = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(
      `<div data-type="callout" style="background:#f0f9ff;border-left:4px solid #0284c7;padding:16px 20px;margin:16px 0;border-radius:0 8px 8px 0;">` +
      `<p><strong>Note:</strong> Enter your callout text here.</p></div><p></p>`
    ).run();
    setOpen(false);
  };

  const insertAccordion = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(
      `<details style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:12px 0;">` +
      `<summary style="cursor:pointer;font-weight:600;">Click to expand</summary>` +
      `<p>Accordion content here.</p></details><p></p>`
    ).run();
    setOpen(false);
  };

  const insertTwoColumn = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(
      `<div data-type="two-column" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:16px 0;">` +
      `<div style="padding:12px;border:1px dashed #d1d5db;border-radius:6px;min-height:80px;"><p>Left column</p></div>` +
      `<div style="padding:12px;border:1px dashed #d1d5db;border-radius:6px;min-height:80px;"><p>Right column</p></div></div><p></p>`
    ).run();
    setOpen(false);
  };

  const insertReferences = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(
      `<div data-type="references" style="border-top:2px solid #e5e7eb;margin-top:32px;padding-top:16px;">` +
      `<p><strong>References</strong></p>` +
      `<ol><li>Author A, et al. Title. <em>Journal</em>. Year;Vol(Issue):Pages.</li>` +
      `<li>Author B, et al. Title. <em>Journal</em>. Year;Vol(Issue):Pages.</li></ol></div><p></p>`
    ).run();
    setOpen(false);
  };

  const insertISI = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(
      `<div data-type="isi" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin:16px 0;">` +
      `<p><strong>IMPORTANT SAFETY INFORMATION</strong></p>` +
      `<p>Enter safety information here.</p></div><p></p>`
    ).run();
    setOpen(false);
  };

  const insertImageFromFile = () => {
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = () => {
      const alt = prompt("Enter alt text for SEO:") || file.name;
      editor.chain().focus().setImage({ src: reader.result as string, alt }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const insertImageFromUrl = () => {
    if (!editor) return;
    const url = prompt("Enter image URL:");
    if (url) {
      const alt = prompt("Enter alt text for SEO:") || "";
      editor.chain().focus().setImage({ src: url, alt }).run();
    }
    setOpen(false);
  };

  const items = [
    { label: "Image from file", icon: "\uD83D\uDDBC", action: insertImageFromFile },
    { label: "Image from URL", icon: "\uD83C\uDF10", action: insertImageFromUrl },
    { label: "YouTube video", icon: "\u25B6", action: insertYouTube },
    { label: "Callout / Sidebar", icon: "\uD83D\uDCCC", action: insertCallout },
    { label: "Accordion", icon: "\u25BC", action: insertAccordion },
    { label: "Two Column Layout", icon: "\u2B1C\u2B1C", action: insertTwoColumn },
    { label: "References", icon: "\uD83D\uDCDA", action: insertReferences },
    { label: "Safety Information (ISI)", icon: "\u26A0", action: insertISI },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />
      <ToolbarButton onClick={() => setOpen(!open)} active={open} title="Insert block">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
      </ToolbarButton>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 4,
          background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb", zIndex: 100, minWidth: 220, overflow: "hidden",
        }}>
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
                width: "100%", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 12, color: "#374151", textAlign: "left", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportMenu({ editor, title, metaDescription }: { editor: ReturnType<typeof useEditor>; title: string; metaDescription: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const copyHtml = () => {
    if (!editor) return;
    navigator.clipboard.writeText(buildExportHtml());
    setOpen(false);
  };

  const copyText = () => {
    if (!editor) return;
    const text = `${title}\n\n${editor.getText()}`;
    navigator.clipboard.writeText(text);
    setOpen(false);
  };

  const buildExportStyles = () => `
    body { font-family: Georgia, "Times New Roman", serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.75; color: #1a1a1a; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 22px; margin-top: 24px; }
    h3 { font-size: 18px; margin-top: 20px; }
    h4 { font-size: 16px; margin-top: 16px; font-style: italic; }
    p { margin: 12px 0; }
    a { color: #2563eb; text-decoration: underline; }
    img { max-width: 100%; height: auto; margin: 16px 0; }
    ul, ol { margin: 12px 0; padding-left: 28px; }
    li { margin: 4px 0; }
    blockquote { border-left: 4px solid #d1d5db; margin: 16px 0; padding: 8px 16px; color: #4b5563; font-style: italic; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; font-weight: 600; }
    mark { background-color: #fef08a; padding: 1px 2px; }
    code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f3f4f6; padding: 16px; border-radius: 6px; overflow-x: auto; }
    s { text-decoration: line-through; }
  `;

  const buildExportHtml = (forDocx?: boolean) => {
    if (!editor) return "";
    const content = editor.getHTML();
    const metaTag = metaDescription ? `<meta name="description" content="${metaDescription.replace(/"/g, "&quot;")}">` : "";
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title || "Article"}</title>${metaTag}
<style>${buildExportStyles()}</style>
</head><body>
<h1>${title}</h1>
${metaDescription && !forDocx ? `<p style="color:#6b7280;font-style:italic;font-size:14px;">${metaDescription}</p>` : ""}
${content}
</body></html>`;
  };

  const downloadHtml = () => {
    if (!editor) return;
    const blob = new Blob([buildExportHtml()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "article").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const downloadDocx = async () => {
    if (!editor) return;
    try {
      const { asBlob } = await import("html-docx-js-typescript");
      const blob = await asBlob(buildExportHtml(true));
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "article").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      downloadHtml();
    }
    setOpen(false);
  };

  const menuItems = [
    { label: "Copy as HTML", icon: "</>", action: copyHtml },
    { label: "Copy as text", icon: "Aa", action: copyText },
    { label: "Download .html", icon: "\u2B07", action: downloadHtml },
    { label: "Download .docx", icon: "\u2B07", action: downloadDocx },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <ToolbarButton onClick={() => setOpen(!open)} active={open} title="Export">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        </svg>
      </ToolbarButton>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 4, width: 180,
          background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb", zIndex: 100, padding: "4px 0", overflow: "hidden",
        }}>
          {menuItems.map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
                background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#374151",
                textAlign: "left", transition: "background 100ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <span style={{ width: 18, textAlign: "center", fontSize: 13, color: "#6b7280" }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WordEditor({ onContentChange }: WordEditorProps) {
  const [title, setTitle] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); return saved ? JSON.parse(saved).title || "" : ""; } catch { return ""; }
  });
  const [metaDescription, setMetaDescription] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); return saved ? JSON.parse(saved).meta || "" : ""; } catch { return ""; }
  });
  const [slug, setSlug] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); return saved ? JSON.parse(saved).slug || "" : ""; } catch { return ""; }
  });
  const [fontSize, setFontSize] = useState("16");
  const [textColor, setTextColor] = useState("#1a1a1a");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use refs for fields so auto-save always gets current values
  const titleRef = useRef(title);
  titleRef.current = title;
  const metaRef = useRef(metaDescription);
  metaRef.current = metaDescription;
  const slugRef = useRef(slug);
  slugRef.current = slug;
  const [initialContent] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); return saved ? JSON.parse(saved).html || "" : ""; } catch { return ""; }
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Placeholder.configure({ placeholder: "Start writing your article here..." }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Link.configure({ openOnClick: false }),
      Highlight,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "word-editor-content",
        style: "outline: none; min-height: 600px;",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const plainText = ed.getText();
      const words = plainText.trim().split(/\s+/).filter(Boolean);
      setWordCount(words.length);
      setCharCount(plainText.length);
      scheduleUpdate(plainText, ed.getHTML());
      scheduleAutoSave(ed.getHTML());
    },
  });

  const scheduleAutoSave = useCallback((html: string) => {
    setSaveStatus("saving");
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
          title: titleRef.current, meta: metaRef.current, slug: slugRef.current, html, savedAt: Date.now(),
        }));
        setSaveStatus("saved");
      } catch { /* storage full */ }
    }, 3000);
  }, []);

  const scheduleUpdate = useCallback((plainText: string, html: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const headingMatches = html.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi) || [];
      const headings = headingMatches.map(h => h.replace(/<[^>]+>/g, ""));
      const imgMatches = html.match(/<img[^>]+alt="([^"]*)"[^>]*>/gi) || [];
      const imageNames = imgMatches.map(img => {
        const match = img.match(/alt="([^"]*)"/);
        return match ? match[1] : "";
      }).filter(Boolean);

      const fullText = [title, plainText].filter(Boolean).join("\n\n");

      onContentChange(fullText, {
        title: title || undefined,
        metaDescription: metaDescription || undefined,
        slug: slug || undefined,
        headings: headings.length > 0 ? headings : undefined,
        imageNames: imageNames.length > 0 ? imageNames : undefined,
      });
    }, 2000);
  }, [title, metaDescription, slug, onContentChange]);

  // Trigger update when title/meta/slug changes
  useEffect(() => {
    if (editor) {
      scheduleUpdate(editor.getText(), editor.getHTML());
      scheduleAutoSave(editor.getHTML());
    }
  }, [title, metaDescription, slug]);

  // Apply font size
  useEffect(() => {
    const el = document.querySelector(".word-editor-content") as HTMLElement | null;
    if (el) el.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    const url = prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8f9fa" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 2, padding: "4px 8px",
        background: "#ffffff", borderBottom: "1px solid #e5e7eb", flexShrink: 0,
        flexWrap: "wrap", minHeight: 38,
      }}>
        {/* Font size */}
        <ToolbarDropdown
          value={fontSize}
          options={FONT_SIZES.map((s) => ({ label: `${s}px`, value: s }))}
          onChange={setFontSize}
          title="Font size"
          width={62}
        />

        <Divider />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <span style={{ textDecoration: "underline" }}>U</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <span style={{ textDecoration: "line-through" }}>S</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
          <span style={{ background: "#fef08a", padding: "0 2px", borderRadius: 2 }}>H</span>
        </ToolbarButton>
        <ColorPicker currentColor={textColor} onColorChange={(c) => { setTextColor(c); editor.chain().focus().setColor(c).run(); }} />

        <Divider />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          H1
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          H2
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          H3
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1h.01a1 1 0 110 2h-.01a1 1 0 01-1-1zM3 9.75a1 1 0 00-1.01 1 1 1 0 001.01 1h.01a1 1 0 100-2H3zM1.99 15a1 1 0 011-1h.01a1 1 0 110 2h-.01a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm3 4.167a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75zm-3 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm3 4.167a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm5 4.167a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75zm-5 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm5 4.167a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Insert */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 5a2 2 0 012-2h.5a.5.5 0 01.5.5v2A1.5 1.5 0 014.5 7H4a1 1 0 00-1 1v6a1 1 0 001 1h4a1 1 0 001-1V8a3 3 0 00-3-3H3zm8 0a2 2 0 012-2h.5a.5.5 0 01.5.5v2a1.5 1.5 0 01-1.5 1.5H12a1 1 0 00-1 1v6a1 1 0 001 1h4a1 1 0 001-1V8a3 3 0 00-3-3h-3z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <span style={{ fontSize: 16, lineHeight: 1 }}>-</span>
        </ToolbarButton>
        <ToolbarButton onClick={insertTable} title="Insert table">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M.99 5.24A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 0v2.25h7v-3.5H3.25a.75.75 0 00-.75.75zm0 3.75v3h7v-3h-7zm0 4.5v1.26c0 .414.336.75.75.75h6.25v-2.01h-7zm8.5 0v2.01h5.75a.75.75 0 00.75-.75v-1.26h-6.5zm6.5-1.5v-3h-6.5v3h6.5zm0-4.5v-2.25a.75.75 0 00-.75-.75H11v3h6.5z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={insertLink} active={editor.isActive("link")} title="Insert link">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
            <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
          </svg>
        </ToolbarButton>
        <InsertMenu editor={editor} />

        <Divider />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ transform: "scaleX(-1)" }}>
            <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Export */}
        <ExportMenu editor={editor} title={title} metaDescription={metaDescription} />
      </div>

      {/* Document area */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 0", background: "#f0f0f0" }}>
        {/* Paper */}
        <div className="word-paper" style={{
          maxWidth: 816, margin: "0 auto", background: "#ffffff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.12)", borderRadius: 2,
          padding: "72px 96px", minHeight: 1056,
        }}>
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article Title"
            style={{
              width: "100%", border: "none", outline: "none", fontSize: 28, fontWeight: 700,
              color: "#1a1a1a", marginBottom: 8, fontFamily: "'Georgia', 'Times New Roman', serif",
              background: "transparent",
            }}
          />

          {/* Meta description */}
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Meta description (for SEO analysis)"
            rows={2}
            style={{
              width: "100%", border: "none", outline: "none", fontSize: 13, color: "#6b7280",
              marginBottom: 12, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              background: "#fafafa", padding: "8px 12px", borderRadius: 6, resize: "vertical",
              borderLeft: "3px solid #e5e7eb", boxSizing: "border-box",
            }}
          />

          {/* Slug/URL field */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
            fontSize: 12, color: "#9ca3af",
          }}>
            <span style={{ fontWeight: 600, flexShrink: 0 }}>URL slug:</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="article-url-slug"
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 12, color: "#6b7280",
                background: "#fafafa", padding: "4px 8px", borderRadius: 4,
                borderBottom: "1px dashed #d1d5db", fontFamily: "monospace",
              }}
            />
          </div>

          {/* Editor content */}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 16px", background: "#ffffff", borderTop: "1px solid #e5e7eb",
        fontSize: 11, color: "#9ca3af", flexShrink: 0, gap: 16,
      }}>
        <div style={{ display: "flex", gap: 16 }}>
          <span>{wordCount.toLocaleString()} words</span>
          <span>{charCount.toLocaleString()} characters</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {saveStatus === "saving" ? (
            <>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "content-pulse 1s ease-in-out infinite" }} />
              <span>Saving...</span>
            </>
          ) : saveStatus === "saved" ? (
            <>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
              <span>Auto-saved</span>
            </>
          ) : (
            <span>Ready</span>
          )}
        </div>
      </div>
    </div>
  );
}
