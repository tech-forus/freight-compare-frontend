import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import http from '../lib/http';
import { AdminPermissions, DEFAULT_ADMIN_PERMISSIONS } from '../config/adminPermissions';
import { useAuthHeartbeat } from './useAuthHeartbeat';

// Matches backend JWT which nests user under `customer`
interface JwtPayload {
  customer?: AuthUser;
  // Back-compat in case token shape changes
  _id?: string;
  email?: string;
  name?: string;
  companyName?: string;
  contactNumber?: string;
  gstNumber?: string;
  address?: string;
  state?: string;
  pincode?: number;
  pickUpAddress?: string[];
  isAdmin?: boolean;
  adminPermissions?: AdminPermissions;
  iat?: number;
  exp?: number;
}

interface AuthUser {
  _id: string;
  email: string;
  name: string;
  companyName?: string;
  contactNumber?: string;
  gstNumber?: string;
  address?: string;
  state?: string;
  pincode?: number;
  pickUpAddress?: string[];
  isAdmin?: boolean;
  adminPermissions?: AdminPermissions;
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  adminPermissions: AdminPermissions | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions | null>(null);

  // Silent heartbeat: ping /api/auth/me every 60s when authenticated
  useAuthHeartbeat(isAuthenticated);

  // Helper function to extract admin info from token/user object
  const extractAdminInfo = (data: any): {
    isAdmin: boolean;
    isSuperAdmin: boolean;
    permissions: AdminPermissions | null;
    email: string | null;
  } => {
    // Try to get customer object (JWT nests user under 'customer')
    const customer = data?.customer || data;
    const email = customer?.email || data?.email || null;

    // Super admin check
    const isSuperAdminUser = email?.toLowerCase() === 'forus@gmail.com';

    // Admin status
    const userIsAdmin = customer?.isAdmin === true || data?.isAdmin === true;

    // Admin permissions - try multiple sources
    let permissions: AdminPermissions | null = null;
    if (customer?.adminPermissions) {
      permissions = customer.adminPermissions;
    } else if (data?.adminPermissions) {
      permissions = data.adminPermissions;
    } else if (userIsAdmin) {
      // If admin but no permissions set, use defaults
      permissions = { ...DEFAULT_ADMIN_PERMISSIONS };
    }

    console.log('[Auth] Extracted admin info:', {
      email,
      isAdmin: userIsAdmin,
      isSuperAdmin: isSuperAdminUser,
      permissions
    });

    return {
      isAdmin: userIsAdmin,
      isSuperAdmin: isSuperAdminUser,
      permissions,
      email
    };
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // Fast UX: restore state from localStorage while we verify with the server
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setIsAuthenticated(true);
          setUser(parsedUser as AuthUser);
          const adminInfo = extractAdminInfo(parsedUser);
          setIsSuperAdmin(adminInfo.isSuperAdmin);
          setIsAdmin(adminInfo.isAdmin);
          setAdminPermissions(adminInfo.permissions);
        } catch (e) {
          console.error("AuthProvider: Failed to parse stored user", e);
        }
      }

      // Verify the session by calling /api/auth/me (uses the httpOnly cookie automatically)
      try {
        console.log('[Auth] Fetching fresh user data from /api/auth/me...');
        const response = await http.get('/api/auth/me');

        if (response.data.success && response.data.customer) {
          const freshCustomer = response.data.customer;
          const freshUser = { customer: freshCustomer };

          localStorage.setItem('authUser', JSON.stringify(freshUser));
          setUser(freshUser as unknown as AuthUser);
          setIsAuthenticated(true);

          const adminInfo = extractAdminInfo(freshUser);
          setIsSuperAdmin(adminInfo.isSuperAdmin);
          setIsAdmin(adminInfo.isAdmin);
          setAdminPermissions(adminInfo.permissions);
        }
      } catch (error: any) {
        console.error('[Auth] Failed to fetch fresh user data:', error.response?.data || error.message);

        if (error.response?.status === 401) {
          // Cookie expired or invalid — clear local state
          localStorage.removeItem('authUser');
          setIsAuthenticated(false);
          setUser(null);
          setIsSuperAdmin(false);
          setIsAdmin(false);
          setAdminPermissions(null);
        }
        // For network errors, keep localStorage data as optimistic fallback
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const lowerEmail = email.toLowerCase();

    try {
      // Login — the server sets httpOnly cookies (authToken + refreshToken) in the response.
      // The token is NOT returned in the JSON body anymore.
      const response = await http.post("/api/auth/login", {
        email: lowerEmail,
        password: pass,
      });

      if (response.data?.customer) {
        // Use the customer object returned directly from the login response
        const freshCustomer = response.data.customer;
        const freshUser = { customer: freshCustomer };

        console.log('[Auth] Login successful:', freshCustomer.email);

        setIsAuthenticated(true);
        setUser(freshUser as unknown as AuthUser);

        const adminInfo = extractAdminInfo(freshUser);
        setIsSuperAdmin(adminInfo.isSuperAdmin);
        setIsAdmin(adminInfo.isAdmin);
        setAdminPermissions(adminInfo.permissions);

        // Store non-sensitive user profile in localStorage for fast page-load UX
        localStorage.setItem('authUser', JSON.stringify(freshUser));

        return { success: true };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Login failed.',
        };
      }
    } catch (error: any) {
      console.error("useAuth login: API call failed.", error.response?.data || error.message);
      let errorMessage = 'Login failed. Please check your credentials or network.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    // Fire-and-forget: ask the server to clear the httpOnly cookies and invalidate the refresh token.
    // We don't await because the UI should respond immediately regardless.
    http.post('/api/auth/logout').catch(() => { /* ignore errors on logout */ });

    localStorage.removeItem('authUser');
    setIsAuthenticated(false);
    setUser(null);
    setIsSuperAdmin(false);
    setIsAdmin(false);
    setAdminPermissions(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      logout,
      loading,
      isSuperAdmin,
      isAdmin,
      adminPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
