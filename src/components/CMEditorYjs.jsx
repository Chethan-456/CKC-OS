import React, { useEffect, useRef, forwardRef } from "react";
import { EditorState, StateField, StateEffect, RangeSetBuilder, Transaction } from "@codemirror/state";
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
  WidgetType,
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
import { python }     from "@codemirror/lang-python";
import { java }       from "@codemirror/lang-java";
import { cpp }        from "@codemirror/lang-cpp";
import { rust }       from "@codemirror/lang-rust";
import { go }         from "@codemirror/lang-go";
import { sql }        from "@codemirror/lang-sql";
import { oneDark }    from "@codemirror/theme-one-dark";
import { yCollab }    from "y-codemirror.next";

// ── Language map ────────────────────────────────────────────────────────────────
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

// ── "Editing by X…" lock label rendered inline after the locked line ───────────
class LockLabelWidget extends WidgetType {
  constructor(name, color) {
    super();
    this.name  = name;
    this.color = color;
  }
  eq(other) { return this.name === other.name && this.color === other.color; }
  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-lock-label";
    el.setAttribute("aria-hidden", "true");
    el.textContent = `🔒 ${this.name}`;
    el.style.cssText = [
      `color:${this.color}`,
      "font-size:10px",
      "font-family:Inter,sans-serif",
      "font-weight:600",
      `background:${this.color}22`,
      `border:1px solid ${this.color}44`,
      "padding:1px 7px",
      "border-radius:3px",
      "margin-left:10px",
      "pointer-events:none",
      "user-select:none",
      "white-space:nowrap",
      "vertical-align:middle",
    ].join(";");
    return el;
  }
  ignoreEvent() { return true; }
}

// ── StateEffect/Field for remote locks: Map<lineNumber, {uid,name,color}> ───────
const setLocksEffect = StateEffect.define();

const locksField = StateField.define({
  create: () => new Map(),
  update(locks, tr) {
    for (const e of tr.effects) {
      if (e.is(setLocksEffect)) return e.value;
    }
    return locks;
  },
});

/**
 * CMEditorYjs
 * -----------
 * Full-featured collaborative CodeMirror 6 editor.
 *
 * Collaboration features:
 *   ✔ Real-time text sync (Yjs CRDT via yCollab)
 *   ✔ Remote cursors + name labels + unique colors (yCollab awareness)
 *   ✔ Remote text selection highlighting
 *   ✔ Per-user active-line highlight (colored left border)
 *   ✔ Line locking — block edits on lines held by another user
 *   ✔ "🔒 Alice" inline label on locked lines
 *   ✔ Typing indicator broadcast via awareness
 *   ✔ Local lock acquire on keystroke, release on cursor-line change
 *
 * Props:
 *   lang          – ts|js|py|java|cpp|rs|go|sql
 *   fileKey       – unique key per tab (= Y.Text name)
 *   ytext         – Y.Text from provider.doc.getText(fileKey)
 *   awareness     – Awareness from SupabaseYjsProvider
 *   onTextChange  – (code:string) => void
 *   onCursorMove  – (line:number, col:number) => void
 *   onTyping      – (isTyping:boolean) => void
 *   readOnly      – optional boolean
 */
const CMEditorYjs = forwardRef(
  (
    {
      lang = "ts",
      fileKey,
      ytext,
      awareness,
      onTextChange,
      onCursorMove,
      onTyping,
      readOnly = false,
    },
    ref
  ) => {
    const domRef  = useRef(null);
    const viewRef = useRef(null);

    // Expose getText() via ref
    useEffect(() => {
      const api = {
        _getText: () =>
          viewRef.current?.state.doc.toString() ?? ytext?.toString() ?? "",
      };
      if (ref) typeof ref === "function" ? ref(api) : (ref.current = api);
    });

    useEffect(() => {
      if (!domRef.current || !ytext || !awareness) return;

      const localClientId = awareness.doc.clientID;

      // ── 1. VS Code dark theme ──────────────────────────────────────────────
      const editorTheme = EditorView.theme(
        {
          "&": {
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
            height: "100%",
            fontSize: "13.5px",
          },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": {
            caretColor: "#aeafad",
            fontFamily:
              "'JetBrains Mono','Cascadia Code',Consolas,'Courier New',monospace",
            fontSize: "13.5px",
            lineHeight: "21px",
            padding: "8px 0",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "#aeafad",
            borderLeftWidth: "2px",
          },
          ".cm-activeLine":    { backgroundColor: "rgba(255,255,255,.04)" },
          ".cm-selectionBackground": {
            backgroundColor: "rgba(38,79,120,.7) !important",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "rgba(38,79,120,.8) !important",
          },
          ".cm-gutters": {
            backgroundColor: "#1e1e1e",
            borderRight: "1px solid rgba(255,255,255,.06)",
            color: "#5a5a5a",
            minWidth: "52px",
          },
          ".cm-lineNumbers .cm-gutterElement": {
            minWidth: "42px",
            textAlign: "right",
            paddingRight: "12px",
            fontSize: "12px",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "rgba(255,255,255,.04)",
            color: "#bdbdbd",
          },
          ".cm-matchingBracket": {
            backgroundColor: "rgba(79,193,255,.2)",
            color: "#fff !important",
          },
          ".cm-tooltip": {
            backgroundColor: "#252526",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: "6px",
            color: "#e0e0e0",
          },
          ".cm-tooltip-autocomplete ul li[aria-selected]": {
            backgroundColor: "rgba(14,99,156,.6)",
          },
          // y-codemirror.next remote cursor name label
          ".cm-ySelectionInfo": {
            fontFamily: "Inter,sans-serif",
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 7px 2px 7px",
            borderRadius: "3px 3px 3px 0",
            whiteSpace: "nowrap",
            opacity: 0.95,
            zIndex: 9999,
          },
        },
        { dark: true }
      );

      // ── 2. Lock decorations ────────────────────────────────────────────────
      // Renders: colored left border + "🔒 Alice" inline widget on locked lines
      const lockDecorations = EditorView.decorations.compute(
        [locksField],
        (state) => {
          const locks   = state.field(locksField);
          const builder = new RangeSetBuilder();

          const sorted = [...locks.entries()].sort((a, b) => a[0] - b[0]);
          for (const [lineNum, lock] of sorted) {
            if (lineNum < 1 || lineNum > state.doc.lines) continue;
            try {
              const { from, to } = state.doc.line(lineNum);
              // Colored left border on the line
              builder.add(
                from,
                from,
                Decoration.line({
                  attributes: {
                    style: `border-left:3px solid ${lock.color}; background:${lock.color}0a; padding-left:2px;`,
                    "data-lock": "true",
                  },
                })
              );
              // "🔒 Alice" widget at end of line
              builder.add(
                to,
                to,
                Decoration.widget({
                  widget: new LockLabelWidget(lock.name, lock.color),
                  side: 1,
                })
              );
            } catch { /* line out of range */ }
          }
          return builder.finish();
        }
      );

      // ── 3. Remote active-line highlight (per user color) ──────────────────
      const remoteLineHighlighter = ViewPlugin.fromClass(
        class {
          constructor(view) {
            this.decorations = this._build(view);
            this._onAwareness = () => view.dispatch({ effects: [] });
            awareness.on("change", this._onAwareness);
          }
          update(upd) {
            if (upd.docChanged || upd.selectionSet || upd.viewportChanged) {
              this.decorations = this._build(upd.view);
            }
          }
          destroy() { awareness.off("change", this._onAwareness); }
          _build(view) {
            const builder = new RangeSetBuilder();
            const rows    = [];
            for (const [clientId, s] of awareness.getStates()) {
              if (clientId === localClientId) continue;
              if (s.cursor?.tabId === fileKey && s.user?.color && s.cursor.line) {
                rows.push({ lineNum: s.cursor.line, color: s.user.color });
              }
            }
            rows.sort((a, b) => a.lineNum - b.lineNum);
            for (const { lineNum, color } of rows) {
              try {
                if (lineNum >= 1 && lineNum <= view.state.doc.lines) {
                  const { from } = view.state.doc.line(lineNum);
                  builder.add(
                    from,
                    from,
                    Decoration.line({
                      attributes: {
                        style: `background:${color}0c;`,
                      },
                    })
                  );
                }
              } catch { /* ignore */ }
            }
            return builder.finish();
          }
        },
        { decorations: (v) => v.decorations }
      );

      // ── 4. Transaction filter — block edits on remotely-locked lines ───────
      const lineLockFilter = EditorState.transactionFilter.of((tr) => {
        if (!tr.docChanged) return tr;
        // Do NOT block transactions that come from remote syncing (Yjs / yCollab / remote changes)
        if (tr.annotation(Transaction.remote)) return tr;
        
        // Also check if there's any Yjs specific annotation to be safe
        const isRemoteYjs = tr.annotations.some(ann => {
          try {
            return ann.value === "y-sync" || (ann.value && ann.value.constructor && ann.value.constructor.name === "YSyncAnnotation");
          } catch { return false; }
        });
        if (isRemoteYjs) return tr;

        const locks = tr.startState.field(locksField);
        if (!locks.size) return tr;
        let blocked = false;
        tr.changes.iterChangedRanges((fromA) => {
          if (blocked) return;
          try {
            const lineNum = tr.startState.doc.lineAt(fromA).number;
            const lock    = locks.get(lineNum);
            if (lock && lock.uid !== String(localClientId)) blocked = true;
          } catch { /* ignore */ }
        });
        // Return empty array to cancel the transaction
        return blocked ? [] : tr;
      });

      // ── 5. Local typing state ─────────────────────────────────────────────
      let lockReleaseTimer  = null;
      let typingTimer       = null;
      let lockedLine        = null; // currently held line number

      const acquireLock = (lineNum) => {
        if (lockedLine === lineNum) return;
        // Release previous lock
        if (lockedLine !== null) {
          awareness.setLocalStateField("lock", { active: false, tabId: fileKey });
        }
        lockedLine = lineNum;
        awareness.setLocalStateField("lock", {
          active: true,
          line:   lineNum,
          tabId:  fileKey,
        });
      };

      const releaseLock = () => {
        lockedLine = null;
        awareness.setLocalStateField("lock", { active: false, tabId: fileKey });
      };

      // ── 6. Change + cursor listener ───────────────────────────────────────
      const changeListener = EditorView.updateListener.of((upd) => {
        // Cursor / selection moved
        if (upd.selectionSet) {
          const pos     = upd.state.selection.main.head;
          const ln      = upd.state.doc.lineAt(pos);
          const lineNum = ln.number;
          const col     = pos - ln.from + 1;
          onCursorMove?.(lineNum, col);

          // Release lock if cursor moved OFF the locked line
          if (lockedLine !== null && lockedLine !== lineNum) {
            clearTimeout(lockReleaseTimer);
            releaseLock();
          }
        }

        // Doc changed — acquire lock + typing indicator
        if (upd.docChanged) {
          const pos     = upd.state.selection.main.head;
          const lineNum = upd.state.doc.lineAt(pos).number;

          acquireLock(lineNum);

          // Typing indicator: true
          clearTimeout(typingTimer);
          awareness.setLocalStateField("typing", true);
          onTyping?.(true);

          // Auto-release lock + typing after 2 s of inactivity
          clearTimeout(lockReleaseTimer);
          lockReleaseTimer = setTimeout(() => {
            releaseLock();
            awareness.setLocalStateField("typing", false);
            onTyping?.(false);
          }, 2000);

          // Notify parent of content
          onTextChange?.(upd.state.doc.toString());
        }
      });

      // ── 7. Awareness → update locks StateField ────────────────────────────
      const syncLocks = () => {
        const newLocks = new Map();
        for (const [clientId, s] of awareness.getStates()) {
          if (clientId === localClientId) continue;
          if (
            s.lock?.active &&
            s.lock?.tabId === fileKey &&
            s.cursor?.line &&
            s.user
          ) {
            newLocks.set(s.cursor.line, {
              uid:   String(clientId),
              name:  s.user.name  || "Someone",
              color: s.user.color || "#4FC1FF",
            });
          }
        }
        viewRef.current?.dispatch({ effects: setLocksEffect.of(newLocks) });
      };
      awareness.on("change", syncLocks);

      // ── 8. Assemble all extensions ────────────────────────────────────────
      const buildExtensions = (lk) => {
        const exts = [
          locksField,                         // lock state field (must be first)
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
          // ── Collaboration ──
          yCollab(ytext, awareness),    // CRDT sync + remote cursors/selections
          remoteLineHighlighter,        // per-user active-line background
          lockDecorations,              // border + "🔒 Alice" on locked lines
          lineLockFilter,               // block edits on remote locks
        ];
        if (readOnly) exts.push(EditorView.editable.of(false));
        return exts;
      };

      // ── 9. Mount ──────────────────────────────────────────────────────────
      const view = new EditorView({
        state: EditorState.create({
          doc: ytext.toString(),
          extensions: buildExtensions(lang),
        }),
        parent: domRef.current,
      });
      viewRef.current = view;

      return () => {
        clearTimeout(lockReleaseTimer);
        clearTimeout(typingTimer);
        releaseLock();
        awareness.setLocalStateField("typing", false);
        awareness.off("change", syncLocks);
        view.destroy();
        viewRef.current = null;
      };
    // Re-create editor when tab, lang, or Yjs bindings change
    }, [fileKey, lang, ytext, awareness]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div
        ref={domRef}
        style={{ height: "100%", width: "100%", overflow: "hidden" }}
      />
    );
  }
);

CMEditorYjs.displayName = "CMEditorYjs";
export default CMEditorYjs;