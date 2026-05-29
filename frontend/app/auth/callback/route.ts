import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { api } from '../../../lib/api';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Check Spotify Premium
  if (!session.provider_token) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=no_provider_token`);
  }

  try {
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${session.provider_token}` },
    });
    const me = await meRes.json() as { product: string; id: string; display_name: string; images: { url: string }[] };

    if (me.product !== 'premium') {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=not_premium`);
    }

    // Update profile
    await supabase.from('profiles').upsert({
      id: session.user.id,
      spotify_id: me.id,
      display_name: me.display_name,
      is_premium: true,
      avatar_url: me.images?.[0]?.url,
    });

    // Store Spotify tokens via backend
    const accessToken = session.access_token;
    await api.post(
      '/auth/store-spotify-tokens',
      {
        spotifyAccessToken: session.provider_token,
        spotifyRefreshToken: session.provider_refresh_token,
        expiresIn: 3600,
      },
      accessToken,
    ).catch(() => null); // Non-fatal if backend not ready

  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=spotify_check_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
