import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

/**
 * useChat Hook
 * Handles message fetching and real-time subscriptions for a specific channel.
 */
export function useChat(activeChId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load messages
  useEffect(() => {
    if (!activeChId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", activeChId)
        .order("created_at", { ascending: true })
        .limit(200);
      
      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    })();
  }, [activeChId]);

  // Subscribe to changes
  useEffect(() => {
    if (!activeChId) return;

    const channel = supabase.channel(`messages:${activeChId}`)
      .on("postgres_changes", 
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${activeChId}` },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChId]);

  const sendMessage = useCallback(async (content, replyTo = null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase.from("messages").insert({
      channel_id: activeChId,
      user_id: user.id,
      content,
      reply_to: replyTo
    }).select().single();

    return { data, error };
  }, [activeChId]);

  const addReaction = useCallback(async (messageId, emoji) => {
    // Basic reaction logic (could be expanded)
    console.log("Adding reaction:", emoji, "to", messageId);
  }, []);

  return { messages, loading, sendMessage, addReaction };
}
