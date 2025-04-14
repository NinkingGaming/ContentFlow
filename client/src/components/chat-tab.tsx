import { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';

export function ChatTab() {
  const { user } = useAuth();
  const { isConnected, chatMessages, sendChatMessage } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && isConnected) {
      sendChatMessage(messageInput.trim());
      setMessageInput('');
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
        <h2 className="text-lg font-medium">Team Chat</h2>
        <div className="flex items-center">
          <Badge variant={isConnected ? "default" : "destructive"} className={`px-2 py-0.5 text-xs ${isConnected ? 'bg-green-500 hover:bg-green-500/80' : ''}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4 bg-neutral-50">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="font-medium mb-2">No messages yet</h3>
            <p className="text-sm">Be the first to send a message to the team!</p>
          </div>
        ) : (
          chatMessages.map((message) => (
            <ChatMessageItem 
              key={message.id} 
              message={message} 
              isOwnMessage={message.sender.id === user?.id} 
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={!isConnected}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!isConnected || !messageInput.trim()} 
            size="icon"
          >
            {!isConnected ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

function ChatMessageItem({ message, isOwnMessage }: ChatMessageItemProps) {
  const timestamp = new Date(message.timestamp);
  
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} max-w-[80%]`}>
        {!isOwnMessage && (
          <Avatar className="h-8 w-8 mr-2">
            <AvatarFallback style={{ backgroundColor: message.sender.avatarColor }}>
              {message.sender.avatarInitials}
            </AvatarFallback>
          </Avatar>
        )}
        <div className={`${isOwnMessage ? 'mr-2' : 'ml-0'}`}>
          <div className={`rounded-lg px-3 py-2 ${isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-neutral-200 text-neutral-800'}`}>
            <p className="text-sm">{message.content}</p>
          </div>
          <div className={`text-xs text-neutral-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {!isOwnMessage && <span className="font-medium mr-2">{message.sender.displayName}</span>}
            <span>{format(timestamp, 'HH:mm')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}