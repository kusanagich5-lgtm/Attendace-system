// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: send-push
// Deploy this at: supabase/functions/send-push/index.ts
//
// HOW TO DEPLOY:
//   1. Install Supabase CLI: npm install -g supabase
//   2. Login: supabase login
//   3. Link project: supabase link --project-ref aijmpykzepgrgruzoxfb
//   4. Set secret: supabase secrets set FIREBASE_SERVER_KEY=<your-server-key>
//      (Get server key from Firebase Console → Project Settings → Cloud Messaging → Server key)
//   5. Deploy: supabase functions deploy send-push
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const { personIds, title, body, url = '/' } = await req.json();

    if (!personIds?.length || !title) {
      return new Response(JSON.stringify({ error: 'Missing personIds or title' }), { status: 400 });
    }

    // Get FCM tokens for the specified persons
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: tokenRows, error } = await sb
      .from('push_tokens')
      .select('token')
      .in('person_id', personIds);

    if (error) throw error;
    if (!tokenRows?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No tokens found' }), { status: 200 });
    }

    const tokens = tokenRows.map((r: any) => r.token);

    // Send via FCM HTTP v1 API (legacy send endpoint — works with server key)
    const fcmPayload = {
      registration_ids: tokens,
      notification: { title, body },
      data: { url },
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          title,
          body,
          icon: '/icon-192.png',
          badge: '/icon-96.png',
          click_action: url,
        }
      }
    };

    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmData = await fcmRes.json();

    return new Response(JSON.stringify({ sent: tokens.length, fcm: fcmData }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
