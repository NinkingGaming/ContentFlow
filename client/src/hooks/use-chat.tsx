import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './use-websocket';
import { useAuth } from '../lib/auth';

export type ChatMessage = {
  id: string;
  content: string;
  sender: {
    id: number;
    username: string;
    displayName: string;
    avatarInitials: string;
    avatarColor: string;
  };
  timestamp: string;
};

export function useChat() {
  const { user } = useAuth();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const { isConnected, messages, sendMessage, authenticate } = useWebSocket();

  // Handle incoming messages
  useEffect(() => {
    // Filter for chat messages only
    const chatMsgs = messages.filter(msg => msg.type === 'chat_message');
    
    if (chatMsgs.length > 0) {
      const newMessages = chatMsgs.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp
      }));
      
      setChatMessages(prev => {
        // Filter out duplicates based on id
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
        return [...prev, ...uniqueNewMessages];
      });
    }
  }, [messages]);

  // Authenticate the WebSocket connection when user is available
  useEffect(() => {
    if (isConnected && user) {
      authenticate(user.id, {
        username: user.username,
        displayName: user.displayName,
      });
    }
  }, [isConnected, user, authenticate]);

  // Send a chat message
  const sendChatMessage = useCallback((content: string) => {
    if (!user) return false;
    
    return sendMessage({
      type: 'chat_message',
      content,
      sender: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarInitials: user.avatarInitials,
        avatarColor: user.avatarColor
      }
    });
  }, [user, sendMessage]);

  return {
    isConnected,
    chatMessages,
    sendChatMessage
  };
}