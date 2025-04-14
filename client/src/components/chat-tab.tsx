import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat, ChatMessage, ChatChannel } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Send, 
  Plus, 
  User, 
  Users, 
  Hash, 
  Lock, 
  Search,
  MessageSquare,
  ChevronDown,
  Settings
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Main Chat Tab Component
export function ChatTab() {
  const { user } = useAuth();
  const { 
    isConnected, 
    channels, 
    currentChannel, 
    setCurrentChannel, 
    chatMessages, 
    typingUsers,
    sendChatMessage,
    sendTypingIndicator,
    isLoading 
  } = useChat();
  
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get list of users for direct messaging
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/users', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  // Filter out the current user from DM options
  const otherUsers = useMemo(() => {
    return users.filter((u: any) => u.id !== user?.id);
  }, [users, user]);
  
  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  // Automatically select the first channel if none is selected
  useEffect(() => {
    if (channels.length > 0 && !currentChannel) {
      setCurrentChannel(channels[0]);
    }
  }, [channels, currentChannel, setCurrentChannel]);
  
  // Handle typing indicator
  const handleTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Send typing indicator
    sendTypingIndicator(true);
    
    // Clear typing indicator after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
    
    setTypingTimeout(timeout);
  };
  
  // Handle sending message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && isConnected && currentChannel) {
      sendChatMessage(messageInput.trim());
      setMessageInput('');
      
      // Clear typing indicator
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      sendTypingIndicator(false);
    }
  };
  
  // Create formatted typing indicator text
  const typingIndicatorText = useMemo(() => {
    const typingUsersList = Object.values(typingUsers);
    if (typingUsersList.length === 0) return null;
    
    if (typingUsersList.length === 1) {
      return `${typingUsersList[0].displayName} is typing...`;
    } else if (typingUsersList.length === 2) {
      return `${typingUsersList[0].displayName} and ${typingUsersList[1].displayName} are typing...`;
    } else {
      return `${typingUsersList[0].displayName} and ${typingUsersList.length - 1} others are typing...`;
    }
  }, [typingUsers]);
  
  return (
    <div className="flex h-full">
      {/* Channel Sidebar */}
      <div className="w-64 border-r flex flex-col bg-white">
        <div className="p-3 border-b flex justify-between items-center">
          <h3 className="font-semibold text-lg">Channels</h3>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Channel</DialogTitle>
                <DialogDescription>
                  Create a new chat channel for your team
                </DialogDescription>
              </DialogHeader>
              <ChatChannelDialog />
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search channels" 
                  className="h-8 text-sm pl-8"
                />
              </div>
            </div>
            
            {/* Channel Groups */}
            <div className="mt-2">
              {/* Direct Messages */}
              <div className="px-3 py-1.5">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Direct Messages
                </h4>
              </div>
              
              <div className="space-y-0.5">
                {channels
                  .filter(channel => channel.isDirectMessage)
                  .map(channel => (
                    <ChannelItem 
                      key={channel.id} 
                      channel={channel} 
                      isActive={currentChannel?.id === channel.id}
                      onClick={() => setCurrentChannel(channel)}
                    />
                  ))
                }
                
                <NewDirectMessageButton users={otherUsers} />
              </div>
              
              {/* Regular Channels */}
              <div className="px-3 py-1.5 mt-3">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Channels
                </h4>
              </div>
              
              <div className="space-y-0.5">
                {channels
                  .filter(channel => !channel.isDirectMessage)
                  .map(channel => (
                    <ChannelItem 
                      key={channel.id} 
                      channel={channel} 
                      isActive={currentChannel?.id === channel.id}
                      onClick={() => setCurrentChannel(channel)}
                    />
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Channel Header */}
        {currentChannel && (
          <div className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <div className="mr-2">
                {currentChannel.isDirectMessage ? (
                  <Avatar className="h-7 w-7">
                    <AvatarFallback>
                      {getDMPartnerInitials(currentChannel, user?.id)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-7 w-7 rounded-md bg-neutral-100 flex items-center justify-center">
                    {currentChannel.isPrivate ? (
                      <Lock className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <Hash className="h-4 w-4 text-neutral-500" />
                    )}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-medium">
                  {currentChannel.isDirectMessage
                    ? getDMPartnerName(currentChannel, user?.id)
                    : currentChannel.name
                  }
                </h2>
                {currentChannel.description && (
                  <p className="text-xs text-neutral-500">{currentChannel.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ChannelSettingsButton channel={currentChannel} />
              <Badge 
                variant={isConnected ? "default" : "destructive"} 
                className={`px-2 py-0.5 text-xs ${isConnected ? 'bg-green-500 hover:bg-green-500/80' : ''}`}
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Messages Area */}
        {currentChannel ? (
          <>
            <div className="flex-1 overflow-auto px-4 py-3 space-y-4 bg-neutral-50">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="font-medium mb-2">No messages yet</h3>
                  <p className="text-sm">
                    {currentChannel.isDirectMessage
                      ? `Start a conversation with ${getDMPartnerName(currentChannel, user?.id)}`
                      : `Be the first to send a message to ${currentChannel.name}`
                    }
                  </p>
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
            
            {/* Typing Indicator */}
            {typingIndicatorText && (
              <div className="px-4 py-1 text-xs text-neutral-500 bg-neutral-50 border-t">
                {typingIndicatorText}
              </div>
            )}
            
            {/* Message Input */}
            <div className="border-t p-4 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <Input
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  placeholder={`Message ${currentChannel.isDirectMessage 
                    ? getDMPartnerName(currentChannel, user?.id) 
                    : `#${currentChannel.name}`}`}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-medium mb-2">No Channel Selected</h3>
              <p className="text-sm text-neutral-500">Select a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to get the name of the DM partner
function getDMPartnerName(channel: ChatChannel, currentUserId?: number): string {
  if (!channel.isDirectMessage || !currentUserId) return channel.name;
  
  const partner = channel.members.find(member => member.id !== currentUserId);
  return partner ? partner.displayName : 'Unknown User';
}

// Helper to get the initials of the DM partner
function getDMPartnerInitials(channel: ChatChannel, currentUserId?: number): string {
  if (!channel.isDirectMessage || !currentUserId) return 'CH';
  
  const partner = channel.members.find(member => member.id !== currentUserId);
  return partner?.avatarInitials || 'U';
}

// Chat Channel Item Component
interface ChannelItemProps {
  channel: ChatChannel;
  isActive: boolean;
  onClick: () => void;
}

function ChannelItem({ channel, isActive, onClick }: ChannelItemProps) {
  const { user } = useAuth();
  
  return (
    <div 
      className={`px-3 py-1.5 rounded-md cursor-pointer flex items-center ${
        isActive 
          ? 'bg-neutral-100' 
          : 'hover:bg-neutral-50'
      }`}
      onClick={onClick}
    >
      {channel.isDirectMessage ? (
        <Avatar className="h-6 w-6 mr-2">
          <AvatarFallback style={{ 
            backgroundColor: getDMPartnerColor(channel, user?.id) 
          }}>
            {getDMPartnerInitials(channel, user?.id)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-6 w-6 mr-2 flex items-center justify-center">
          {channel.isPrivate ? (
            <Lock className="h-3.5 w-3.5 text-neutral-500" />
          ) : (
            <Hash className="h-3.5 w-3.5 text-neutral-500" />
          )}
        </div>
      )}
      <span className="text-sm truncate">
        {channel.isDirectMessage 
          ? getDMPartnerName(channel, user?.id)
          : channel.name
        }
      </span>
    </div>
  );
}

// Helper to get the avatar color of the DM partner
function getDMPartnerColor(channel: ChatChannel, currentUserId?: number): string {
  if (!channel.isDirectMessage || !currentUserId) return '#64748b';
  
  const partner = channel.members.find(member => member.id !== currentUserId);
  return partner?.avatarColor || '#64748b';
}

// New DM button component
function NewDirectMessageButton({ users }: { users: any[] }) {
  const { createOrGetDirectMessageChannel, setCurrentChannel } = useChat();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // State for dialog open/close
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter out the current user from the list
  const filteredUsers = users.filter(user => user.id !== currentUser?.id);
  
  const handleStartDM = async (userId: number) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Error",
        description: "You cannot create a direct message with yourself",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const channel = await createOrGetDirectMessageChannel(userId);
      setCurrentChannel(channel);
      
      // Show success notification
      toast({
        title: "Success",
        description: "Direct message channel created",
        variant: "default"
      });
      
      // Close the dialog
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating DM channel:", error);
      toast({
        title: "Error",
        description: "Failed to create direct message channel",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="px-3 py-1.5 rounded-md cursor-pointer flex items-center hover:bg-neutral-50 text-sm text-neutral-600">
          <User className="h-3.5 w-3.5 mr-2" />
          <span className="text-sm">New Message</span>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
          <DialogDescription>
            Select a user to start a private conversation
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Select a user to message</Label>
            <div className="max-h-[300px] overflow-y-auto space-y-1 border rounded-md p-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-3 text-neutral-500 text-sm">
                  No users available
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center p-2 rounded-md hover:bg-neutral-50 cursor-pointer"
                    onClick={() => handleStartDM(user.id)}
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                        {user.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-xs text-neutral-500">@{user.username}</div>
                    </div>
                    {isLoading && user.id === filteredUsers[0].id && 
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-neutral-400" />
                    }
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Channel Settings Button Component
function ChannelSettingsButton({ channel }: { channel: ChatChannel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Check if user is admin or channel creator
  const isAdmin = user?.role === 'admin';
  const isCreator = channel.createdBy === user?.id;
  const canManageChannel = isAdmin || isCreator;
  
  // Delete Channel Mutation
  const deleteChannelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/chat/channels/${channel.id}`, {});
      if (!res.ok) {
        throw new Error('Failed to delete channel');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      toast({
        title: "Channel Deleted",
        description: `Channel "${channel.name}" has been deleted`,
        variant: "default"
      });
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete channel",
        variant: "destructive"
      });
    }
  });
  
  const handleDeleteChannel = async () => {
    deleteChannelMutation.mutate();
  };
  
  if (!canManageChannel) return null;
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setShowDetails(true)}>
            Channel Details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowMembers(true)}>
            Manage Members
          </DropdownMenuItem>
          {!channel.isDirectMessage && (
            <DropdownMenuItem 
              className="text-red-600"
              onSelect={() => setShowDeleteConfirm(true)}
            >
              Delete Channel
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Channel Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Channel Details</DialogTitle>
            <DialogDescription>
              View and edit channel information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Name</Label>
              <Input 
                id="channel-name" 
                defaultValue={channel.name}
                readOnly={channel.isDirectMessage}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-description">Description</Label>
              <Input 
                id="channel-description" 
                defaultValue={channel.description || ''}
                readOnly={channel.isDirectMessage}
                placeholder="No description"
              />
            </div>
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <p className="text-sm text-neutral-600">
                {channel.isDirectMessage ? 'Direct Message' : channel.isPrivate ? 'Private Channel' : 'Public Channel'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Created By</Label>
              <p className="text-sm text-neutral-600">
                {channel.members.find(m => m.id === channel.createdBy)?.displayName || 'Unknown'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Created At</Label>
              <p className="text-sm text-neutral-600">
                {new Date(channel.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Manage Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Members</DialogTitle>
            <DialogDescription>
              View and manage channel members
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Members ({channel.members.length})</h4>
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
              {channel.members.map(member => (
                <div key={member.id} className="flex items-center justify-between py-2 px-2 hover:bg-neutral-50 rounded-md">
                  <div className="flex items-center">
                    <Avatar className="h-7 w-7 mr-3">
                      <AvatarFallback style={{ backgroundColor: member.avatarColor }}>
                        {member.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.displayName}</div>
                      <div className="text-xs text-neutral-500">@{member.username}</div>
                    </div>
                  </div>
                  {(isAdmin || isCreator) && member.id !== user?.id && !channel.isDirectMessage && (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {!channel.isDirectMessage && (
              <>
                <Separator className="my-4" />
                <h4 className="font-medium mb-2">Add Members</h4>
                <div className="flex space-x-2">
                  <Input placeholder="Search users..." className="flex-1" />
                  <Button variant="outline">Add</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Channel</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the channel and all its messages.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-neutral-700 mb-4">
              Are you sure you want to delete <span className="font-semibold">{channel.name}</span>?
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteChannel}
                disabled={deleteChannelMutation.isPending}
              >
                {deleteChannelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Chat Message Item Component
interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

function ChatMessageItem({ message, isOwnMessage }: ChatMessageItemProps) {
  const timestamp = new Date(message.sentAt);
  
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

// Channel Dialog Component
function ChatChannelDialog() {
  const { createChannel, setCurrentChannel } = useChat();
  const [channelData, setChannelData] = useState<{
    name: string;
    description: string;
    isPrivate: boolean;
  }>({
    name: '',
    description: '',
    isPrivate: false
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const handleCreateChannel = async () => {
    if (!channelData.name.trim()) return;
    
    try {
      setIsLoading(true);
      const newChannel = await createChannel({
        name: channelData.name.trim(),
        description: channelData.description.trim() || undefined,
        isPrivate: channelData.isPrivate
      });
      
      setCurrentChannel(newChannel);
      
      // Close dialog by clicking outside
      document.body.click();
    } catch (error) {
      console.error("Error creating channel:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>Create a New Channel</DialogTitle>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="channel-name">Channel Name</Label>
          <Input 
            id="channel-name"
            value={channelData.name}
            onChange={(e) => setChannelData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. project-updates"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="channel-description">Description (optional)</Label>
          <Input 
            id="channel-description"
            value={channelData.description}
            onChange={(e) => setChannelData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="What's this channel about?"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="private-channel"
            checked={channelData.isPrivate}
            onChange={(e) => setChannelData(prev => ({ ...prev, isPrivate: e.target.checked }))}
            className="rounded border-neutral-300"
          />
          <Label htmlFor="private-channel" className="cursor-pointer">Make this channel private</Label>
        </div>
        
        <Button 
          onClick={handleCreateChannel} 
          disabled={!channelData.name.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Create Channel
        </Button>
      </div>
    </>
  );
}