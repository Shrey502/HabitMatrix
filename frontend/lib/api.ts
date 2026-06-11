import { getAPIUrl } from '../components/dateUtils';

async function refreshAccessToken(): Promise<string | null> {
    try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return null;

        const res = await fetch(`${getAPIUrl()}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            return data.access_token;
        }
        return null;
    } catch (err) {
        console.error('Error refreshing token:', err);
        return null;
    }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : `${getAPIUrl()}${path}`;
    let token = localStorage.getItem('access_token');
    
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    let res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 && token) {
        // Try to refresh
        const newToken = await refreshAccessToken();
        if (newToken) {
            headers.set('Authorization', `Bearer ${newToken}`);
            res = await fetch(url, { ...options, headers });
        } else {
            // Refresh failed, clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
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
