"use client"

import { ReactNode } from 'react';
import { AuthProvider } from '../lib/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ProtectedRoute>
                {children}
            </ProtectedRoute>
        </AuthProvider>
    );
}
