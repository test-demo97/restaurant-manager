import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Lo schema SQL completo è in: supabase-schema.sql

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://epuxypdznvvltfhismxu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXh5cGR6bnZ2bHRmaGlzbXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNjc5NjQsImV4cCI6MjA4MTg0Mzk2NH0.Py3wVtEZwuRxQIz-HW8umkPDvidKCPvCRYMDReQ529Q';

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
