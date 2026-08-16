import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization token');

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) throw new Error('Invalid or expired session');

    const { data: profile, error: profileError } = await callerClient.from('user_profiles').select('role, is_active').eq('id', caller.id).single();
    if (profileError || profile?.role !== 'admin' || profile?.is_active === false) throw new Error('Administrator access required');

    const { email, password, fullName, role, commissionRate = 0 } = await req.json();
    if (!email || !password || !fullName || !role) throw new Error('Email, password, full name and role are required');
    if (!['admin', 'manager', 'sales_rep'].includes(role)) throw new Error('Invalid role');
    if (String(password).length < 8) throw new Error('Password must contain at least 8 characters');

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(), password, email_confirm: true,
      user_metadata: { full_name: fullName, role }
    });
    if (createError) throw createError;

    const { error: upsertError } = await admin.from('user_profiles').upsert({
      id: created.user.id, email: created.user.email, full_name: fullName, role,
      commission_rate: Number(commissionRate) || 0, is_active: true
    }, { onConflict: 'id' });
    if (upsertError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw upsertError;
    }

    return Response.json({ success: true, userId: created.user.id, email: created.user.email }, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ success: false, error: message, message }, { status: /access|required|session|token/i.test(message) ? 403 : 400, headers: cors });
  }
});
