import React, { useEffect, useRef, forwardRef } from "react";

/**
 * CMEditorYjs
 * -----------
 * Drop-in replacement for the old inline `CMEditor` in EditorPage.jsx.
 * Binds CodeMirror 6 directly to a shared Y.Text via y-codemirror.next's
 * `yCollab`, which gives conflict-free concurrent editing plus live
 * remote cursors/selections with per-user color + name label, all
 * without any manual op-diffing or line-lock bookkeeping.
 *
 * Props:
 *   lang        - language key (ts/js/py/java/cpp/rs/go/sql)
 *   fileKey     - unique key per open tab (also used as the Y.Text name)
 *   ytext       - the Y.Text instance backing this tab (from getYText)
 *   awareness   - the shared y-protocols Awareness instance
 *   onTextChange(code) - optional, called after any doc change (local or remote)
 *   onCursorMove(line, col) - optional, called on local selection change
 *   readOnly    - optional
 */
const CMEditorYjs = forwardRef(({ lang, fileKey, ytext, awareness, onTextChange, onCursorMove, readOnly = false }, ref) => {
  const domRef = useRef(null);
  const viewRef = useRef(null);
  const inited = useRef(false);

  useEffect(() => {
    const api = {
      _getText: () => viewRef.current?.state.doc.toString() ?? ytext?.toString() ?? "",
    };
    if (ref) { typeof ref === "function" ? ref(api) : (ref.current = api); }
  });

  useEffect(() => {
    if (!domRef.current || !ytext || !awareness) return;
    inited.current = true;
    let destroyed = false;

    (async () => {
      try {
        const [
          { EditorState },
          {
            EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
            drawSelection, dropCursor, rectangularSelection, crosshairCursor,
            highlightSpecialChars, indentOnInput,
          },
          { defaultKeymap, history, historyKeymap, indentWithTab },
          { searchKeymap, highlightSelectionMatches },
          { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap },
          { foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle },
          { javascript }, { python }, { java }, { cpp }, { rust }, { go }, { sql },
          { oneDark },
          { yCollab },
        ] = await Promise.all([
          import("https://esm.sh/@codemirror/state@6.4.1"),
          import("https://esm.sh/@codemirror/view@6.26.3"),
          import("https://esm.sh/@codemirror/commands@6.6.0"),
          import("https://esm.sh/@codemirror/search@6.5.6"),
          import("https://esm.sh/@codemirror/autocomplete@6.17.0"),
          import("https://esm.sh/@codemirror/language@6.10.2"),
          import("https://esm.sh/@codemirror/lang-javascript@6.2.2"),
          import("https://esm.sh/@codemirror/lang-python@6.1.6"),
          import("https://esm.sh/@codemirror/lang-java@6.0.1"),
          import("https://esm.sh/@codemirror/lang-cpp@6.0.2"),
          import("https://esm.sh/@codemirror/lang-rust@6.0.1"),
          import("https://esm.sh/@codemirror/lang-go@6.0.0"),
          import("https://esm.sh/@codemirror/lang-sql@6.8.0"),
          import("https://esm.sh/@codemirror/theme-one-dark@6.1.2"),
          import("https://esm.sh/y-codemirror.next@0.3.2"),
        ]);

        if (destroyed) return;

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
          // y-codemirror.next remote cursor/selection styling
          ".cm-ySelectionInfo": { fontFamily: "Inter,sans-serif", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px 3px 3px 0", whiteSpace: "nowrap", opacity: 0.95 },
        }, { dark: true });

        const listener = EditorView.updateListener.of(upd => {
          if (upd.selectionSet) {
            const pos = upd.state.selection.main.head;
            const ln = upd.state.doc.lineAt(pos);
            onCursorMove?.(ln.number, pos - ln.from + 1);
          }
          if (upd.docChanged) {
            onTextChange?.(upd.state.doc.toString());
          }
        });

        const mkExt = lk => {
          const b = [
            lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), highlightSpecialChars(),
            history(), foldGutter(), drawSelection(), dropCursor(), bracketMatching(), closeBrackets(),
            autocompletion(), rectangularSelection(), crosshairCursor(), highlightSelectionMatches(),
            indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            keymap.of([indentWithTab, ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap]),
            LM[lk] || LM.ts, oneDark, theme, listener, EditorView.lineWrapping,
            yCollab(ytext, awareness),
          ];
          if (readOnly) b.push(EditorView.editable.of(false));
          return b;
        };

        const view = new EditorView({
          state: EditorState.create({ doc: ytext.toString(), extensions: mkExt(lang) }),
          parent: domRef.current,
        });
        viewRef.current = view;
      } catch (err) {
        // Fallback: plain textarea bound to the Y.Text via direct observe/transact,
        // for environments where the CDN ES module imports fail.
        if (domRef.current && !destroyed) {
          domRef.current.innerHTML = "";
          const ta = document.createElement("textarea");
          ta.value = ytext.toString();
          ta.style.cssText = "width:100%;height:100%;background:#0d0f14;color:#d4d4d4;font-family:'JetBrains Mono',monospace;font-size:13.5px;line-height:21px;padding:8px 14px;border:none;outline:none;resize:none;tab-size:4;";
          let applyingRemote = false;
          const observer = () => {
            if (applyingRemote) return;
            const sel = { start: ta.selectionStart, end: ta.selectionEnd };
            ta.value = ytext.toString();
            ta.selectionStart = sel.start; ta.selectionEnd = sel.end;
          };
          ytext.observe(observer);
          if (!readOnly) {
            ta.addEventListener("input", () => {
              applyingRemote = true;
              ytext.doc.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, ta.value);
              });
              applyingRemote = false;
              onTextChange?.(ta.value);
            });
          }
          domRef.current.appendChild(ta);
          if (ref) {
            const api = { _getText: () => ta.value };
            typeof ref === "function" ? ref(api) : (ref.current = api);
          }
        }
      }
    })();

    return () => {
      destroyed = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      inited.current = false;
    };
    // Re-create the view when the file (Y.Text) or language changes —
    // each tab gets its own CodeMirror instance, matching the old
    // `key={activeTab}` remount pattern in EditorPage.jsx.
  }, [fileKey, lang, ytext, awareness]);

  return <div ref={domRef} style={{ height: "100%", width: "100%", overflow: "auto" }} />;
});

export default CMEditorYjs;