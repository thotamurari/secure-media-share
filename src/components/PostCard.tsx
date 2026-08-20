import { useState } from 'react';
import { Heart, MessageCircle, User, Download, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProtectionOverlay } from './ProtectionOverlay';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  onPostUpdated?: () => void;
}

const formatPostingDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInMs = Math.max(0, now.getTime() - date.getTime());
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 2) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const PostCard = ({ post, likesCount, commentsCount, isLiked, onLike, currentUserId, onPostUpdated }: PostCardProps) => {
  const [attemptCount, setAttemptCount] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const isOwner = currentUserId === post.user_id;

  const handleAttempt = () => {
    setAttemptCount((prev) => prev + 1);
  };

  const handleDownload = () => {
    if (!isOwner) {
      handleAttempt();
      toast.error('⚠️ This is private content. Screenshots and downloads are not allowed.', {
        duration: 4000,
      });
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

  const handleEdit = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ caption: editCaption })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated successfully');
      setShowEditDialog(false);
      onPostUpdated?.();
    } catch (error: any) {
      toast.error('Failed to update post');
      console.error('Error updating post:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post deleted successfully');
      setShowDeleteDialog(false);
      onPostUpdated?.();
    } catch (error: any) {
      toast.error('Failed to delete post');
      console.error('Error deleting post:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto overflow-hidden border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar 
            className="cursor-pointer border-2 border-primary"
            onClick={() => navigate(`/profile/${post.profiles.username}`)}
          >
            {post.profiles.avatar_url && <AvatarImage src={post.profiles.avatar_url} />}
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
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      {/* Protected Image Content */}
      {post.image_url && (
        <CardContent className="p-0 relative">
          <div className="relative aspect-square bg-muted overflow-hidden">
            <img
              src={post.image_url}
              alt={post.caption || 'Post media'}
              className="w-full h-full object-cover select-none"
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
            />
            <ProtectionOverlay 
              username={post.profiles.username} 
              contentOwnerId={post.user_id}
              contentType="post"
              contentId={post.id}
              onAttempt={handleAttempt} 
            />
          </div>
        </CardContent>
      )}

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
            className={isOwner ? 'hover:text-primary' : 'text-muted-foreground hover:text-destructive'}
            title={isOwner ? 'Download image' : 'Protected content'}
          >
            <Download className="w-6 h-6" />
          </Button>
        </div>
        <div className="space-y-2 w-full">
          <p className="text-sm font-semibold">{likesCount} likes</p>
          {post.caption && (
            <p 
              className="text-sm select-none"
              onCopy={(e) => {
                e.preventDefault();
                toast.error('Cannot copy protected content');
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
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
            {formatPostingDate(post.created_at)}
          </p>
        </div>
      </CardFooter>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Update your post caption
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Write a caption..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
