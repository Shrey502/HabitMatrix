"use client"

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';

const publicRoutes = ['/', '/auth', '/workflow'];

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !isAuthenticated && pathname && !publicRoutes.includes(pathname)) {
            router.push('/auth');
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    if (isLoading) {
        return (
            <div className="w-full h-full min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 font-mono">
                INITIALIZING_ENGINE...
            </div>
        );
    }

    if (!isAuthenticated && pathname && !publicRoutes.includes(pathname)) {
        return null;
    }

    return <>{children}</>;
}
