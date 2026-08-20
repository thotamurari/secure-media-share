import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Loader2, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectionOverlay } from '@/components/ProtectionOverlay';
import { EditProfileDialog } from '@/components/EditProfileDialog';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  image_url: string;
  caption: string;
}

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username, user]);

  const handleProfileUpdate = () => {
    fetchProfile(); // Refresh profile after edit
  };

  const fetchProfile = async () => {
    try {
      // If no username param, fetch current user's profile
      let targetUsername = username;
      
      if (!targetUsername && user) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        targetUsername = currentProfile?.username;
      }

      if (!targetUsername) {
        toast.error('Profile not found');
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', targetUsername)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);
      setIsOwnProfile(user?.id === profileData.id);

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, caption')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setPosts(postsData || []);
    } catch (error: any) {
      toast.error('Failed to load profile');
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 py-8 relative">
        {/* Protection overlay for other users' profiles */}
        {!isOwnProfile && profile && user && (
          <ProtectionOverlay 
            username={profile.username}
            contentOwnerId={profile.id}
            contentType="profile"
          />
        )}
        
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          {/* Profile Header */}
          <Card className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <Avatar className="w-32 h-32 border-4 border-primary">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-gradient-instagram text-white text-4xl">
                  <User className="w-16 h-16" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-3xl font-bold">{profile.username}</h1>
                  {profile.full_name && (
                    <p className="text-muted-foreground">{profile.full_name}</p>
                  )}
                </div>
                <div className="flex gap-8 justify-center md:justify-start">
                  <div>
                    <span className="font-bold">{posts.length}</span>{' '}
                    <span className="text-muted-foreground">posts</span>
                  </div>
                </div>
                {profile.bio && (
                  <p className="text-sm">{profile.bio}</p>
                )}
                {isOwnProfile && (
                  <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Posts Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 py-4 border-t border-border">
              <Grid3x3 className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase">Posts</span>
            </div>
            
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="relative aspect-square bg-muted rounded-sm overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {post.image_url ? (
                      <>
                        <img
                          src={post.image_url}
                          alt={post.caption || 'Post'}
                          className="w-full h-full object-cover select-none"
                          draggable="false"
                          onContextMenu={(e) => e.preventDefault()}
                        />
                        <ProtectionOverlay 
                          username={profile.username} 
                          contentOwnerId={profile.id}
                          contentType="post"
                          contentId={post.id}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-muted-foreground">
                        {post.caption || 'Post'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Profile Dialog */}
        {isOwnProfile && profile && (
          <EditProfileDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            profile={profile}
            onProfileUpdated={fetchProfile}
          />
        )}
      </div>
    </>
  );
}
