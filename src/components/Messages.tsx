import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Send, Loader2, ArrowLeft, Bell, MessageSquarePlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

interface Conversation {
  userId: string;
  username: string;
  avatar_url: string | null;
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
}

interface ScreenshotAttempt {
  id: string;
  attempted_by_id: string;
  content_type: string;
  content_id: string | null;
  created_at: string;
  profiles?: Profile;
}

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [screenshotAttempts, setScreenshotAttempts] = useState<ScreenshotAttempt[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchScreenshotAttempts();
      fetchAllUsers();
      subscribeToMessages();
      subscribeToScreenshotAttempts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser && user) {
      fetchMessages(selectedUser.id);
    }
  }, [selectedUser, user]);

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user?.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (selectedUser && newMsg.sender_id === selectedUser.id) {
            setMessages((prev) => [...prev, newMsg]);
            markAsRead(newMsg.id);
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToScreenshotAttempts = () => {
    const channel = supabase
      .channel('screenshot-attempts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'screenshot_attempts',
          filter: `content_owner_id=eq.${user?.id}`,
        },
        async (payload) => {
          const attempt = payload.new as ScreenshotAttempt;
          
          // Fetch the attacker's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', attempt.attempted_by_id)
            .single();

          if (profile) {
            toast.error(`${profile.username} tried to screenshot your ${attempt.content_type}!`, {
              duration: 5000,
            });
            fetchScreenshotAttempts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchScreenshotAttempts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('screenshot_attempts')
      .select(`
        *,
        profiles!attempted_by_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('content_owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching screenshot attempts:', error);
    } else {
      setScreenshotAttempts(data || []);
    }
  };

  const fetchAllUsers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .neq('id', user.id) // Exclude current user
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setAllUsers(data || []);
    }
  };

  const startNewConversation = (selectedProfile: Profile) => {
    setSelectedUser(selectedProfile);
    setShowNewMessageDialog(false);
    setSearchQuery('');
    // The messages will be empty for a new conversation
    setMessages([]);
  };

  const filteredUsers = allUsers.filter(profile =>
    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (id, username, avatar_url),
          receiver:profiles!receiver_id (id, username, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();

      allMessages?.forEach((msg: any) => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const partner = msg.sender_id === user.id ? msg.receiver : msg.sender;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            userId: partnerId,
            username: partner.username,
            avatar_url: partner.avatar_url,
            lastMessage: msg.content,
            unreadCount: 0,
            timestamp: msg.created_at,
          });
        }

        if (msg.receiver_id === user.id && !msg.read) {
          const conv = conversationMap.get(partnerId)!;
          conv.unreadCount++;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (partnerId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (id, username, avatar_url),
          receiver:profiles!receiver_id (id, username, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark received messages as read
      const unreadIds = data
        ?.filter((msg) => msg.receiver_id === user.id && !msg.read)
        .map((msg) => msg.id);

      if (unreadIds && unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadIds);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase.from('messages').update({ read: true }).eq('id', messageId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !user) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedUser.id,
        content: messageContent,
      }).select().single();

      if (error) throw error;

      // Immediately add sent message to UI for instant feedback
      setMessages((prev) => [...prev, {
        ...data,
        sender: { id: user.id, username: '', avatar_url: null },
        receiver: { id: selectedUser.id, username: selectedUser.username, avatar_url: selectedUser.avatar_url }
      }]);
      
      fetchConversations();
    } catch (error: any) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Messages</h1>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => setShowNewMessageDialog(true)}
              >
                <MessageSquarePlus className="w-5 h-5 mr-2" />
                New Message
              </Button>
              <Button
                variant={showNotifications ? 'default' : 'outline'}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-5 h-5 mr-2" />
                Screenshot Alerts
                {screenshotAttempts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {screenshotAttempts.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {showNotifications && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Screenshot Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {screenshotAttempts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No screenshot attempts detected
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {screenshotAttempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                        >
                          <Avatar className="border-2 border-destructive">
                            <AvatarImage src={attempt.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-destructive text-white">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{attempt.profiles?.username}</p>
                            <p className="text-sm text-muted-foreground">
                              Tried to screenshot your {attempt.content_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(attempt.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Conversations List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {conversations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No conversations yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map((conv) => (
                        <div
                          key={conv.userId}
                          onClick={() =>
                            setSelectedUser({
                              id: conv.userId,
                              username: conv.username,
                              avatar_url: conv.avatar_url,
                            })
                          }
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedUser?.id === conv.userId
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Avatar className="border-2 border-primary">
                            <AvatarImage src={conv.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-instagram text-white">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold truncate">{conv.username}</p>
                              {conv.unreadCount > 0 && (
                                <Badge variant="destructive">{conv.unreadCount}</Badge>
                              )}
                            </div>
                            <p className="text-sm truncate opacity-70">{conv.lastMessage}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="md:col-span-2">
              {selectedUser ? (
                <>
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedUser(null)}
                      className="md:hidden"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Avatar className="border-2 border-primary">
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-instagram text-white">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle>{selectedUser.username}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.sender_id === user?.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={sending}
                      />
                      <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                        {sending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-[500px]">
                  <p className="text-muted-foreground">Select a conversation to start chatting</p>
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* New Message Dialog */}
        <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Users List */}
              <ScrollArea className="h-[400px] pr-4">
                {filteredUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {searchQuery ? 'No users found' : 'No other users yet'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((profile) => (
                      <div
                        key={profile.id}
                        onClick={() => startNewConversation(profile)}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      >
                        <Avatar className="border-2 border-primary">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-instagram text-white">
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{profile.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
