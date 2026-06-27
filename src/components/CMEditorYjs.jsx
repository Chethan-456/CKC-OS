import React, { useEffect, useRef, forwardRef } from "react";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightSpecialChars,
  ViewPlugin,
  Decoration,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import {
  foldGutter,
  foldKeymap,
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
  indentOnInput,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { yCollab } from "y-codemirror.next";

/**
 * CMEditorYjs
 * -----------
 * CodeMirror 6 + Yjs collaborative editor.
 * - Real-time text sync via yCollab (CRDT — no conflicts, no overwrite)
 * - Remote cursors + name labels via y-codemirror.next awareness
 * - Remote active-line highlights per user color
 * - Syntax highlighting for ts/js/py/java/cpp/rs/go/sql
 *
 * Props:
 *   lang          – language key (ts/js/py/java/cpp/rs/go/sql)
 *   fileKey       – unique key per open tab (also the Y.Text name)
 *   ytext         – Y.Text instance from provider.doc.getText(fileKey)
 *   awareness     – shared Awareness instance from SupabaseYjsProvider
 *   onTextChange  – called after any change with full doc string
 *   onCursorMove  – called with (line, col) on cursor movement
 *   readOnly      – optional, disables editing
 */
const CMEditorYjs = forwardRef(
  ({ lang, fileKey, ytext, awareness, onTextChange, onCursorMove, readOnly = false }, ref) => {
    const domRef = useRef(null);
    const viewRef = useRef(null);

    // Expose a stable getText() API via ref
    useEffect(() => {
      const api = {
        _getText: () => viewRef.current?.state.doc.toString() ?? ytext?.toString() ?? "",
      };
      if (ref) {
        if (typeof ref === "function") ref(api);
        else ref.current = api;
      }
    });

    useEffect(() => {
      if (!domRef.current || !ytext || !awareness) return;

      const LM = {
        ts:   javascript({ typescript: true }),
        js:   javascript(),
        py:   python(),
        java: java(),
        cpp:  cpp(),
        rs:   rust(),
        go:   go(),
        sql:  sql(),
      };

      // ── Dark theme matching the CKC-OS design language ──────────────
      const editorTheme = EditorView.theme(
        {
          "&": {
            backgroundColor: "#0d0f14",
            color: "#d4d4d4",
            height: "100%",
            fontSize: "13.5px",
          },
          ".cm-content": {
            caretColor: "#4FC1FF",
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            fontSize: "13.5px",
            lineHeight: "21px",
            padding: "8px 0",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "#4FC1FF",
            borderLeftWidth: "2px",
          },
          ".cm-activeLine":            { backgroundColor: "rgba(79,193,255,.04)" },
          ".cm-selectionBackground":   { backgroundColor: "rgba(79,193,255,.18) !important" },
          "&.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(79,193,255,.22) !important" },
          ".cm-gutters": {
            backgroundColor: "#0d0f14",
            borderRight: "1px solid rgba(255,255,255,.05)",
            color: "#4a5568",
            minWidth: "48px",
          },
          ".cm-lineNumbers .cm-gutterElement": {
            minWidth: "38px",
            textAlign: "right",
            paddingRight: "10px",
          },
          ".cm-activeLineGutter":    { backgroundColor: "rgba(79,193,255,.04)", color: "#8892a4" },
          ".cm-matchingBracket":     { backgroundColor: "rgba(79,193,255,.15)", color: "#fff !important" },
          ".cm-tooltip": {
            backgroundColor: "#1c1f28",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: "6px",
            color: "#e0e0e0",
          },
          ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "rgba(79,193,255,.15)" },
          // y-codemirror.next renders a small name tag above each remote cursor
          ".cm-ySelectionInfo": {
            fontFamily: "Inter, sans-serif",
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: "3px 3px 3px 0",
            whiteSpace: "nowrap",
            opacity: 0.95,
          },
        },
        { dark: true }
      );

      // ── Notify parent on cursor + doc changes ───────────────────────
      const changeListener = EditorView.updateListener.of((upd) => {
        if (upd.selectionSet) {
          const pos = upd.state.selection.main.head;
          const ln  = upd.state.doc.lineAt(pos);
          onCursorMove?.(ln.number, pos - ln.from + 1);
        }
        if (upd.docChanged) {
          onTextChange?.(upd.state.doc.toString());
        }
      });

      // ── Highlight each remote user's active line with their color ───
      const remoteLineHighlighter = ViewPlugin.fromClass(
        class {
          constructor(view) {
            this.decorations = this._build(view);
            // Re-render when any peer's awareness changes
            this._onAwareness = () => view.dispatch({ effects: [] });
            awareness.on("change", this._onAwareness);
          }

          update(update) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
              this.decorations = this._build(update.view);
            }
          }

          destroy() {
            awareness.off("change", this._onAwareness);
          }

          _build(view) {
            const builder = new RangeSetBuilder();
            const localId  = awareness.doc.clientID;
            const highlights = [];

            for (const [clientId, state] of awareness.getStates()) {
              if (clientId === localId) continue;
              if (state.cursor?.tabId === fileKey && state.user?.color && state.cursor.line) {
                highlights.push({ lineNum: state.cursor.line, color: state.user.color });
              }
            }

            highlights.sort((a, b) => a.lineNum - b.lineNum);

            for (const { lineNum, color } of highlights) {
              try {
                if (lineNum <= view.state.doc.lines) {
                  const { from } = view.state.doc.line(lineNum);
                  builder.add(
                    from, from,
                    Decoration.line({
                      attributes: {
                        style: `background-color:${color}18; border-left:3px solid ${color}`,
                      },
                    })
                  );
                }
              } catch { /* line out of range — ignore */ }
            }

            return builder.finish();
          }
        },
        { decorations: (v) => v.decorations }
      );

      // ── Assemble all extensions ─────────────────────────────────────
      const buildExtensions = (lk) => {
        const exts = [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          rectangularSelection(),
          crosshairCursor(),
          highlightSelectionMatches(),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([
            indentWithTab,
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
          ]),
          LM[lk] || LM.ts,
          oneDark,
          editorTheme,
          changeListener,
          EditorView.lineWrapping,
          // 🔑 Collaborative editing CRDT + remote cursors/selections:
          yCollab(ytext, awareness),
          // 🔑 Remote active-line highlights:
          remoteLineHighlighter,
        ];
        if (readOnly) exts.push(EditorView.editable.of(false));
        return exts;
      };

      // ── Mount the editor ────────────────────────────────────────────
      const view = new EditorView({
        state: EditorState.create({
          doc: ytext.toString(),
          extensions: buildExtensions(lang),
        }),
        parent: domRef.current,
      });
      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    // Re-create the editor when tab (fileKey), language, or sync bindings change
    }, [fileKey, lang, ytext, awareness]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div
        ref={domRef}
        style={{ height: "100%", width: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}
      />
    );
  }
);

CMEditorYjs.displayName = "CMEditorYjs";
export default CMEditorYjs;