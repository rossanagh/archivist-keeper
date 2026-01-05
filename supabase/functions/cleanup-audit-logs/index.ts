import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify caller is authenticated and has full_access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check for full_access admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_access')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.full_access) {
      console.error('Full access check failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Full access admin required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Șterge audit logs mai vechi de 72 ore
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .delete()
      .lt('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error deleting old audit logs:', error);
      throw error;
    }

    console.log(`Audit logs cleaned up by admin ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Audit logs cleaned up successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in cleanup-audit-logs function:', error);
    const errorMessage = error instanceof Error ? error.message : "Eroare necunoscută";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
