import { getAPIUrl } from '../components/dateUtils';
import { supabase } from './supabaseClient';

async function getAccessToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : `${getAPIUrl()}${path}`;
    const token = await getAccessToken();

    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
        // Try refreshing the session via Supabase
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
            headers.set('Authorization', `Bearer ${session.access_token}`);
            res = await fetch(url, { ...options, headers });
        } else {
            await supabase.auth.signOut();
            if (typeof window !== 'undefined') {
                window.location.href = '/auth';
            }
        }
    }

    return res;
}

export const apiGet = (path: string) => apiFetch(path, { method: 'GET' });
export const apiPost = (path: string, body: any) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = (path: string, body: any) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiPatch = (path: string, body: any) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = (path: string) => apiFetch(path, { method: 'DELETE' });
