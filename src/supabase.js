import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Variables d'environnement Supabase manquantes dans le fichier .env");
}

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function loadFromSupabase(ideasWall, createPostIt) {
  try {
    const { data, error } = await db.from('ideas').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    
    ideasWall.querySelectorAll('.post-it').forEach(p => p.remove());
    
    data?.forEach(({ title, description, category, completed, id }) =>
      createPostIt(title, description, category, completed, id)
    );
  } catch (err) {
    console.error("Erreur chargement Supabase :", err);
  }
}
