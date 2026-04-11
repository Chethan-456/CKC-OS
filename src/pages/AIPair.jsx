import { useState, useRef, useEffect, useCallback } from "react";

const THEMES = {
  dark: {
    bg: "#0a0b0f",
    surface: "#111318",
    card: "#161820",
    border: "#252830",
    borderAccent: "#3d4260",
    text: "#e8eaf6",
    muted: "#6b7099",
    accent: "#7c83ff",
    accentGlow: "rgba(124,131,255,0.15)",
    success: "#4ade80",
    warning: "#fbbf24",
    error: "#f87171",
    tag: "#1e2035",
    tagText: "#a5abff",
    lineNum: "#353850",
    highlight: "rgba(124,131,255,0.08)",
    scrollbar: "#252830",
  },
};

const T = THEMES.dark;

const BOILERPLATES = {
  "React Component": `import { useState, useEffect } from 'react';

interface Props {
  title: string;
  onAction?: () => void;
}

export default function MyComponent({ title, onAction }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`\${title} - \${count}\`;
  }, [title, count]);

  return (
    <div className="container">
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
      {onAction && (
        <button onClick={onAction}>Action</button>
      )}
    </div>
  );
}`,
  "Express API Route": `import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// GET /api/items
router.get('/', async (req: Request, res: Response) => {
  try {
    const items = await ItemService.findAll();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// POST /api/items
router.post('/',
  body('name').trim().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const item = await ItemService.create(req.body);
    res.status(201).json({ success: true, data: item });
  }
);

export default router;`,
  "Python FastAPI": `from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

app = FastAPI(title="My API", version="1.0.0")

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class Item(ItemCreate):
    id: int
    
    class Config:
        from_attributes = True

@app.get("/items", response_model=List[Item])
async def get_items(skip: int = 0, limit: int = 100):
    """Retrieve all items with pagination."""
    return db.query(Item).offset(skip).limit(limit).all()

@app.post("/items", response_model=Item, status_code=201)
async def create_item(item: ItemCreate):
    """Create a new item."""
    db_item = ItemModel(**item.dict())
    db.add(db_item)
    db.commit()
    return db_item

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)`,
  "React Custom Hook": `import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetch<T>(
  url: string,
  options?: RequestInit
): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const abortRef = useRef<AbortController>();

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(url, {
        ...options,
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const data: T = await res.json();
      setState({ data, loading: false, error: null });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setState(s => ({ ...s, loading: false, error: err.message }));
      }
    }
  }, [url]);

  useEffect(() => { fetchData(); return () => abortRef.current?.abort(); }, [fetchData]);
  return { ...state, refetch: fetchData };
}`,
};

const SUGGESTIONS = {
  "useState": [
    "const [isLoading, setIsLoading] = useState(false);",
    "const [error, setError] = useState<string | null>(null);",
    "const [data, setData] = useState<T[]>([]);",
  ],
  "useEffect": [
    "useEffect(() => {\n  fetchData();\n  return () => cleanup();\n}, [dependency]);",
    "useEffect(() => {\n  const handler = debounce(fn, 300);\n  window.addEventListener('resize', handler);\n  return () => window.removeEventListener('resize', handler);\n}, []);",
  ],
  "async": [
    "try {\n  const response = await fetch(url);\n  const data = await response.json();\n} catch (err) {\n  console.error('Fetch failed:', err);\n}",
    "const result = await Promise.all([fetchA(), fetchB(), fetchC()]);",
  ],
  "function": [
    "const memoizedFn = useCallback(() => {\n  // logic here\n}, [dependencies]);",
    "const computed = useMemo(() => {\n  return expensiveCalc(data);\n}, [data]);",
  ],
};

const EXPLANATIONS = {
  sample: `This code snippet defines a **React functional component** with the following key behaviors:

**State Management**
- Uses \`useState\` to track a counter value that re-renders on change
- \`setCount\` follows the functional update pattern \`c => c + 1\` to avoid stale closure issues

**Side Effects**  
- The \`useEffect\` hook runs whenever \`count\` or \`title\` changes
- It updates \`document.title\` as a side effect outside the render cycle
- The dependency array \`[count, title]\` ensures precise re-execution

**Performance**  
- No expensive re-computations; suitable for frequent updates
- Consider \`useMemo\` if the render becomes costly

**Suggestions**
- Add error boundaries for production resilience
- Extract the title logic into a custom \`useDocumentTitle\` hook`,
};

const sampleCode = `import { useState, useEffect } from 'react';

function Counter({ title }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`\${title} - \${count}\`;
  }, [count, title]);

  return (
    <div>
      <h2>{title}: {count}</h2>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}`;

const refactoredCode = `import { useState, useEffect, useCallback } from 'react';

interface CounterProps {
  title: string;
  initialCount?: number;
  step?: number;
}

function useDocumentTitle(title: string) {
  useEffect(() => { document.title = title; }, [title]);
}

const Counter: React.FC<CounterProps> = ({
  title,
  initialCount = 0,
  step = 1,
}) => {
  const [count, setCount] = useState(initialCount);
  useDocumentTitle(\`\${title} - \${count}\`);

  const increment = useCallback(
    () => setCount(c => c + step),
    [step]
  );
  const decrement = useCallback(
    () => setCount(c => Math.max(0, c - step)),
    [step]
  );
  const reset = useCallback(() => setCount(initialCount), [initialCount]);

  return (
    <section aria-label={title}>
      <h2>{title}: {count}</h2>
      <div role="group">
        <button onClick={decrement} disabled={count === 0}>−</button>
        <button onClick={increment}>+</button>
        <button onClick={reset}>Reset</button>
      </div>
    </section>
  );
};

export default Counter;`;

// ─── Sub-components ────────────────────────────────────────────────────────────

function Tag({ children, color = T.tagText }) {
  return (
    <span style={{
      background: T.tag,
      color,
      fontSize: 11,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      padding: "2px 8px",
      borderRadius: 4,
      border: `1px solid ${T.border}`,
      letterSpacing: "0.02em",
    }}>{children}</span>
  );
}

function StatusDot({ active, color }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: "50%",
      background: active ? color : T.muted,
      display: "inline-block",
      boxShadow: active ? `0 0 6px ${color}` : "none",
      transition: "all 0.3s",
    }} />
  );
}

function CodeLine({ num, content, highlighted, isNew }) {
  return (
    <div style={{
      display: "flex",
      background: highlighted ? T.highlight : isNew ? "rgba(74,222,128,0.05)" : "transparent",
      borderLeft: isNew ? `2px solid ${T.success}` : "2px solid transparent",
      transition: "background 0.2s",
    }}>
      <span style={{
        width: 36, textAlign: "right", paddingRight: 16,
        color: T.lineNum, fontSize: 12, userSelect: "none",
        fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
      }}>{num}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13, color: T.text, whiteSpace: "pre", flex: 1,
        lineHeight: "20px",
      }}>{syntaxColor(content)}</span>
    </div>
  );
}

function syntaxColor(line) {
  const patterns = [
    [/\b(import|export|default|from|const|let|var|function|return|async|await|if|else|try|catch|new|class|extends|interface|type|enum)\b/g, "#c792ea"],
    [/\b(useState|useEffect|useCallback|useMemo|useRef|React)\b/g, "#82aaff"],
    [/('.*?'|`.*?`|".*?")/g, "#c3e88d"],
    [/\b(\d+)\b/g, "#f78c6c"],
    [/(\/\/.*)/g, "#546e7a"],
    [/\b(true|false|null|undefined)\b/g, "#ff5370"],
  ];

  let parts = [{ text: line, color: T.text }];
  for (const [regex, color] of patterns) {
    const next = [];
    for (const part of parts) {
      if (part.color !== T.text) { next.push(part); continue; }
      let last = 0, match;
      regex.lastIndex = 0;
      while ((match = regex.exec(part.text)) !== null) {
        if (match.index > last) next.push({ text: part.text.slice(last, match.index), color: T.text });
        next.push({ text: match[0], color });
        last = match.index + match[0].length;
      }
      if (last < part.text.length) next.push({ text: part.text.slice(last), color: T.text });
      parts = next;
    }
  }
  return parts.map((p, i) => <span key={i} style={{ color: p.color }}>{p.text}</span>);
}

function CodeEditor({ code, title, badge, highlightLines = [], newLines = [], maxHeight = 280 }) {
  const lines = code.split("\n");
  return (
    <div style={{
      background: T.card,
      borderRadius: 8,
      border: `1px solid ${T.border}`,
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px",
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
      }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#ff5f56","#ffbd2e","#27c93f"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span style={{ flex: 1, fontSize: 12, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>{title}</span>
        {badge && <Tag>{badge}</Tag>}
      </div>
      <div style={{ overflowY: "auto", maxHeight, padding: "8px 0" }}>
        {lines.map((line, i) => (
          <CodeLine
            key={i} num={i + 1} content={line}
            highlighted={highlightLines.includes(i + 1)}
            isNew={newLines.includes(i + 1)}
          />
        ))}
      </div>
    </div>
  );
}

function SuggestionChip({ text, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.accentGlow : T.tag,
        color: hovered ? T.accent : T.muted,
        border: `1px solid ${hovered ? T.accent : T.border}`,
        borderRadius: 6, padding: "5px 10px",
        fontSize: 12, cursor: "pointer",
        fontFamily: "'JetBrains Mono', monospace",
        transition: "all 0.2s",
        textAlign: "left", whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis",
        maxWidth: 220,
      }}
    >⚡ {text.split("\n")[0]}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AIPairProgrammer() {
  const [activeTab, setActiveTab] = useState("suggest");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [showRefactor, setShowRefactor] = useState(false);
  const [selectedBoilerplate, setSelectedBoilerplate] = useState("React Component");
  const [inputCode, setInputCode] = useState("// Start typing your code...\nuseState");
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef(null);

  const currentKeyword = Object.keys(SUGGESTIONS).find(k =>
    inputCode.toLowerCase().includes(k.toLowerCase())
  ) || "useState";
  const suggestions = SUGGESTIONS[currentKeyword] || SUGGESTIONS["useState"];

  const simulateStream = useCallback((text, setter, onDone) => {
    let i = 0;
    setter("");
    if (streamRef.current) clearInterval(streamRef.current);
    setIsStreaming(true);
    streamRef.current = setInterval(() => {
      i += Math.floor(Math.random() * 4) + 2;
      setter(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(streamRef.current);
        setIsStreaming(false);
        onDone && onDone();
      }
    }, 18);
  }, []);

  const handleExplain = () => {
    setIsAnalyzing(true);
    setAnalysisText("");
    setTimeout(() => {
      setIsAnalyzing(false);
      simulateStream(EXPLANATIONS.sample, setAnalysisText);
    }, 900);
  };

  const handleRefactor = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowRefactor(true);
    }, 1200);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tabs = [
    { id: "suggest", label: "Suggestions", icon: "✦" },
    { id: "explain", label: "Explain", icon: "◈" },
    { id: "refactor", label: "Refactor", icon: "⟳" },
    { id: "boilerplate", label: "Templates", icon: "⊞" },
  ];

  useEffect(() => () => { if (streamRef.current) clearInterval(streamRef.current); }, []);

  return (
    <div style={{
      background: T.bg,
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      fontFamily: "'Inter', -apple-system, sans-serif",
      overflow: "hidden",
      maxWidth: 860,
      margin: "0 auto",
    }}>

      {/* ── Header ── */}
      <div style={{
        background: T.surface,
        padding: "16px 20px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `linear-gradient(135deg, #7c83ff 0%, #a78bfa 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>⌥</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: T.text, fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
              AI Pair Programmer
            </span>
            <Tag color={T.success}>● Active</Tag>
          </div>
          <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>
            Inline co-pilot · Claude API · RAG-enhanced
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {[
            { label: "JS", active: true, color: T.warning },
            { label: "TS", active: true, color: T.accent },
            { label: "PY", active: false, color: T.success },
          ].map(({ label, active, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <StatusDot active={active} color={color} />
              <span style={{ fontSize: 11, color: active ? T.muted : T.lineNum }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
        padding: "0 20px",
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: "none", border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent",
              color: activeTab === tab.id ? T.accent : T.muted,
              padding: "10px 14px",
              fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.2s", fontFamily: "inherit",
              marginBottom: -1,
            }}
          >
            <span style={{ fontSize: 10 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── SUGGEST TAB ── */}
        {activeTab === "suggest" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              background: T.card, borderRadius: 8, border: `1px solid ${T.border}`,
              padding: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Your Code Context
                </span>
                <Tag>{currentKeyword}</Tag>
              </div>
              <textarea
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%", background: "transparent", border: "none",
                  color: T.accent, fontSize: 13, resize: "none",
                  fontFamily: "'JetBrains Mono', monospace", outline: "none",
                  lineHeight: "1.6", minHeight: 60, boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                ✦ Inline Suggestions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {suggestions.map((s, i) => (
                  <div key={i}
                    onClick={() => setActiveSuggestion(activeSuggestion === i ? null : i)}
                    style={{
                      background: activeSuggestion === i ? T.accentGlow : T.card,
                      border: `1px solid ${activeSuggestion === i ? T.accent : T.border}`,
                      borderRadius: 8, padding: "10px 14px", cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <pre style={{
                        margin: 0, fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12, color: T.text, lineHeight: "1.5",
                        overflow: "hidden", flex: 1,
                        maxHeight: activeSuggestion === i ? 200 : 20,
                        transition: "max-height 0.3s",
                        whiteSpace: "pre-wrap",
                      }}>{s}</pre>
                      <button
                        onClick={e => { e.stopPropagation(); copyToClipboard(s, `s${i}`); }}
                        style={{
                          background: copiedKey === `s${i}` ? "rgba(74,222,128,0.15)" : T.tag,
                          border: `1px solid ${copiedKey === `s${i}` ? T.success : T.border}`,
                          color: copiedKey === `s${i}` ? T.success : T.muted,
                          borderRadius: 5, padding: "3px 8px",
                          fontSize: 11, cursor: "pointer", flexShrink: 0,
                          fontFamily: "inherit", transition: "all 0.2s",
                        }}
                      >{copiedKey === `s${i}` ? "✓ Copied" : "Copy"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                ⚡ Quick Completions
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.values(SUGGESTIONS).flat().slice(0, 6).map((s, i) => (
                  <SuggestionChip key={i} text={s} onClick={() => copyToClipboard(s, `q${i}`)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── EXPLAIN TAB ── */}
        {activeTab === "explain" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <CodeEditor
              code={sampleCode}
              title="counter.tsx"
              badge="TypeScript"
              highlightLines={[3, 5, 6, 7]}
            />

            <button
              onClick={handleExplain}
              disabled={isAnalyzing || isStreaming}
              style={{
                background: isAnalyzing ? T.tag : `linear-gradient(135deg, ${T.accent}, #a78bfa)`,
                border: "none", borderRadius: 8,
                color: isAnalyzing ? T.muted : "#fff",
                padding: "10px 20px", fontSize: 13,
                cursor: isAnalyzing ? "default" : "pointer",
                fontFamily: "inherit", fontWeight: 500,
                transition: "all 0.3s",
                display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
              }}
            >
              {isAnalyzing ? (
                <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Analyzing with Claude...</>
              ) : "◈ Explain Selected Code"}
            </button>

            {(analysisText || isAnalyzing) && (
              <div style={{
                background: T.card, borderRadius: 8,
                border: `1px solid ${T.borderAccent}`,
                padding: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4,
                    background: T.accentGlow, border: `1px solid ${T.accent}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: T.accent,
                  }}>AI</div>
                  <span style={{ fontSize: 12, color: T.accent, fontWeight: 500 }}>Claude Explanation</span>
                  {isStreaming && <span style={{ fontSize: 10, color: T.muted }}>● streaming</span>}
                </div>
                <div style={{
                  fontSize: 13, color: T.text, lineHeight: "1.7",
                  whiteSpace: "pre-wrap", fontFamily: "inherit",
                }}>
                  {analysisText.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                    /^\*\*.*\*\*$/.test(part)
                      ? <strong key={i} style={{ color: T.accent, fontWeight: 600 }}>{part.slice(2, -2)}</strong>
                      : <span key={i}>{part}</span>
                  )}
                  {isStreaming && <span style={{
                    display: "inline-block", width: 2, height: 14,
                    background: T.accent, marginLeft: 2,
                    animation: "blink 0.7s infinite",
                    verticalAlign: "text-bottom",
                  }} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REFACTOR TAB ── */}
        {activeTab === "refactor" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
            }}>
              {[
                { label: "Add TypeScript Types", icon: "TS", color: "#3178c6" },
                { label: "Extract Custom Hook", icon: "⌁", color: T.accent },
                { label: "Add Error Handling", icon: "⚠", color: T.warning },
                { label: "Optimize Performance", icon: "⚡", color: T.success },
                { label: "Add Accessibility", icon: "♿", color: "#e879f9" },
                { label: "Convert to async/await", icon: "⟳", color: T.error },
              ].map(({ label, icon, color }) => (
                <button
                  key={label}
                  onClick={handleRefactor}
                  style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: "10px 12px",
                    color: T.text, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, fontFamily: "inherit",
                    transition: "all 0.2s", textAlign: "left",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = color;
                    e.currentTarget.style.background = `${color}18`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.background = T.card;
                  }}
                >
                  <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 20 }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {isAnalyzing && (
              <div style={{
                background: T.card, borderRadius: 8, border: `1px solid ${T.border}`,
                padding: 20, textAlign: "center",
              }}>
                <div style={{ fontSize: 24, marginBottom: 8, animation: "spin 1.5s linear infinite", display: "inline-block" }}>⟳</div>
                <div style={{ color: T.muted, fontSize: 13 }}>Refactoring with Claude AI...</div>
              </div>
            )}

            {showRefactor && !isAnalyzing && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: T.success, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    ✓ Refactored Output
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Tag color={T.success}>+TypeScript</Tag>
                    <Tag color={T.accent}>+Accessibility</Tag>
                    <Tag color="#e879f9">+Custom Hook</Tag>
                  </div>
                </div>
                <CodeEditor
                  code={refactoredCode}
                  title="counter.refactored.tsx"
                  badge="Enhanced"
                  newLines={[1, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22]}
                  maxHeight={320}
                />
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => copyToClipboard(refactoredCode, "refactored")}
                    style={{
                      background: copiedKey === "refactored" ? "rgba(74,222,128,0.15)" : T.accent,
                      border: "none", borderRadius: 7, padding: "8px 16px",
                      color: copiedKey === "refactored" ? T.success : "#fff",
                      fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >{copiedKey === "refactored" ? "✓ Copied!" : "Copy Refactored Code"}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BOILERPLATE TAB ── */}
        {activeTab === "boilerplate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.keys(BOILERPLATES).map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedBoilerplate(key)}
                  style={{
                    background: selectedBoilerplate === key ? T.accentGlow : T.tag,
                    border: `1px solid ${selectedBoilerplate === key ? T.accent : T.border}`,
                    color: selectedBoilerplate === key ? T.accent : T.muted,
                    borderRadius: 6, padding: "6px 12px",
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                >{key}</button>
              ))}
            </div>

            <CodeEditor
              code={BOILERPLATES[selectedBoilerplate]}
              title={`${selectedBoilerplate.toLowerCase().replace(/ /g, "-")}.tsx`}
              badge="Boilerplate"
              maxHeight={340}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => copyToClipboard(BOILERPLATES[selectedBoilerplate], "bp")}
                style={{
                  background: copiedKey === "bp" ? "rgba(74,222,128,0.15)" : T.card,
                  border: `1px solid ${copiedKey === "bp" ? T.success : T.border}`,
                  color: copiedKey === "bp" ? T.success : T.muted,
                  borderRadius: 7, padding: "8px 14px",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                }}
              >{copiedKey === "bp" ? "✓ Copied!" : "Copy Template"}</button>
              <button style={{
                background: `linear-gradient(135deg, ${T.accent}, #a78bfa)`,
                border: "none", borderRadius: 7, padding: "8px 16px",
                color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>Insert into Editor ↗</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: `1px solid ${T.border}`,
        background: T.surface, padding: "10px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "RAG Context", val: "42 files", color: T.accent },
            { label: "Model", val: "claude-sonnet-4", color: T.success },
            { label: "Latency", val: "~180ms", color: T.warning },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", gap: 4, fontSize: 11, alignItems: "center" }}>
              <span style={{ color: T.muted }}>{label}:</span>
              <span style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>{val}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: T.lineNum }}>Powered by Claude API</div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.surface}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
      `}</style>
    </div>
  );
}