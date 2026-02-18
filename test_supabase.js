require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'NOT SET');
    console.log('Service Key:', supabaseServiceKey ? 'Set' : 'NOT SET');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return;
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    const { data, error, count } = await supabaseAdmin
      .from('flights')
      .select('*', { count: 'exact' })
      .limit(1);
      
    console.log('Supabase response:', { data, error, count });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSupabase();