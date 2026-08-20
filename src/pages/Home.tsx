import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/PostCard';
import { Navbar } from '@/components/Navbar';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Post {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const USER_POSTS: Post[] = [
  {
    id: 'user-post-1',
    image_url: '/images/post1.jpg',
    caption: 'Night breeze & city lights ✨ Enjoying peaceful moments.',
    created_at: '2026-08-20T22:30:00.000Z',
    user_id: 'user-priya',
    profiles: {
      username: 'priya',
      avatar_url: '/images/post1.jpg',
    }
  },
  {
    id: 'user-post-2',
    image_url: '/images/post2.png',
    caption: 'Catching raindrops and good vibes 🌧️💫 Monsoon moments.',
    created_at: '2026-08-20T19:15:00.000Z',
    user_id: 'user-priya',
    profiles: {
      username: 'priya',
      avatar_url: '/images/post1.jpg',
    }
  }
];

const SAMPLE_POSTS: Post[] = [
  ...USER_POSTS,
  {
    id: 'sample-post-1',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    caption: 'Breathtaking serenity at alpine lakes 🏔️ Emerald waters & mountain reflections.',
    created_at: '2026-08-19T21:40:00.000Z',
    user_id: 'user-elena',
    profiles: {
      username: 'elena_travels',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    }
  }
];

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Record<string, boolean>>({
    'user-post-1': true,
    'user-post-2': true,
    'sample-post-1': true,
  });
  const [likesCount, setLikesCount] = useState<Record<string, number>>({
    'user-post-1': 284,
    'user-post-2': 195,
    'sample-post-1': 142,
  });
  const [commentsCount, setCommentsCount] = useState<Record<string, number>>({
    'user-post-1': 18,
    'user-post-2': 14,
    'sample-post-1': 12,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    try {
      // Set curated clean feed with top posts
      setPosts(SAMPLE_POSTS);

      // Fetch likes for current user if logged in
      if (user) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likesMap: Record<string, boolean> = { ...likes };
        likesData?.forEach((like) => {
          likesMap[like.post_id] = true;
        });
        setLikes(likesMap);
      }
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      setPosts(SAMPLE_POSTS);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    const isCurrentlyLiked = !!likes[postId];
    const currentCount = likesCount[postId] || 0;

    // Optimistic UI update
    setLikes((prev) => ({ ...prev, [postId]: !isCurrentlyLiked }));
    setLikesCount((prev) => ({
      ...prev,
      [postId]: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    if (!user) return;

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id });
      }
    } catch (error: any) {
      // Revert on error
      setLikes((prev) => ({ ...prev, [postId]: isCurrentlyLiked }));
      setLikesCount((prev) => ({ ...prev, [postId]: currentCount }));
      toast.error('Failed to update like');
      console.error('Error toggling like:', error);
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
        <div className="max-w-2xl mx-auto space-y-6 px-4">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No posts yet. Create the first one!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                likesCount={likesCount[post.id] ?? 12}
                commentsCount={commentsCount[post.id] ?? 2}
                isLiked={likes[post.id] || false}
                onLike={() => handleLike(post.id)}
                currentUserId={user?.id}
                onPostUpdated={fetchPosts}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
