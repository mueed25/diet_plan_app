// src/lib/supabase.ts - Supabase Configuration
import { createClient } from '@supabase/supabase-js';


const supabaseUrl= 'https://ozvenpvuomxdcdbwouxe.supabase.co' 
const supabaseAnonKey= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dmVucHZ1b214ZGNkYndvdXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzc1NjksImV4cCI6MjA2NDY1MzU2OX0.0f0nl9p2aBkGSSbL5tGaBIrvH71GaSXF0X9MHkl1oRI'
        

export const supabase = createClient(supabaseUrl, supabaseAnonKey);