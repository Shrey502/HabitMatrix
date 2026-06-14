"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { apiGet, apiPost } from './api';

interface User {
    name: string;
    email: string;
    onboarding_completed: boolean;
    settings?: any;
    chronotype?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: { email: string; password: string }) => Promise<boolean>;
    register: (data: { name: string; email: string; password: string }) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check existing session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchUserProfile();
            } else {
                setIsLoading(false);
            }
        });

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchUserProfile();
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const res = await apiGet('/api/auth/me');
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (data: { email: string; password: string }) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });
            if (error) {
                console.error('Login error:', error.message);
                throw error;
            }
            return true;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const register = async (data: { name: string; email: string; password: string }) => {
        try {
            const response = await apiPost('/api/auth/register', data);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            // After successful registration, log the user in immediately
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (signInError) {
                console.error('Login after registration error:', signInError.message);
                throw signInError;
            }

            return true;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
