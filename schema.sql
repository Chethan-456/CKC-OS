-- Supabase Database Schema for Collaborative Code Editor

-- Enable Row Level Security (RLS) on all tables
-- This ensures users can only access their own data

-- Users profile table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  password_hash TEXT, -- Not used, just for compatibility
  color JSONB DEFAULT '{"hex": "#4FC1FF", "bg": "rgba(79,193,255,.22)"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can create their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete their own profile" ON users
  FOR DELETE USING (auth.uid() = id);

-- Documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see documents they created
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = created_by);

-- Policy: Users can insert their own documents
CREATE POLICY "Users can create documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = created_by);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = created_by);

-- Line locks table
CREATE TABLE line_locks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  locked_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, locked_by) -- One lock per user per document
);

-- Enable RLS on line_locks
ALTER TABLE line_locks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view line locks for documents they have access to
CREATE POLICY "Users can view line locks for accessible documents" ON line_locks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = line_locks.document_id
      AND documents.created_by = auth.uid()
    )
  );

-- Policy: Users can insert line locks for documents they own
CREATE POLICY "Users can create line locks for their documents" ON line_locks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = line_locks.document_id
      AND documents.created_by = auth.uid()
    )
  );

-- Policy: Users can update their own line locks
CREATE POLICY "Users can update their own line locks" ON line_locks
  FOR UPDATE USING (auth.uid() = locked_by);

-- Policy: Users can delete their own line locks
CREATE POLICY "Users can delete their own line locks" ON line_locks
  FOR DELETE USING (auth.uid() = locked_by);

-- Channels table for chat
CREATE TABLE channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on channels
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view channels
CREATE POLICY "Everyone can view channels" ON channels
  FOR SELECT USING (true);

-- Policy: Authenticated users can create channels
CREATE POLICY "Authenticated users can create channels" ON channels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Messages table for direct messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages they sent or received
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Policy: Users can send messages
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can edit their own messages
CREATE POLICY "Users can edit their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Insert default channel
INSERT INTO channels (name, description, created_by) VALUES ('general', 'General discussion', (SELECT id FROM auth.users LIMIT 1)) ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_line_locks_document_id ON line_locks(document_id);
CREATE INDEX idx_line_locks_locked_by ON line_locks(locked_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();