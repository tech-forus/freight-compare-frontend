import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import Cookies from 'js-cookie';
import http from '../lib/http';
import { jwtDecode } from 'jwt-decode';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  useEffect(() => {
    const token = Cookies.get('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (token && storedUser) {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(parsedUser);

        // Check if super admin
        const customer = (parsedUser as any)?.customer;
        const email = customer?.email || parsedUser.email;
        setIsSuperAdmin(email === 'forus@gmail.com');
      } catch (e) {
        console.error("AuthProvider: Failed to parse stored user or token invalid", e);
        Cookies.remove('authToken');
        localStorage.removeItem('authUser');
      }
    }
    setLoading(false); // Auth state is now determined
  }, []);

  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const lowerEmail = email.toLowerCase();

    // Check for super admin credentials
    const isSuperAdminLogin = lowerEmail === 'forus@gmail.com' && pass === 'asdfghjkl';

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
        // Keep full decoded token to preserve `customer` nesting for existing pages
        setIsAuthenticated(true);
        setUser(decodedToken as unknown as AuthUser);
        setIsSuperAdmin(isSuperAdminLogin);
        Cookies.set('authToken', token, { expires: 7 });
        localStorage.setItem('authUser', JSON.stringify(decodedToken));

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
    setIsAuthenticated(false);
    setUser(null);
    setIsSuperAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading, isSuperAdmin }}>
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
