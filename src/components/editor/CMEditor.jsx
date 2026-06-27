import React, { useEffect, useRef, forwardRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab } from "y-codemirror.next";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { authStore, PALETTE } from "../../constants.js";

// ═══════════ CODEMIRROR ═══════════
export const CMEditor = forwardRef(({ lang, initText, onLocalOp, onCursorMove, cursors, lineLocks, myId, fileKey, readOnly = false }, ref) => {
  const domRef = useRef(null), viewRef = useRef(null), modsRef = useRef(null);
  const inited = useRef(false), suppress = useRef(false), prevDoc = useRef(initText || "");
  const lineLocksRef = useRef(lineLocks);
  const cursorsRef = useRef(cursors);
  useEffect(() => { lineLocksRef.current = lineLocks; }, [lineLocks]);
  useEffect(() => { cursorsRef.current = cursors; }, [cursors]);
  
  useEffect(() => {
    const api = { 
      _getText: () => viewRef.current?.state.doc.toString() ?? prevDoc.current,
      _applyRemoteOp: (op, fullCode) => {
        if (!viewRef.current) return;
        suppress.current = true;
        try {
          const v = viewRef.current;
          const currentText = v.state.doc.toString();
          
          if (fullCode !== undefined && fullCode !== currentText) {
            let i = 0, oe = currentText.length, ne = fullCode.length;
            while (i < oe && i < ne && currentText[i] === fullCode[i]) i++;
            let oe2 = oe, ne2 = ne;
            while (oe2 > i && ne2 > i && currentText[oe2 - 1] === fullCode[ne2 - 1]) { oe2--; ne2--; }
            v.dispatch({ changes: { from: i, to: oe2, insert: fullCode.slice(i, ne2) } });
          } else if (fullCode === undefined) {
            const dl = currentText.length;
            let change = null;
            if (op.type === "insert") change = { from: Math.max(0, Math.min(op.pos, dl)), insert: op.chars };
            else if (op.type === "delete") {
              const f = Math.max(0, Math.min(op.pos, dl));
              const t = Math.min(f + op.len, dl);
              if (t > f) change = { from: f, to: t };
            }
            else if (op.type === "replace") {
              const f = Math.max(0, Math.min(op.pos, dl));
              const t = Math.min(f + op.len, dl);
              change = { from: f, to: t, insert: op.chars };
            }
            if (change) v.dispatch({ changes: change });
          }
          prevDoc.current = v.state.doc.toString();
        } finally {
          suppress.current = false;
        }
      }
    };
    if (ref) { typeof ref === "function" ? ref(api) : (ref.current = api); }
  });
  useEffect(() => {
    if (inited.current || !domRef.current) return; inited.current = true;
    (async () => {
      try {
        const [{ EditorState }, { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput }, { defaultKeymap, history, historyKeymap, indentWithTab }, { searchKeymap, highlightSelectionMatches }, { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap }, { foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle }, { javascript }, { python }, { java }, { cpp }, { rust }, { go }, { sql }, { oneDark }] = await Promise.all([
          import("https://esm.sh/@codemirror/state@6.4.1"), import("https://esm.sh/@codemirror/view@6.26.3"),
          import("https://esm.sh/@codemirror/commands@6.6.0"), import("https://esm.sh/@codemirror/search@6.5.6"),
          import("https://esm.sh/@codemirror/autocomplete@6.17.0"), import("https://esm.sh/@codemirror/language@6.10.2"),
          import("https://esm.sh/@codemirror/lang-javascript@6.2.2"), import("https://esm.sh/@codemirror/lang-python@6.1.6"),
          import("https://esm.sh/@codemirror/lang-java@6.0.1"), import("https://esm.sh/@codemirror/lang-cpp@6.0.2"),
          import("https://esm.sh/@codemirror/lang-rust@6.0.1"), import("https://esm.sh/@codemirror/lang-go@6.0.0"),
          import("https://esm.sh/@codemirror/lang-sql@6.8.0"), import("https://esm.sh/@codemirror/theme-one-dark@6.1.2"),
        ]);
        const LM = { ts: javascript({ typescript: true }), js: javascript(), py: python(), java: java(), cpp: cpp(), rs: rust(), go: go(), sql: sql() };
        const theme = EditorView.theme({
          "&": { backgroundColor: "#0d0f14", color: "#d4d4d4", height: "100%", fontSize: "13.5px" },
          ".cm-content": { caretColor: "#4FC1FF", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: "13.5px", lineHeight: "21px" },
          ".cm-cursor,.cm-dropCursor": { borderLeftColor: "#4FC1FF", borderLeftWidth: "2px" },
          ".cm-activeLine": { backgroundColor: "rgba(79,193,255,.04)" },
          ".cm-selectionBackground": { backgroundColor: "rgba(79,193,255,.18) !important" },
          "&.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(79,193,255,.22) !important" },
          ".cm-gutters": { backgroundColor: "#0d0f14", borderRight: "1px solid rgba(255,255,255,.05)", color: "#4a5568", minWidth: "48px" },
          ".cm-lineNumbers .cm-gutterElement": { minWidth: "38px", textAlign: "right", paddingRight: "10px" },
          ".cm-activeLineGutter": { backgroundColor: "rgba(79,193,255,.04)", color: "#8892a4" },
          ".cm-matchingBracket": { backgroundColor: "rgba(79,193,255,.15)", color: "#fff !important" },
          ".cm-tooltip": { backgroundColor: "#1c1f28", border: "1px solid rgba(255,255,255,.1)", borderRadius: "6px", color: "#e0e0e0" },
          ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "rgba(79,193,255,.15)" },
        }, { dark: true });
        
        const lockFilter = EditorState.transactionFilter.of(tr => {
          if (tr.docChanged && !suppress.current) {
            let lockedBy = null;
            let lockedLine = null;
            tr.changes.iterChangedRanges((fromA, toA) => {
              const startLine = tr.startState.doc.lineAt(fromA).number;
              const endLine = tr.startState.doc.lineAt(toA).number;
              for (let i = startLine; i <= endLine; i++) {
                if (lineLocksRef.current) {
                  const lock = lineLocksRef.current[i];
                  if (lock && lock.user_id !== myId) {
                    lockedBy = lock.user_name || "another user";
                    lockedLine = i;
                    break;
                  }
                }
                if (cursorsRef.current) {
                  const remoteCursor = cursorsRef.current.find(c => c.id !== myId && c.line === i && c.lang === lang && c.tabId === fileKey);
                  if (remoteCursor) {
                    lockedBy = remoteCursor.name || "another user";
                    lockedLine = i;
                    break;
                  }
                }
              }
            });
            if (lockedBy) {
              const event = new CustomEvent("line-locked-toast", { detail: { line: lockedLine, userName: lockedBy } });
              window.dispatchEvent(event);
              return [];
            }
          }
          return tr;
        });

        const listener = EditorView.updateListener.of(upd => {
          if (upd.selectionSet) { const pos = upd.state.selection.main.head; const ln = upd.state.doc.lineAt(pos); onCursorMove?.(ln.number, pos - ln.from + 1, pos); }
          if (!upd.docChanged || suppress.current || readOnly) return;
          const newText = upd.state.doc.toString(); const old = prevDoc.current; if (newText === old) return;
          let i = 0, oe = old.length, ne = newText.length;
          while (i < oe && i < ne && old[i] === newText[i]) i++;
          let oe2 = oe, ne2 = ne;
          while (oe2 > i && ne2 > i && old[oe2 - 1] === newText[ne2 - 1]) { oe2--; ne2--; }
          const del = old.slice(i, oe2), ins = newText.slice(i, ne2);
          if (del.length && ins.length) onLocalOp?.({ type: "replace", pos: i, len: del.length, chars: ins });
          else if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length });
          else if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins });
          prevDoc.current = newText;
        });
        modsRef.current = { EditorState, EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput, history, historyKeymap, indentWithTab, searchKeymap, highlightSelectionMatches, autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle, oneDark, theme, lockFilter, listener, LM };
        const mkExt = lk => {
          const b = [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), dropCursor(), bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), crosshairCursor(), highlightSelectionMatches(), indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }), keymap.of([indentWithTab, ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap]), LM[lk] || LM.ts, oneDark, theme, lockFilter, listener, EditorView.lineWrapping];
          if (readOnly) b.push(EditorView.editable.of(false)); return b;
        };
        const view = new EditorView({ state: EditorState.create({ doc: initText || "", extensions: mkExt(lang) }), parent: domRef.current });
        viewRef.current = view; prevDoc.current = view.state.doc.toString();
      } catch (err) {
        if (domRef.current) {
          domRef.current.innerHTML = "";
          const ta = document.createElement("textarea"); ta.value = initText || "";
          ta.style.cssText = "width:100%;height:100%;background:#0d0f14;color:#d4d4d4;font-family:'JetBrains Mono',monospace;font-size:13.5px;line-height:21px;padding:8px 14px;border:none;outline:none;resize:none;tab-size:4;";
          if (!readOnly) {
            ta.addEventListener("input", e => {
              const nT = e.target.value, old = prevDoc.current;
              let i = 0, oe = old.length, ne = nT.length;
              while (i < oe && i < ne && old[i] === nT[i]) i++;
              let oe2 = oe, ne2 = ne;
              while (oe2 > i && ne2 > i && old[oe2 - 1] === nT[ne2 - 1]) { oe2--; ne2--; }
              const del = old.slice(i, oe2), ins = nT.slice(i, ne2);
              if (del.length && ins.length) onLocalOp?.({ type: "replace", pos: i, len: del.length, chars: ins });
              else if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length });
              else if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins });
              prevDoc.current = nT;
            });
          }
          domRef.current.appendChild(ta);
          if (ref) { const api = { _getText: () => ta.value }; typeof ref === "function" ? ref(api) : (ref.current = api); }
        }
      }
    })();
    return () => { if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null; inited.current = false; } };
  }, []);
  useEffect(() => {
    if (!viewRef.current || !modsRef.current) return;
    const { EditorState, EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput, history, historyKeymap, indentWithTab, searchKeymap, highlightSelectionMatches, autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle, oneDark, theme, lockFilter, listener, LM } = modsRef.current;
    const mkExt = lk => {
      const b = [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), dropCursor(), bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), crosshairCursor(), highlightSelectionMatches(), indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }), keymap.of([indentWithTab, ...closeBracketsKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...searchKeymap]), LM[lk] || LM.ts, oneDark, theme, lockFilter, listener, EditorView.lineWrapping];
      if (readOnly) b.push(EditorView.editable.of(false)); return b;
    };
    suppress.current = true;
    viewRef.current.setState(EditorState.create({ doc: initText || "", extensions: mkExt(lang) }));
    prevDoc.current = initText || "";
    suppress.current = false;
  }, [lang, fileKey]);
  const activeLocks = { ...lineLocks };
  if (cursors) {
    cursors.filter(c => c.id !== myId && c.lang === lang && c.tabId === fileKey).forEach(c => {
      if (!activeLocks[c.line]) {
        activeLocks[c.line] = {
          line_number: c.line,
          user_id: c.id,
          user_name: c.name,
          color: c.color || "#4FC1FF"
        };
      }
    });
  }

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      {Object.values(activeLocks).filter(lock => lock.user_id !== myId).map(lock => (
        <div key={`lock-${lock.line_number}`} style={{ pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden", zIndex: 10 }}>
          <div style={{ position: "absolute", top: (lock.line_number - 1) * 21, left: 0, right: 0, height: 21, background: lock.color + "15", borderLeft: `4px solid ${lock.color}`, pointerEvents: "none" }}>
            <div style={{ position: "absolute", right: 10, top: 2, display: "flex", alignItems: "center", gap: 5, background: lock.color, color: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
              🔒 {lock.user_name}
            </div>
          </div>
        </div>
      ))}
      {cursors?.filter(c => c.id !== myId).map(cur => {
        const top = (cur.line - 1) * 21, left = 48 + (cur.col - 1) * 8.1;
        return (
          <div key={cur.id} style={{ pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden", zIndex: 15 }}>
            <div style={{ position: "absolute", top, left: 48, right: 0, height: 21, background: cur.color + "0a", borderLeft: `2px solid ${cur.color}22`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top, left, width: 2, height: 21, background: cur.color, borderRadius: 1, transition: "top .2s ease, left .2s ease", boxShadow: `0 0 6px ${cur.color}88` }} />
            <div style={{ position: "absolute", top: Math.max(0, top - 18), left: Math.max(48, left), background: cur.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: "3px 3px 3px 0", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", pointerEvents: "none", boxShadow: `0 2px 8px ${cur.color}66`, transition: "top .2s ease, left .2s ease", opacity: .95 }}>
              {cur.name.split(" ")[0]}
            </div>
          </div>
        );
      })}
      <div ref={domRef} style={{ height: "100%", width: "100%", overflow: "auto" }} />
    </div>
  );
});

