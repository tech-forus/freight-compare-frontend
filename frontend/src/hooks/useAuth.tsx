import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import Cookies from 'js-cookie';
import http from '../lib/http';
import { jwtDecode } from 'jwt-decode';
import { AdminPermissions, DEFAULT_ADMIN_PERMISSIONS } from '../config/adminPermissions';

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
  login: (email: string, pass: string) => Promise<{ success: boolean;  error?: string }>;
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
    const token = Cookies.get('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(parsedUser as AuthUser);

        // Extract admin info using helper
        const adminInfo = extractAdminInfo(parsedUser);
        setIsSuperAdmin(adminInfo.isSuperAdmin);
        setIsAdmin(adminInfo.isAdmin);
        setAdminPermissions(adminInfo.permissions);

      } catch (e) {
        console.error("AuthProvider: Failed to parse stored user or token invalid", e);
        Cookies.remove('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('token');
      }
    }
    setLoading(false); // Auth state is now determined
  }, []);

  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const lowerEmail = email.toLowerCase();

    // ACTUAL API LOGIN
    try {
      // Use Vite dev proxy in development and baseURL in production via http client
      const response = await http.post("/api/auth/login", {
        email: lowerEmail,
        password: pass,
      });

      if (response.data && response.data.token) {
        const token = response.data.token;
        const decodedToken: JwtPayload = jwtDecode(token);

        console.log('[Auth] Login successful, decoded token:', decodedToken);

        // Keep full decoded token to preserve `customer` nesting for existing pages
        setIsAuthenticated(true);
        setUser(decodedToken as unknown as AuthUser);

        // Extract admin info using helper (determines super admin from email in token)
        const adminInfo = extractAdminInfo(decodedToken);
        setIsSuperAdmin(adminInfo.isSuperAdmin);
        setIsAdmin(adminInfo.isAdmin);
        setAdminPermissions(adminInfo.permissions);

        Cookies.set('authToken', token, { expires: 7 });
        localStorage.setItem('authUser', JSON.stringify(decodedToken));
        localStorage.setItem('token', token); // Store raw token for axios interceptor

        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.message || 'Login failed: No token in response.',
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
    Cookies.remove('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('token'); // Also remove raw token
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
