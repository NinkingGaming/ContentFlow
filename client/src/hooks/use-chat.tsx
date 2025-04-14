import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useWebSocket } from './use-websocket';
import { useAuth } from '../lib/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export type ChatMessage = {
  id: number;
  content: string;
  channelId: number;
  sender: {
    id: number;
    username: string;
    displayName: string;
    avatarInitials: string;
    avatarColor: string;
  };
  sentAt: string;
};

export type ChatChannel = {
  id: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  isDirectMessage: boolean;
  createdAt: string;
  createdBy: number;
  members: {
    id: number;
    username: string;
    displayName: string;
    avatarInitials: string;
    avatarColor: string;
    role: string;
    isAdmin?: boolean;
  }[];
};

type ChatContextType = {
  isConnected: boolean;
  channels: ChatChannel[];
  currentChannel: ChatChannel | null;
  setCurrentChannel: (channel: ChatChannel | null) => void;
  chatMessages: ChatMessage[];
  typingUsers: { [userId: number]: { username: string; displayName: string } };
  sendChatMessage: (content: string, channelId?: number) => boolean;
  sendTypingIndicator: (isTyping: boolean, channelId?: number) => boolean;
  createChannel: (channelData: { name: string; description?: string; isPrivate?: boolean; memberIds?: number[] }) => Promise<ChatChannel>;
  createOrGetDirectMessageChannel: (otherUserId: number) => Promise<ChatChannel>;
  joinChannel: (channelId: number) => boolean;
  isLoading: boolean;
  isError: boolean;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentChannel, setCurrentChannel] = useState<ChatChannel | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [userId: number]: { username: string; displayName: string } }>({});
  const { isConnected, messages, sendMessage, authenticate } = useWebSocket();

  // Fetch user's channels
  const { 
    data: channels = [],
    isLoading,
    isError 
  } = useQuery({
    queryKey: ['/api/chat/channels'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/chat/channels', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch channels');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching channels:', error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  // Create a new channel
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: { 
      name: string; 
      description?: string; 
      isPrivate?: boolean;
      memberIds?: number[] 
    }) => {
      const response = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(channelData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create channel');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
    }
  });
  
  // Create or get a DM channel
  const createOrGetDMMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      const response = await fetch('/api/chat/channels/dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ otherUserId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create DM channel');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
    }
  });

  // Authenticate the WebSocket connection when user is available
  useEffect(() => {
    if (isConnected && user) {
      authenticate(user.id, {
        username: user.username,
        displayName: user.displayName,
      });
    }
  }, [isConnected, user, authenticate]);
  
  // Handle incoming messages from WebSocket
  useEffect(() => {
    messages.forEach(msg => {
      switch (msg.type) {
        case 'chat_message':
          // Only add message if it's for the current channel
          if (currentChannel && msg.channelId === currentChannel.id) {
            setChatMessages(prev => {
              // Filter out duplicates based on id
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, {
                id: msg.id,
                content: msg.content,
                channelId: msg.channelId,
                sender: msg.sender,
                sentAt: msg.sentAt
              }];
            });
          }
          break;
        
        case 'message_history':
          // Only set message history if it's for the current channel
          if (currentChannel && msg.channelId === currentChannel.id) {
            setChatMessages(msg.messages || []);
          }
          break;
        
        case 'user_typing':
          // Only show typing indicator for the current channel
          if (currentChannel && msg.channelId === currentChannel.id) {
            if (msg.isTyping) {
              setTypingUsers(prev => ({
                ...prev,
                [msg.user.id]: {
                  username: msg.user.username,
                  displayName: msg.user.displayName
                }
              }));
            } else {
              setTypingUsers(prev => {
                const newTypingUsers = { ...prev };
                delete newTypingUsers[msg.user.id];
                return newTypingUsers;
              });
            }
          }
          break;
          
        default:
          break;
      }
    });
  }, [messages, currentChannel]);
  
  // Clear messages when changing channels
  useEffect(() => {
    if (currentChannel) {
      setChatMessages([]);
      joinChannel(currentChannel.id);
    }
  }, [currentChannel]);
  
  // Join a channel
  const joinChannel = useCallback((channelId: number) => {
    if (!user) return false;
    
    return sendMessage({
      type: 'join_channel',
      channelId
    });
  }, [user, sendMessage]);
  
  // Send a chat message
  const sendChatMessage = useCallback((content: string, channelId?: number) => {
    if (!user || (!channelId && !currentChannel)) return false;
    
    return sendMessage({
      type: 'chat_message',
      channelId: channelId || currentChannel!.id,
      content,
      sender: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarInitials: user.avatarInitials,
        avatarColor: user.avatarColor
      }
    });
  }, [user, currentChannel, sendMessage]);
  
  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean, channelId?: number) => {
    if (!user || (!channelId && !currentChannel)) return false;
    
    return sendMessage({
      type: 'typing',
      channelId: channelId || currentChannel!.id,
      isTyping
    });
  }, [user, currentChannel, sendMessage]);
  
  // Create a new channel
  const createChannel = useCallback(async (channelData: { 
    name: string; 
    description?: string; 
    isPrivate?: boolean;
    memberIds?: number[] 
  }) => {
    return createChannelMutation.mutateAsync(channelData);
  }, [createChannelMutation]);
  
  // Create or get a DM channel
  const createOrGetDirectMessageChannel = useCallback(async (otherUserId: number) => {
    return createOrGetDMMutation.mutateAsync(otherUserId);
  }, [createOrGetDMMutation]);

  return (
    <ChatContext.Provider value={{
      isConnected,
      channels,
      currentChannel,
      setCurrentChannel,
      chatMessages,
      typingUsers,
      sendChatMessage,
      sendTypingIndicator,
      createChannel,
      createOrGetDirectMessageChannel,
      joinChannel,
      isLoading,
      isError
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}