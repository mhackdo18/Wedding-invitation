import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
  slug: string | null;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const parts = raw.split('/').filter(Boolean);
  const params: Record<string, string> = {};

  // /i/:token or /invite/:token -> invitation
  if ((parts[0] === 'i' || parts[0] === 'invite') && parts[1]) {
    params.token = parts[1];
    return { path: 'invitation', params, slug: null };
  }
  // /admin or /admin/:section
  if (parts[0] === 'admin') {
    if (parts[1]) return { path: 'admin/' + parts.slice(1).join('/'), params, slug: null };
    return { path: 'admin', params, slug: null };
  }
  // /coordinator -> coordinator portal
  if (parts[0] === 'coordinator') {
    return { path: 'coordinator', params, slug: null };
  }
  // /rsvp -> dedicated RSVP page
  if (parts[0] === 'rsvp') {
    return { path: 'rsvp', params, slug: null };
  }
  // /guest-portal -> guest self-service registration
  if (parts[0] === 'guest-portal') {
    return { path: 'guest-portal', params, slug: null };
  }
  // default -> single-page scroll
  return { path: 'public', params, slug: null };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse());
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to: string) {
  window.location.hash = to;
}
