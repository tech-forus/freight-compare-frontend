/**
 * User Management API Service
 * Handles all API calls for Super Admin user management
 */

import http from '../lib/http';
import { API_BASE_URL } from '../config/api';

// Use centralized API configuration (note: http instance already uses this)
const API_BASE = API_BASE_URL;

export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: number;
  whatsappNumber?: number;
  companyName: string;
  gstNumber: string;
  address: string;
  state: string;
  pincode: number;
  businessType?: string;
  products?: string;
  isSubscribed: boolean;
  isTransporter: boolean;
  isAdmin: boolean;
  tokenAvailable: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transporter {
  _id: string;
  companyName: string;
  phone: number;
  email: string;
  gstNo: string;
  address: string;
  state: string;
  pincode: number;
  deliveryMode?: string;
  experience?: number;
  noOfTrucks?: number;
  isAdmin: boolean;
  isTransporter: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformStats {
  customers: {
    total: number;
    subscribed: number;
    unsubscribed: number;
    recentSignups: number;
  };
  vendors: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
    recentAdditions: number;
  };
  transporters: {
    total: number;
  };
}

/**
 * Get platform statistics
 */
export const getPlatformStats = async (): Promise<PlatformStats> => {
  try {
    const response = await http.get('/api/admin/management/stats');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch platform stats:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
  }
};

/**
 * Get all customers
 */
export const getAllCustomers = async (params?: {
  search?: string;
  status?: 'subscribed' | 'unsubscribed';
  page?: number;
  limit?: number;
}): Promise<{
  customers: Customer[];
  pagination: any;
  stats: any;
}> => {
  try {
    const response = await http.get('/api/admin/management/customers', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch customers:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch customers');
  }
};

/**
 * Get single customer by ID
 */
export const getCustomerById = async (id: string): Promise<Customer> => {
  try {
    const response = await http.get(`/api/admin/management/customers/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch customer:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch customer');
  }
};

/**
 * Update customer subscription status
 */
export const updateCustomerSubscription = async (
  id: string,
  isSubscribed: boolean
): Promise<Customer> => {
  try {
    const response = await http.put(`/api/admin/management/customers/${id}/subscription`, {
      isSubscribed,
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to update subscription:', error);
    throw new Error(error.response?.data?.message || 'Failed to update subscription');
  }
};

/**
 * Update customer details
 */
export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer> => {
  try {
    const response = await http.put(`/api/admin/management/customers/${id}`, updates);
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to update customer:', error);
    throw new Error(error.response?.data?.message || 'Failed to update customer');
  }
};

/**
 * Delete customer
 */
export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    await http.delete(`/api/admin/management/customers/${id}`);
  } catch (error: any) {
    console.error('Failed to delete customer:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete customer');
  }
};

/**
 * Get all main transporters
 */
export const getAllTransporters = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  transporters: Transporter[];
  pagination: any;
}> => {
  try {
    const response = await http.get('/api/admin/management/transporters', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch transporters:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch transporters');
  }
};
