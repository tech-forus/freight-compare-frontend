import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import http from '../lib/http';
import { jwtDecode } from 'jwt-decode';

// Define the TransporterJwtPayload type according to your JWT payload structure
type TransporterJwtPayload = {
  _id: string;
  email: string;
  phone: number;
  companyName: string;
  isAdmin: boolean;
  isTransporter: boolean;
};

// Define the context type for TransporterAuth
interface TransporterContextType {
  isAuthenticated: boolean;
  user: TransporterJwtPayload | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const TransporterAuthContext = createContext<TransporterContextType | undefined>(undefined);

export const TransporterAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<TransporterJwtPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = Cookies.get('transporterToken');
    const storedUser = localStorage.getItem('transporterUser');

    if (token && storedUser) {
      try {
        const parsedUser: TransporterJwtPayload = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(parsedUser);
      } catch (e) {
        Cookies.remove('transporterToken');
        localStorage.removeItem('transporterUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Use dev proxy/baseURL via http client and correct backend route
      const response = await http.post("/api/transporter/auth/signin", {
        email,
        password: pass,
      });

      if (response.data?.token) {
        const token = response.data.token;
        const decoded = jwtDecode<TransporterJwtPayload>(token);

        setIsAuthenticated(true);
        setUser(decoded);
        Cookies.set('transporterToken', token, { expires: 7 });
        localStorage.setItem('transporterUser', JSON.stringify(decoded));

        return { success: true };
      } else {
        return { success: false, error: "No token in response" };
      }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || "Login failed" };
    }
  };

  const logout = () => {
    Cookies.remove('transporterToken');
    localStorage.removeItem('transporterUser');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <TransporterAuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </TransporterAuthContext.Provider>
  );
};

export const useTransporterAuth = (): TransporterContextType => {
  const context = useContext(TransporterAuthContext);
  if (!context) throw new Error('useTransporterAuth must be used within a TransporterAuthProvider');
  return context;
};
