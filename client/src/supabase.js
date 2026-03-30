import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR REAL SUPABASE URL & ANON KEY
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * UPLOAD UTILITY: Uploads multiple images to a bucket and returns their public URLs.
 * Bucket Name: 'listings'
 */
export const uploadListingImages = async (files) => {
  if (!files || files.length === 0) return [];
  
  const urls = [];
  for (const file of files) {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('listings')
      .upload(fileName, file);
      
    if (error) {
      console.error('Upload Error:', error);
      continue;
    }
    
    const { data: publicData } = supabase.storage
      .from('listings')
      .getPublicUrl(data.path);
      
    urls.push(publicData.publicUrl);
  }
  return urls;
};
