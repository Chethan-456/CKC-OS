# CKC-OS Collaborative Code Editor

A full-stack web application featuring real-time collaborative code editing with Monaco Editor, line-level locking, and Supabase backend.

## Features

- **Supabase Authentication**: Login/signup/logout with user management
- **Monaco Editor**: Professional code editor with syntax highlighting
- **Real-time Collaboration**: Live code synchronization across users
- **Line-level Locking**: Prevent simultaneous editing on the same line
- **Visual Feedback**: Highlight locked lines with user colors
- **Access Control**: Only authenticated users can edit
- **Database Schema**: Users, documents, and line locks tables

## Tech Stack

- **Frontend**: React 19, Monaco Editor, Vite
- **Backend**: Supabase (Auth, Realtime, Database)
- **Styling**: Custom CSS with dark theme

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Update the credentials in `src/pages/editor.jsx` (lines 4-5):
   ```javascript
   const SUPABASE_URL = "your-project-url";
   const SUPABASE_ANON_KEY = "your-anon-key";
   ```

### 3. Database Schema

Run the SQL in `schema.sql` in your Supabase SQL Editor (Dashboard > SQL Editor > New Query).

This creates:
- `users` table for user profiles
- `documents` table for code documents
- `line_locks` table for line locking
- Row Level Security policies
- Indexes and triggers

### 4. Run the Application

```bash
npm install
npm run dev
```

The app will start on `http://localhost:5175`

### 5. Usage

1. Navigate to `/auth` to sign in or create a new account.
2. After login, open `/devchat` or `/chat` to access the real-time chat page.
3. Select a contact and start messaging.
4. Use the sidebar to see active users and switch conversations.

### 6. Chat Features

- Authenticated access to the chat dashboard
- Real-time Supabase Realtime message updates
- User presence with online/offline status
- Direct messaging between users
- Auto-scroll to latest messages
- Logout support

## Architecture

- **Authentication**: Supabase Auth with custom user profiles
- **Real-time Sync**: Supabase Realtime channels for code changes and locks
- **Line Locking**: Database-backed locking with optimistic UI updates
- **Conflict Resolution**: Line-level locking prevents conflicts
- **UI Feedback**: Decorations show locked lines and active users

## API Endpoints

The app uses Supabase's auto-generated REST API. Key tables:

- `users`: User profiles with colors
- `documents`: Code documents
- `line_locks`: Active line locks per user

## Development

- `npm run client`: Start Vite dev server
- `npm run server`: Start Express server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint

## Troubleshooting

- **Monaco not loading**: Check network connection for CDN resources
- **Auth errors**: Verify Supabase credentials
- **Database errors**: Ensure schema.sql was executed
- **Real-time not working**: Check Supabase Realtime is enabled
