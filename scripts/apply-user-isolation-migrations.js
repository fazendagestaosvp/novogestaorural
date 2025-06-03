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

async function runMigrations() {
  try {
    console.log('Starting migrations for user data isolation...');
    
    // Read the SQL files
    const horseTableSqlPath = path.join(process.cwd(), 'scripts', 'add-user-id-to-horse-table.sql');
    const cattleTableSqlPath = path.join(process.cwd(), 'scripts', 'add-user-id-to-cattle-table.sql');
    const healthRecordsTableSqlPath = path.join(process.cwd(), 'scripts', 'add-user-id-to-health-records-table.sql');
    const documentsTableSqlPath = path.join(process.cwd(), 'scripts', 'add-user-id-to-documents-table.sql');
    
    const horseSql = fs.readFileSync(horseTableSqlPath, 'utf8');
    const cattleSql = fs.readFileSync(cattleTableSqlPath, 'utf8');
    const healthRecordsSql = fs.readFileSync(healthRecordsTableSqlPath, 'utf8');
    const documentsSql = fs.readFileSync(documentsTableSqlPath, 'utf8');
    
    // Execute the horse table migration
    console.log('Applying migration to horse table...');
    const { error: horseError } = await supabase.rpc('exec_sql', { sql: horseSql });
    
    if (horseError) {
      console.error('Error executing horse table migration:', horseError);
    } else {
      console.log('Horse table migration completed successfully!');
    }
    
    // Execute the cattle table migration
    console.log('Applying migration to cattle table...');
    const { error: cattleError } = await supabase.rpc('exec_sql', { sql: cattleSql });
    
    if (cattleError) {
      console.error('Error executing cattle table migration:', cattleError);
    } else {
      console.log('Cattle table migration completed successfully!');
    }
    
    // Execute the health_records table migration
    console.log('Applying migration to health_records table...');
    const { error: healthRecordsError } = await supabase.rpc('exec_sql', { sql: healthRecordsSql });
    
    if (healthRecordsError) {
      console.error('Error executing health_records table migration:', healthRecordsError);
    } else {
      console.log('Health records table migration completed successfully!');
    }
    
    // Execute the documents table migration
    console.log('Applying migration to documents table...');
    const { error: documentsError } = await supabase.rpc('exec_sql', { sql: documentsSql });
    
    if (documentsError) {
      console.error('Error executing documents table migration:', documentsError);
    } else {
      console.log('Documents table migration completed successfully!');
    }
    
    // Verify the changes
    console.log('Verifying changes...');
    
    // Check if the user_id column exists in the horse table
    const { data: horseColumns, error: horseColumnsError } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'horse' AND column_name = 'user_id'" 
      });
    
    if (horseColumnsError) {
      console.error('Error verifying horse table:', horseColumnsError);
    } else {
      const hasUserIdColumn = horseColumns && horseColumns.length > 0;
      console.log(`Horse table user_id column exists: ${hasUserIdColumn ? 'Yes' : 'No'}`);
    }
    
    // Check if the user_id column exists in the cattle table
    const { data: cattleColumns, error: cattleColumnsError } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'cattle' AND column_name = 'user_id'" 
      });
    
    if (cattleColumnsError) {
      console.error('Error verifying cattle table:', cattleColumnsError);
    } else {
      const hasUserIdColumn = cattleColumns && cattleColumns.length > 0;
      console.log(`Cattle table user_id column exists: ${hasUserIdColumn ? 'Yes' : 'No'}`);
    }
    
    // Check if the user_id column exists in the health_records table
    const { data: healthRecordsColumns, error: healthRecordsColumnsError } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'health_records' AND column_name = 'user_id'" 
      });
    
    if (healthRecordsColumnsError) {
      console.error('Error verifying health_records table:', healthRecordsColumnsError);
    } else {
      const hasUserIdColumn = healthRecordsColumns && healthRecordsColumns.length > 0;
      console.log(`Health records table user_id column exists: ${hasUserIdColumn ? 'Yes' : 'No'}`);
    }
    
    // Check if the user_id column exists in the documents table
    const { data: documentsColumns, error: documentsColumnsError } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'user_id'" 
      });
    
    if (documentsColumnsError) {
      console.error('Error verifying documents table:', documentsColumnsError);
    } else {
      const hasUserIdColumn = documentsColumns && documentsColumns.length > 0;
      console.log(`Documents table user_id column exists: ${hasUserIdColumn ? 'Yes' : 'No'}`);
    }
    
    console.log('All migrations completed!');
    
  } catch (error) {
    console.error('Unexpected error during migrations:', error);
  }
}

runMigrations();
