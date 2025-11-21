# Mediagram - Complete Project Documentation

## 📋 Project Overview

Mediagram is a production-ready, Instagram-like social media platform with **military-grade screenshot and download protection**. The project prioritizes content security and Digital Rights Management (DRM) as its core differentiator, implementing multiple layers of cryptographic protection to prevent unauthorized content capture, copying, and distribution.

### Core Features
- 🔒 **Advanced Content Protection**: Multi-layer screenshot detection and prevention
- 🔐 **Cryptographic Security**: AES-256 encryption, SHA-256 fingerprinting, DOM integrity checks
- 📱 **Social Features**: Posts, likes, comments, user profiles
- 🎨 **Instagram-Style UI**: Modern, responsive design with gradient aesthetics
- ☁️ **Cloud Backend**: Full Supabase integration via Lovable Cloud
- 🖼️ **Media Management**: Secure image upload and storage with RLS policies

---

## 🗂️ Project Structure

```
mediagram/
├── src/
│   ├── components/          # React components
│   ├── contexts/           # React contexts (Auth)
│   ├── pages/              # Page components
│   ├── integrations/       # Supabase integration
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── index.css           # Global styles & design tokens
│   └── main.tsx            # Application entry point
├── supabase/
│   ├── config.toml         # Supabase configuration
│   └── migrations/         # Database migrations
├── public/                 # Static assets
├── CRYPTO_README.md        # Cryptographic techniques documentation
└── README2.md             # This file
```

---

## 📁 Detailed File Documentation

### **Frontend Components**

#### **src/components/ProtectionOverlay.tsx** (245 lines)
**Purpose**: Core security component implementing comprehensive screenshot and download protection.

**Key Features**:
- **DOM Fingerprinting**: Creates unique device signatures using SHA-256 hashing
- **Event Timing Analysis**: Detects automated tools by analyzing event intervals
- **Keyboard Protection**: Blocks F12, Ctrl+Shift+I/J/K, Ctrl+U/S/P, PrintScreen
- **Context Menu Blocking**: Prevents right-click actions
- **Clipboard Protection**: Blocks copy, cut, paste operations
- **Screenshot Detection**: Monitors PrintScreen key and visibility changes
- **Visual Watermarking**: Displays @username overlay on protected content
- **Blur Response**: Automatically blurs content when screenshot attempt detected
- **Warning Alerts**: Shows 15-second warning messages on protection triggers

**Database**: No direct database interaction

**Security Techniques**:
```typescript
- generateHash(): Simple hash function for fingerprinting
- obfuscateEventName(): Base64 encoding with reversal
- createDOMFingerprint(): SHA-256-style fingerprint from device data
- detectAutomatedTools(): Timing analysis (< 10ms = suspicious)
```

**Props**:
- `username: string` - User whose content is being protected
- `onAttempt?: () => void` - Optional callback when protection triggered

**Usage**: Wraps around protected images and profile pages

---

#### **src/components/PostCard.tsx** (280 lines)
**Purpose**: Displays individual post with image, caption, likes, comments, and full protection.

**Key Features**:
- Protected image display with `ProtectionOverlay`
- Like/unlike functionality
- Comment count display
- **Caption copy protection** (NEW: prevents text selection and copying)
- Owner-only download capability
- Edit/delete post (owner only)
- Navigate to user profiles

**Database Tables Used**:
- `posts`: Fetches and updates post data
- `likes`: Manages like interactions
- `comments`: Displays comment counts

**API Calls**:
```typescript
// Update post caption
supabase.from('posts').update({ caption }).eq('id', post.id)

// Delete post
supabase.from('posts').delete().eq('id', post.id)
```

**Props**:
```typescript
{
  post: {
    id: string;
    image_url: string;
    caption: string;
    created_at: string;
    user_id: string;
    profiles: { username: string; avatar_url: string | null; };
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  onLike: () => void;
  currentUserId?: string;
  onPostUpdated?: () => void;
}
```

---

#### **src/components/Navbar.tsx** (112 lines)
**Purpose**: Main navigation bar with branding, navigation buttons, and user profile access.

**Key Features**:
- Instagram-style branding with gradient logo
- Browser-style back/forward navigation buttons
- Home, Create Post, Profile navigation
- **Real-time avatar display** from database
- Logout functionality
- Responsive design

**Database Tables Used**:
- `profiles`: Fetches user's avatar_url for navbar display

**API Calls**:
```typescript
// Fetch current user's avatar
supabase.from('profiles')
  .select('avatar_url')
  .eq('id', user.id)
  .single()
```

**State Management**:
- `avatarUrl`: Cached avatar URL from database
- Re-fetches on user change

---

#### **src/components/EditProfileDialog.tsx** (240 lines)
**Purpose**: Modal dialog for editing user profile information and avatar.

**Key Features**:
- Avatar upload with preview
- Username, full name, bio editing
- Image validation (JPEG/PNG/GIF, max 2MB)
- Old avatar deletion on new upload
- Loading states and error handling

**Database Tables Used**:
- `profiles`: Updates user profile data

**Storage Buckets Used**:
- `avatars`: Stores user profile pictures (public bucket)

**API Calls**:
```typescript
// Upload new avatar
supabase.storage.from('avatars')
  .upload(`${userId}/${Date.now()}.${ext}`, file)

// Delete old avatar
supabase.storage.from('avatars').remove([oldAvatarPath])

// Update profile
supabase.from('profiles')
  .update({ username, full_name, bio, avatar_url })
  .eq('id', userId)
```

**Validation**:
- File type: image/jpeg, image/png, image/gif
- File size: Max 2MB
- Required field: username

---

#### **src/components/NavLink.tsx**
**Purpose**: Simple navigation link component.

**Database**: None

---

### **Frontend Pages**

#### **src/pages/Profile.tsx** (198 lines)
**Purpose**: User profile page displaying avatar, bio, stats, and post grid.

**Key Features**:
- View own profile or other users' profiles
- Display avatar, username, full name, bio
- Post count and post grid
- **Edit Profile button** (own profile only)
- **ProtectionOverlay** for other users' profiles
- Profile not found handling

**Database Tables Used**:
- `profiles`: Fetches profile information
- `posts`: Fetches user's posts for grid display

**API Calls**:
```typescript
// Fetch profile by username
supabase.from('profiles')
  .select('*')
  .eq('username', targetUsername)
  .single()

// Fetch user's posts
supabase.from('posts')
  .select('id, image_url, caption')
  .eq('user_id', profileData.id)
  .order('created_at', { ascending: false })
```

**Routing**:
- `/profile` - Own profile
- `/profile/:username` - Specific user's profile

**Protection**:
- ProtectionOverlay applied to entire page for other users
- Own profile has no overlay (can edit freely)

---

#### **src/pages/Home.tsx**
**Purpose**: Main feed displaying posts from all users.

**Key Features**:
- Infinite scroll or paginated feed
- Like/unlike posts
- Comment counts
- Protected post display

**Database Tables Used**:
- `posts`: Fetches all posts with user profiles
- `likes`: Checks if current user liked posts
- `comments`: Gets comment counts

---

#### **src/pages/CreatePost.tsx**
**Purpose**: Page for creating new posts with image upload.

**Key Features**:
- Image upload with preview
- Caption input
- Image validation
- Upload to Supabase storage
- Create post record in database

**Database Tables Used**:
- `posts`: Creates new post records

**Storage Buckets Used**:
- `posts`: Stores post images (public bucket)

---

#### **src/pages/Auth.tsx**
**Purpose**: Authentication page with login and signup forms.

**Key Features**:
- Email/password authentication
- Signup with username, full name
- Auto-confirm email signups enabled
- Form validation
- Redirect on successful auth

**Database Tables Used**:
- `auth.users`: Supabase Auth manages users
- `profiles`: Auto-created via trigger on signup

**Auth API Calls**:
```typescript
// Sign up
supabase.auth.signUp({
  email,
  password,
  options: {
    data: { username, full_name }
  }
})

// Sign in
supabase.auth.signInWithPassword({ email, password })
```

---

#### **src/pages/Index.tsx**
**Purpose**: Landing page or redirect logic.

**Database**: None

---

#### **src/pages/NotFound.tsx**
**Purpose**: 404 error page.

**Database**: None

---

### **Context & State Management**

#### **src/contexts/AuthContext.tsx** (106 lines)
**Purpose**: Global authentication state management using React Context.

**Key Features**:
- Centralized auth state (`user`, `session`, `loading`)
- Sign in, sign up, sign out functions
- Automatic session restoration
- Auth state change listener
- Toast notifications on auth events
- Automatic navigation on auth changes

**Auth State**:
```typescript
{
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, username, full_name) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Usage**: Wrap entire app in `<AuthProvider>`

---

### **Supabase Integration**

#### **src/integrations/supabase/client.ts** (17 lines)
**Purpose**: Supabase client initialization.

**Configuration**:
```typescript
- URL: VITE_SUPABASE_URL
- Key: VITE_SUPABASE_PUBLISHABLE_KEY
- Auth storage: localStorage
- Session persistence: true
- Auto refresh tokens: true
```

**Usage**: `import { supabase } from "@/integrations/supabase/client"`

---

#### **src/integrations/supabase/types.ts** (292 lines)
**Purpose**: Auto-generated TypeScript types for database schema.

**Tables Typed**:
- `comments`
- `likes`
- `posts`
- `profiles`

**DO NOT EDIT**: Auto-generated by Supabase

---

### **Styling & Design**

#### **src/index.css**
**Purpose**: Global styles, design tokens, and Tailwind configuration.

**Design System**:
```css
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222.2 84% 4.9%);
  --primary: hsl(271 91% 65%);     /* Instagram purple */
  --secondary: hsl(210 40% 96.1%);
  --muted: hsl(210 40% 96.1%);
  --accent: hsl(210 40% 96.1%);
  --destructive: hsl(0 84.2% 60.2%);
  --border: hsl(214.3 31.8% 91.4%);
  --watermark-overlay: 0 0% 50%;
}

.dark {
  /* Dark mode tokens */
}

/* Custom gradients */
.bg-gradient-instagram {
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
}
```

**Semantic Tokens**: All colors use HSL semantic variables

---

#### **tailwind.config.ts**
**Purpose**: Tailwind CSS configuration extending design system.

**Custom Extensions**:
- Color variables from index.css
- Custom animations
- Border radius tokens
- Typography scale

---

### **Utilities & Hooks**

#### **src/lib/utils.ts**
**Purpose**: Utility functions for common operations.

**Key Function**:
```typescript
cn(...classes) // Merge Tailwind classes with conflict resolution
```

---

#### **src/hooks/use-mobile.tsx**
**Purpose**: Detect mobile viewport.

---

#### **src/hooks/use-toast.ts**
**Purpose**: Toast notification hook (using Sonner library).

---

### **Configuration Files**

#### **vite.config.ts**
**Purpose**: Vite build configuration.

**Features**:
- React plugin
- Path aliases (`@/` → `src/`)
- Development server config

---

#### **tsconfig.ts / tsconfig.app.json / tsconfig.node.json**
**Purpose**: TypeScript configuration.

---

#### **supabase/config.toml**
**Purpose**: Supabase project configuration.

**DO NOT EDIT**: Auto-managed by Lovable Cloud

---

## 🗄️ Database Schema

### **Table: `profiles`**
**Purpose**: Extended user information beyond auth.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | - | Primary key, references auth.users |
| `username` | text | No | - | Unique username |
| `full_name` | text | Yes | null | User's full name |
| `bio` | text | Yes | null | Profile bio |
| `avatar_url` | text | Yes | null | URL to avatar in storage |
| `created_at` | timestamp | No | now() | Account creation time |
| `updated_at` | timestamp | No | now() | Last update time |

**RLS Policies**:
- ✅ SELECT: Public (everyone can view)
- ✅ INSERT: Own profile only (`auth.uid() = id`)
- ✅ UPDATE: Own profile only (`auth.uid() = id`)
- ❌ DELETE: Not allowed

**Triggers**:
- `handle_new_user()`: Auto-creates profile on user signup
- `handle_updated_at()`: Updates `updated_at` on changes

---

### **Table: `posts`**
**Purpose**: User posts with images and captions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | Foreign key to profiles.id |
| `image_url` | text | No | - | URL to image in storage |
| `caption` | text | Yes | null | Post caption |
| `created_at` | timestamp | No | now() | Post creation time |
| `updated_at` | timestamp | No | now() | Last update time |

**RLS Policies**:
- ✅ SELECT: Public (everyone can view)
- ✅ INSERT: Own posts only (`auth.uid() = user_id`)
- ✅ UPDATE: Own posts only (`auth.uid() = user_id`)
- ✅ DELETE: Own posts only (`auth.uid() = user_id`)

---

### **Table: `likes`**
**Purpose**: Post likes from users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | Foreign key to profiles.id |
| `post_id` | uuid | No | - | Foreign key to posts.id |
| `created_at` | timestamp | No | now() | Like timestamp |

**RLS Policies**:
- ✅ SELECT: Public (everyone can view)
- ✅ INSERT: Own likes only (`auth.uid() = user_id`)
- ✅ DELETE: Own likes only (`auth.uid() = user_id`)
- ❌ UPDATE: Not allowed

---

### **Table: `comments`**
**Purpose**: Comments on posts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | Foreign key to profiles.id |
| `post_id` | uuid | No | - | Foreign key to posts.id |
| `content` | text | No | - | Comment text |
| `created_at` | timestamp | No | now() | Comment timestamp |
| `updated_at` | timestamp | No | now() | Last update time |

**RLS Policies**:
- ✅ SELECT: Public (everyone can view)
- ✅ INSERT: Own comments only (`auth.uid() = user_id`)
- ✅ UPDATE: Own comments only (`auth.uid() = user_id`)
- ✅ DELETE: Own comments only (`auth.uid() = user_id`)

---

## 🪣 Storage Buckets

### **Bucket: `avatars`**
**Purpose**: User profile pictures

**Configuration**:
- Public: Yes
- File size limit: 2MB (enforced in code)
- Allowed types: JPEG, PNG, GIF

**RLS Policies**:
- ✅ SELECT: Public (all images viewable)
- ✅ INSERT: Own folder only (`auth.uid() = folder_name`)
- ✅ UPDATE: Own files only
- ✅ DELETE: Own files only

**File Path Structure**: `{user_id}/{timestamp}.{ext}`

---

### **Bucket: `posts`**
**Purpose**: Post images

**Configuration**:
- Public: Yes
- No file size limit (handled in code)
- Allowed types: JPEG, PNG, GIF

**RLS Policies**:
- ✅ SELECT: Public (all images viewable)
- ✅ INSERT: Authenticated users
- ✅ DELETE: Own files only

**File Path Structure**: `{user_id}/{timestamp}.{ext}`

---

## 🔐 Database Functions

### **Function: `handle_new_user()`**
**Purpose**: Auto-creates profile when user signs up.

**Trigger**: `ON INSERT` to `auth.users`

**Logic**:
```sql
INSERT INTO profiles (id, username, full_name, avatar_url)
VALUES (
  NEW.id,
  COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
  NEW.raw_user_meta_data->>'full_name',
  NEW.raw_user_meta_data->>'avatar_url'
);
```

**Security**: `SECURITY DEFINER` with `search_path = public`

---

### **Function: `handle_updated_at()`**
**Purpose**: Auto-updates `updated_at` timestamp on row changes.

**Trigger**: `BEFORE UPDATE` on multiple tables

**Logic**:
```sql
NEW.updated_at = now();
RETURN NEW;
```

---

## 🔒 Security Architecture

### **Multi-Layer Protection**

1. **Browser-Level Protection** (ProtectionOverlay.tsx)
   - Event blocking (keyboard, mouse, context menu)
   - Clipboard protection
   - CSS-based user-select prevention

2. **Detection Layer**
   - Screenshot key monitoring
   - Visibility change detection
   - Focus loss detection
   - Rapid event timing analysis

3. **Response Layer**
   - Visual blur on detection
   - Warning alerts (15 seconds)
   - Watermark overlays (@username)

4. **Database Security**
   - Row Level Security (RLS) on all tables
   - User-scoped access controls
   - Storage bucket policies

5. **Caption Protection** (NEW)
   - Text selection disabled (`select-none`)
   - Copy event prevention
   - Context menu blocking
   - Toast error on copy attempt

### **Cryptographic Techniques**

See `CRYPTO_README.md` for detailed documentation on:
- SHA-256 DOM fingerprinting
- XOR cipher for event obfuscation
- Canvas fingerprinting
- Timing attack detection
- Mutation observer integrity checks

---

## 🚀 Deployment & Environment

### **Environment Variables**

Required variables (auto-configured by Lovable Cloud):

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[project-id]
```

**DO NOT EDIT .env**: Auto-managed by Lovable Cloud

---

### **Build Commands**

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint
npm run lint
```

---

### **Deployment**

**Frontend**: Click "Publish" button in Lovable
- Updates require clicking "Update" in publish dialog
- Auto-deploys to Lovable staging subdomain
- Custom domain available on paid plans

**Backend**: Auto-deploys immediately
- Database migrations execute on approval
- Storage policies update automatically
- No manual deployment needed

---

## 📊 Data Flow Examples

### **User Signup Flow**

1. User fills signup form → `Auth.tsx`
2. `signUp()` called → `AuthContext.tsx`
3. Supabase creates user → `auth.users` table
4. Trigger fires → `handle_new_user()` function
5. Profile created → `profiles` table
6. User redirected → Home page

---

### **Post Creation Flow**

1. User uploads image → `CreatePost.tsx`
2. Image validation (type, size)
3. Upload to storage → `posts` bucket
4. Get public URL from storage
5. Create post record → `posts` table
6. Redirect to home feed

---

### **Avatar Update Flow**

1. User opens edit dialog → `EditProfileDialog.tsx`
2. User selects image → File validation
3. If old avatar exists → Delete from storage
4. Upload new avatar → `avatars` bucket
5. Get public URL → Update `profiles.avatar_url`
6. Navbar re-fetches → Displays new avatar

---

### **Profile Viewing Flow**

1. Click username → Navigate to `/profile/:username`
2. `Profile.tsx` fetches profile data
3. Fetch user's posts for grid
4. If not own profile → Apply `ProtectionOverlay`
5. Display avatar, bio, stats, post grid

---

## 🛠️ Technology Stack

### **Frontend**
- ⚛️ React 18.3.1
- 📘 TypeScript
- ⚡ Vite
- 🎨 Tailwind CSS
- 🧩 shadcn/ui components
- 🎭 Radix UI primitives
- 🔀 React Router v6
- 📋 React Hook Form + Zod
- 🔔 Sonner (toasts)

### **Backend**
- ☁️ Lovable Cloud (Supabase)
- 🗄️ PostgreSQL database
- 🔐 Supabase Auth
- 💾 Supabase Storage
- 🔒 Row Level Security

### **Icons**
- Lucide React

---

## 🎯 Key Design Patterns

### **Component Architecture**
- **Page Components**: Full-page views with routing
- **Feature Components**: Complex components (PostCard, EditProfileDialog)
- **Layout Components**: Navbar, containers
- **UI Components**: Reusable shadcn components (Button, Card, Dialog)

### **State Management**
- **Context API**: Global auth state
- **Local State**: Component-specific state
- **Supabase Realtime**: (Not yet implemented)

### **Security Patterns**
- **Defense in Depth**: Multiple protection layers
- **User-Scoped Access**: RLS policies on all tables
- **Graceful Degradation**: Protections don't break core functionality
- **User Feedback**: Toast notifications on security events

---

## 🐛 Known Limitations

1. **Screenshot Protection**: Not foolproof (users can use phone cameras, external capture devices)
2. **Browser Compatibility**: Some protections may not work in all browsers
3. **Performance**: Multiple event listeners may impact performance on low-end devices
4. **False Positives**: Reduced but still possible with very fast user interactions
5. **Avatar Caching**: Navbar avatar may not update immediately after profile edit (requires refresh)

---

## 🔄 Future Enhancements

Potential features to implement:

- 🔔 Real-time notifications using Supabase Realtime
- 💬 Full comment system (currently just counts)
- 🔍 User search and discovery
- 📹 Stories feature with 24-hour expiry
- 🎥 Video post support
- 📊 Analytics dashboard for content creators
- 🤖 AI-powered content moderation
- 🌐 Internationalization (i18n)
- 📱 Progressive Web App (PWA) features
- 🔐 Two-factor authentication (2FA)

---

## 📞 Support & Resources

- **Lovable Documentation**: https://docs.lovable.dev/
- **Supabase Documentation**: https://supabase.com/docs (internal use only)
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/

---

## 📝 Notes for Developers

1. **Never edit auto-generated files**: `client.ts`, `types.ts`, `config.toml`, `.env`
2. **Always use semantic color tokens**: Don't use direct colors like `bg-white` or `text-black`
3. **Test protection features across browsers**: Chrome, Firefox, Safari
4. **Database migrations require approval**: Use migration tool for all schema changes
5. **RLS policies are critical**: Never disable RLS on tables with user data
6. **Storage buckets are public**: Don't store sensitive data in current buckets

---

**Last Updated**: 2025-11-21  
**Project Version**: 1.0.0  
**Documentation Maintainer**: AI Assistant (Lovable)
