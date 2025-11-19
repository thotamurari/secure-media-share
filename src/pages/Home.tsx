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

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [commentsCount, setCommentsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      // Fetch posts with profile info
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setPosts(postsData || []);

      // Fetch likes for current user
      if (user && postsData) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likesMap: Record<string, boolean> = {};
        likesData?.forEach((like) => {
          likesMap[like.post_id] = true;
        });
        setLikes(likesMap);

        // Fetch like counts and comment counts
        const counts: Record<string, number> = {};
        const commentCounts: Record<string, number> = {};

        for (const post of postsData) {
          const { count: likeCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          counts[post.id] = likeCount || 0;
          commentCounts[post.id] = commentCount || 0;
        }

        setLikesCount(counts);
        setCommentsCount(commentCounts);
      }
    } catch (error: any) {
      toast.error('Failed to load posts');
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      if (likes[postId]) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        setLikes({ ...likes, [postId]: false });
        setLikesCount({ ...likesCount, [postId]: (likesCount[postId] || 1) - 1 });
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id });

        setLikes({ ...likes, [postId]: true });
        setLikesCount({ ...likesCount, [postId]: (likesCount[postId] || 0) + 1 });
      }
    } catch (error: any) {
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
            likesCount={likesCount[post.id] || 0}
            commentsCount={commentsCount[post.id] || 0}
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
