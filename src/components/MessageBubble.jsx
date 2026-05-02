export default function MessageBubble({ message, isOwn }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && (
        <span className="message-sender">{message.sender_name}</span>
      )}
      <div className="message-bubble">{message.content}</div>
      <span className="message-time">{formatTime(message.created_at)}</span>
    </div>
  );
}
