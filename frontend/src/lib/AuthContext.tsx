/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiPost, apiGet, clearTokens, setTokens, saveSessionCache, loadSessionCache, stashPlatformTokens, restorePlatformTokens } from './api';
import type { BranchInfo, Session, TenantInfo, UserInfo } from './types';

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  user: Session['user'] | null;
  currentBranch: BranchInfo | null;
  setCurrentBranchId: (id: string) => void;
  login: (username: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  impersonate: (tenantId: string) => Promise<void>;
  exitImpersonation: boolean;
  exitImpersonationFn: () => void;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

const K_BRANCH = 'tl_branch';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(() => loadSessionCache<Session>());
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState<string>(() => localStorage.getItem(K_BRANCH) || '');
  const [exitImpersonation, setExitImpersonation] = useState(false);

  useEffect(() => {
    // validate cached session silently; if tokens were cleared, drop session
    if (session && !localStorage.getItem('tl_access')) {
      setSession(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session?.branches?.length && (!branchId || !session.branches.some((b) => b.id === branchId))) {
      setBranchId(session.branches[0].id);
      localStorage.setItem(K_BRANCH, session.branches[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const applySession = (data: Session & { accessToken: string; refreshToken: string }) => {
    setTokens(data.accessToken, data.refreshToken);
    const clean: Session = { user: data.user, tenant: data.tenant, branches: data.branches, impersonated: data.impersonated };
    saveSessionCache(clean);
    setSession(clean);
    return clean;
  };

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiPost<Session & { accessToken: string; refreshToken: string }>('/auth/login', { username, password });
      const clean = applySession(data);
      setExitImpersonation(false);
      return clean;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('tl_refresh');
    if (refresh) await apiPost('/auth/logout', { refreshToken: refresh }).catch(() => undefined);
    clearTokens();
    setSession(null);
  };

  const reload = async () => {
    const data = await apiGet<Session & { accessToken: string; refreshToken: string }>('/auth/me');
    applySession(data);
  };

  const changePassword = async (current: string, next: string) => {
    const data = await apiPost<Session & { accessToken: string; refreshToken: string }>('/auth/change-password', {
      currentPassword: current,
      newPassword: next,
    });
    applySession(data);
  };

  const impersonate = async (tenantId: string) => {
    stashPlatformTokens();
    const data = await apiPost<Session & { accessToken: string; refreshToken: string }>(`/platform/tenants/${tenantId}/impersonate`);
    applySession(data);
    setExitImpersonation(true);
  };

  const exitImpersonationFn = () => {
    if (restorePlatformTokens()) {
      setSession(loadSessionCache<Session>());
      setExitImpersonation(false);
      window.location.href = '/platform';
    }
  };

  const currentBranch = session?.branches?.find((b) => b.id === branchId) || session?.branches?.[0] || null;

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        user: session?.user || null,
        currentBranch,
        setCurrentBranchId: (id: string) => {
          setBranchId(id);
          localStorage.setItem(K_BRANCH, id);
        },
        login,
        logout,
        reload,
        changePassword,
        impersonate,
        exitImpersonation,
        exitImpersonationFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export type { TenantInfo, UserInfo };
