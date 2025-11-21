-- Create messages table for user-to-user chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create screenshot_attempts table to track and notify owners
CREATE TABLE public.screenshot_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'post' or 'profile'
  content_id UUID, -- post_id or profile_id
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages RLS policies
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own sent messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Enable RLS on screenshot_attempts
ALTER TABLE public.screenshot_attempts ENABLE ROW LEVEL SECURITY;

-- Screenshot attempts RLS policies
CREATE POLICY "Users can view attempts on their content"
ON public.screenshot_attempts
FOR SELECT
USING (auth.uid() = content_owner_id);

CREATE POLICY "Users can log screenshot attempts"
ON public.screenshot_attempts
FOR INSERT
WITH CHECK (auth.uid() = attempted_by_id);

-- Add trigger for messages updated_at
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for screenshot_attempts
ALTER PUBLICATION supabase_realtime ADD TABLE public.screenshot_attempts;