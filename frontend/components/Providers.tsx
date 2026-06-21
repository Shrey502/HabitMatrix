"use client"

import { ReactNode } from 'react';
import { AuthProvider } from '../lib/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import dynamic from 'next/dynamic';

const FocusDeck = dynamic(() => import('./FocusDeck'), { ssr: false });

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ProtectedRoute>
                {children}
                <FocusDeck />
            </ProtectedRoute>
        </AuthProvider>
    );
}
