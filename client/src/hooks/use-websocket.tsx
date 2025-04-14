import { useState, useEffect, useRef, useCallback } from 'react';

type Message = {
  type: string;
  [key: string]: any;
};

type WebSocketOptions = {
  reconnectInterval?: number;
  reconnectAttempts?: number;
};

const defaultOptions: WebSocketOptions = {
  reconnectInterval: 3000,
  reconnectAttempts: 10
};

export function useWebSocket(options = defaultOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to the WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket at:', wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Connection opened
      socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setConnectionAttempts(0);
      });
      
      // Listen for messages
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages(prev => [...prev, data]);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      // Connection closed
      socket.addEventListener('close', () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        
        // Try to reconnect if not at max attempts
        if (connectionAttempts < (options.reconnectAttempts || defaultOptions.reconnectAttempts!)) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, options.reconnectInterval || defaultOptions.reconnectInterval);
        }
      });
      
      // Connection error
      socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [options, connectionAttempts]);
  
  // Send a message through the WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // Authenticate the WebSocket connection with user info
  const authenticate = useCallback((userId: number, userData: any) => {
    return sendMessage({
      type: 'auth',
      userId,
      ...userData
    });
  }, [sendMessage]);
  
  // Clean up WebSocket connection on unmount
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);
  
  return {
    isConnected,
    messages,
    sendMessage,
    authenticate
  };
}