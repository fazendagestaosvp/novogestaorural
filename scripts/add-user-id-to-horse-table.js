import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key is missing. Check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Starting migration to add user_id to horse table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'add-user-id-to-horse-table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error executing migration:', error);
      return;
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the changes
    const { data, error: queryError } = await supabase
      .from('horse')
      .select('id, name, user_id')
      .limit(5);
      
    if (queryError) {
      console.error('Error verifying migration:', queryError);
      return;
    }
    
    console.log('Sample data after migration:', data);
    
  } catch (error) {
    console.error('Unexpected error during migration:', error);
  }
}

runMigration();
