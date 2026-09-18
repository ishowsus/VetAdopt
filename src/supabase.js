import { createClient } from "@supabase/supabase-js";

// Formatted as: https://<project-reference>.supabase.co
const supabaseUrl = "https://zgcnimvzmhhslygyvjzr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY25pbXZ6bWhoc2x5Z3l2anpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MTAyODIsImV4cCI6MjEwNTI4NjI4Mn0.JKFmmrwP6oY4T2IX8mDJGbeJhuoKYjNu-UYDEtym_mM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);