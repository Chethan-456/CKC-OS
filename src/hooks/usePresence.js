import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";

/**
 * usePresence Hook
 * Handles real-time presence (online users) and typing indicators.
 */
export function usePresence(activeChId) {
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef({});

  useEffect(() => {
    if (!activeChId) return;

    const channel = supabase.channel(`presence:${activeChId}`, {
      config: { presence: { key: "user_id" } }
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = {};
        Object.keys(state).forEach(key => {
          const presence = state[key][0];
          users[presence.user_id] = presence;
        });
        setOnlineUsers(users);
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, isTyping } = payload.payload;
        setTypingUsers(prev => ({ ...prev, [userId]: isTyping }));
        
        if (isTyping) {
          if (typingTimeoutRef.current[userId]) clearTimeout(typingTimeoutRef.current[userId]);
          typingTimeoutRef.current[userId] = setTimeout(() => {
            setTypingUsers(prev => ({ ...prev, [userId]: false }));
          }, 3000);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              user_id: user.id,
              username: user.user_metadata?.username || user.email.split("@")[0],
              online_at: new Date().toISOString()
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChId]);

  const setTyping = useCallback(async (isTyping) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !activeChId) return;

    await supabase.channel(`presence:${activeChId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, isTyping }
    });
  }, [activeChId]);

  return { onlineUsers, typingUsers, setTyping };
}
