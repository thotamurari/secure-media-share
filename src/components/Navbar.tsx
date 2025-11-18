import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, PlusSquare, User, LogOut, Instagram } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
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
                <AvatarImage src={undefined} />
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
