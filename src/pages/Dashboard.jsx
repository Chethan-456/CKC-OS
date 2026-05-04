import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase.js';
import ThemeToggle from '../components/ThemeToggle';
import MessageBubble from '../components/MessageBubble';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const username =
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'Anonymous';

  const userInitial = username.charAt(0).toUpperCase();

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch message history
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
      }
      setLoadingMessages(false);
    };

    fetchMessages();
  }, []);

  // Subscribe to real-time new messages
  useEffect(() => {
    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom(loadingMessages ? 'instant' : 'smooth');
  }, [messages, loadingMessages, scrollToBottom]);

  // Auto-focus input after loading
  useEffect(() => {
    if (!loadingMessages) {
      inputRef.current?.focus();
    }
  }, [loadingMessages]);

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    setNewMessage('');

    const { error } = await supabase.from('messages').insert([
      {
        content,
        sender_id: user.id,
        sender_name: username,
      },
    ]);

    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(content); // Restore on failure
    }
    setSending(false);
    inputRef.current?.focus();
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  // Group messages by date for separators
  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderMessages = () => {
    let lastDate = '';

    return messages.map((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();
      let showDateSep = false;
      if (msgDate !== lastDate) {
        showDateSep = true;
        lastDate = msgDate;
      }

      return (
        <div key={msg.id}>
          {showDateSep && (
            <div className="date-separator">
              {getDateLabel(msg.created_at)}
            </div>
          )}
          <MessageBubble message={msg} isOwn={msg.sender_id === user.id} />
        </div>
      );
    });
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="header-logo">💬</span>
          <div>
            <h1 className="header-title gradient-text">ChatFlow</h1>
            <div className="header-status">Live</div>
          </div>
        </div>

        <div className="header-right">
          <div className="header-user">
            <div className="header-user-avatar">{userInitial}</div>
            <span>{username}</span>
          </div>
          <ThemeToggle />
          <button
            className="btn btn-ghost"
            onClick={handleSignOut}
            id="signout-btn"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="chat-container">
        <div className="chat-messages">
          {loadingMessages ? (
            <div className="chat-empty">
              <div className="spinner spinner-lg"></div>
              <span className="chat-empty-sub">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">✨</div>
              <span className="chat-empty-text">No messages yet</span>
              <span className="chat-empty-sub">
                Be the first to say hello!
              </span>
            </div>
          ) : (
            renderMessages()
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="chat-input-area">
          <form className="chat-input-wrapper" onSubmit={handleSend}>
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              id="message-input"
              autoComplete="off"
              maxLength={2000}
            />
            <button
              className="chat-send-btn"
              type="submit"
              disabled={!newMessage.trim() || sending}
              id="send-message-btn"
              aria-label="Send message"
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
