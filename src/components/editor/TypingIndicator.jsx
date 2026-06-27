import React, { memo } from "react";
// ═══════════ TYPING INDICATOR ═══════════
function TypingIndicator({ color }) {
  return (
    <span className="presence-typing">
      {[0, 1, 2].map(i => (
        <span key={i} className="typing-dot" style={{ background: color, animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  );
}

