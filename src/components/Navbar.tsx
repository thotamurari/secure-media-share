import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, PlusSquare, User, LogOut, Instagram, ArrowLeft, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(1)}
              className="hover:bg-muted"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
          
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="bg-gradient-instagram p-2 rounded-lg">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-instagram bg-clip-text text-transparent">
              Mediagram
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="hover:bg-muted"
          >
            <Home className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/create')}
            className="hover:bg-muted"
          >
            <PlusSquare className="w-6 h-6" />
          </Button>
          {user && (
            <>
              <Avatar
                className="cursor-pointer border-2 border-primary"
                onClick={() => navigate('/profile')}
              >
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-instagram text-white">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="hover:bg-muted"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
