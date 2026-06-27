import React, { memo } from "react";
// ═══════════ ERROR POPUP ═══════════
function ErrorPopup({ error, lang, onClose, onOpenOutput }) {
  if (!error) return null;
  const lines = error.split("\n");
  const langName = LANGS[lang]?.n || lang;
  const langColor = LANGS[lang]?.c || "#FF6B9D";
  const firstMeaningful = lines.find(l => /error|warning|failed/i.test(l)) || lines[0] || "";
  let errType = "Error";
  if (/syntaxerror/i.test(firstMeaningful)) errType = "SyntaxError";
  else if (/nameerror/i.test(firstMeaningful)) errType = "NameError";
  else if (/typeerror/i.test(firstMeaningful)) errType = "TypeError";
  else if (/valueerror/i.test(firstMeaningful)) errType = "ValueError";
  else if (/tabError/i.test(firstMeaningful)) errType = "TabError";
  else if (/traceback/i.test(lines[0])) errType = "Runtime Error";
  else if (/compilation failed|build failed/i.test(error)) errType = "Build Failed";
  else if (/error\[e\d+\]/i.test(firstMeaningful)) errType = "Rust Error";
  else if (/\\.go:/i.test(firstMeaningful)) errType = "Go Error";
  else if (/sql error/i.test(firstMeaningful)) errType = "SQL Error";
  else if (/fatal error/i.test(firstMeaningful)) errType = "Fatal Error";
  else if (/error:/i.test(firstMeaningful)) errType = "Compilation Error";
  return (
    <div className="err-ov">
      <div className="err-box err-slide">
        <div className="err-head">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B9D", boxShadow: "0 0 8px #FF6B9D", display: "inline-block", flexShrink: 0 }} className="pulse" />
          <div className="err-title">⊗ {errType}</div>
          <span className="err-lang-pill" style={{ background: `${langColor}22`, color: langColor, borderColor: `${langColor}44` }}>{langName}</span>
          <button className="err-close" onClick={onClose}>✕</button>
        </div>
        <div className="err-body">
          {lines.map((line, i) => {
            let color = "#ffb3c0";
            if (/^❌/.test(line)) color = "#FF6B9D";
            else if (/^⚠/.test(line)) color = "#DCDCAA";
            else if (/^\s*✖/.test(line)) color = "#ff8090";
            else if (/Fix the error/i.test(line)) color = "#6a7585";
            else if (/^traceback/i.test(line)) color = "#DCDCAA";
            else if (/^\s+file /i.test(line)) color = "#8892a4";
            else if (/^\s+\^+\s*$/.test(line)) color = "#FF6B9D";
            else if (/^(\w+error|\w+exception)/i.test(line.trim())) color = "#ff6060";
            else if (/^(error(\[e\d+\])?:|sql error|compilation failed)/i.test(line.trim())) color = "#ff6060";
            else if (/^warning/i.test(line.trim())) color = "#DCDCAA";
            else if (/^\s+/.test(line) && line.trim()) color = "#8892a4";
            return <div key={i} style={{ color, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.75 }}>{line || "\u00A0"}</div>;
          })}
        </div>
        <div className="err-foot">
          <span className="err-hint">Fix errors and press ▶ Run · Esc to dismiss</span>
          <button className="err-view-btn" onClick={() => { onOpenOutput(); onClose(); }}>View in Output →</button>
        </div>
      </div>
    </div>
  );
}

