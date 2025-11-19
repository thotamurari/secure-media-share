import { useState } from 'react';
import { Heart, MessageCircle, User, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ProtectionOverlay } from './ProtectionOverlay';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: {
    id: string;
    image_url: string;
    caption: string;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  onLike: () => void;
  currentUserId?: string;
}

export const PostCard = ({ post, likesCount, commentsCount, isLiked, onLike, currentUserId }: PostCardProps) => {
  const [attemptCount, setAttemptCount] = useState(0);
  const navigate = useNavigate();
  const isOwner = currentUserId === post.user_id;

  const handleAttempt = () => {
    setAttemptCount((prev) => prev + 1);
  };

  const handleDownload = () => {
    if (!isOwner) {
      handleAttempt();
      return;
    }

    // Owner can download their own content
    const link = document.createElement('a');
    link.href = post.image_url;
    link.download = `mediagram-${post.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="max-w-md mx-auto overflow-hidden border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar 
            className="cursor-pointer border-2 border-primary"
            onClick={() => navigate(`/profile/${post.profiles.username}`)}
          >
            <AvatarImage src={post.profiles.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-instagram text-white">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p 
              className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/profile/${post.profiles.username}`)}
            >
              {post.profiles.username}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {/* Protected Image */}
        <div className="relative aspect-square bg-muted">
          <img
            src={post.image_url}
            alt={post.caption || 'Post'}
            className="w-full h-full object-cover select-none"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
          />
          <ProtectionOverlay username={post.profiles.username} onAttempt={handleAttempt} />
        </div>
      </CardContent>
      <CardFooter className="p-4 flex-col items-start gap-3">
        <div className="flex items-center gap-4 w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLike}
            className={isLiked ? 'text-destructive' : ''}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon">
            <MessageCircle className="w-6 h-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleDownload}
            className={isOwner ? '' : 'cursor-not-allowed'}
          >
            <Download className="w-6 h-6" />
          </Button>
        </div>
        <div className="space-y-2 w-full">
          <p className="text-sm font-semibold">{likesCount} likes</p>
          {post.caption && (
            <p className="text-sm">
              <span className="font-semibold">{post.profiles.username}</span>{' '}
              <span className="text-muted-foreground">{post.caption}</span>
            </p>
          )}
          {commentsCount > 0 && (
            <p className="text-sm text-muted-foreground">
              View all {commentsCount} comments
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};
