// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Pincode context provider
import { PincodeProvider } from './context/PincodeContext';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import CalculatorPage from './pages/CalculatorPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import Profile from './pages/Profile';
import ContactUsPage from './pages/ContactUsPage';
import AboutUsPage from './pages/AboutUsPage';
import PricingPage from './pages/PricingPage';
import AddVendor from './pages/AddVendor';
import AddPrices from './pages/AddPrices';
import ZonePriceMatrix from './pages/ZonePriceMatrix';
import ODAUpload from './pages/ODAUpload';
import UserSelect from './pages/UserSelect';
import BiddingPage from './pages/BiddingPage';
import VehicleInfoPage from './pages/VehicleInfoPage';
import TestLab from './pages/TestLab';
import MyVendors from './pages/MyVendors';
import DashboardPage from './pages/DashboardPage';
// ⬇️ NEW: buy page (supports /buy-subscription-plan and /buy-subscription-plan/:vendorSlug)
import BuySubscriptionPage from './pages/BuySubscriptionPage';
import VendorDetailsPage from './pages/VendorDetailsPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import VendorApprovalPage from './pages/VendorApprovalPage';
import UserManagementPage from './pages/UserManagementPage';
import CustomerManagementPage from './pages/CustomerManagementPage';
import TransporterManagementPage from './pages/TransporterManagementPage';
import FormBuilderPage from './pages/FormBuilderPage';

export const PrivateRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-20 text-gray-600">Loading...</div>;
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/signin" replace />;
};

export const PublicRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-20 text-gray-600">Loading...</div>;
  }
  return isAuthenticated ? <Navigate to="/compare" replace /> : <>{children}</>;
};

// Super Admin Route - Hidden access via direct URL only
// Shows login if not authenticated, access denied if not super admin
export const SuperAdminRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isAuthenticated, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return <div className="text-center mt-20 text-gray-600">Loading...</div>;
  }

  // Not logged in → show login page (no MainLayout/header)
  if (!isAuthenticated) {
    return <SignInPage />;
  }

  // Logged in but NOT super admin → show access denied
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">You don't have permission to access this page.</p>
          <a href="/" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Super admin → render content (no header)
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <PincodeProvider>
        <Router>
          <Toaster />
          <Routes>
            {/* --- PROTECTED ROUTES --- */}
            <Route
              path="/addvendor"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <AddVendor />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/zone-price-matrix"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <ZonePriceMatrix />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/oda-upload"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <ODAUpload />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/compare"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <CalculatorPage />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <AdminDashboardPage />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/dashboard"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <CustomerDashboardPage />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/profile"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/addbid"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <BiddingPage />
                  </PrivateRoute>
                </MainLayout>
              }
            />


            {/* SUPER ADMIN ROUTES - No header, direct URL access only */}
            <Route
              path="/super-admin"
              element={
                <SuperAdminRoute>
                  <SuperAdminDashboard />
                </SuperAdminRoute>
              }
            />

            <Route
              path="/super-admin/vendor-approval"
              element={
                <SuperAdminRoute>
                  <VendorApprovalPage />
                </SuperAdminRoute>
              }
            />

            <Route
              path="/super-admin/user-management"
              element={
                <SuperAdminRoute>
                  <UserManagementPage />
                </SuperAdminRoute>
              }
            />

            <Route
              path="/super-admin/user-management/customers"
              element={
                <SuperAdminRoute>
                  <CustomerManagementPage />
                </SuperAdminRoute>
              }
            />

            <Route
              path="/super-admin/user-management/transporters"
              element={
                <SuperAdminRoute>
                  <TransporterManagementPage />
                </SuperAdminRoute>
              }
            />

            <Route
              path="/super-admin/form-builder"
              element={
                <SuperAdminRoute>
                  <FormBuilderPage />
                </SuperAdminRoute>
              }
            />

            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/calculate" element={<CalculatorPage />} />

            {/* --- PUBLIC ROUTES --- */}
            <Route
              path="/addprice"
              element={
                <MainLayout>
                  <PublicRoute>
                    <AddPrices />
                  </PublicRoute>
                </MainLayout>
              }
            />

            <Route
              path="/signin"
              element={
                <MainLayout>
                  <PublicRoute>
                    <SignInPage />
                  </PublicRoute>
                </MainLayout>
              }
            />
            <Route
              path="/signup"
              element={
                <MainLayout>
                  <PublicRoute>
                    <SignUpPage />
                  </PublicRoute>
                </MainLayout>
              }
            />
            <Route
              path="/userselect"
              element={
                <MainLayout>
                  <PublicRoute>
                    <UserSelect />
                  </PublicRoute>
                </MainLayout>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <MainLayout>
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                </MainLayout>
              }
            />

            <Route path="/" element={<LandingPage />} />
            <Route
              path="/contact"
              element={
                <MainLayout>
                  <ContactUsPage />
                </MainLayout>
              }
            />
            <Route
              path="/about"
              element={
                <MainLayout>
                  <AboutUsPage />
                </MainLayout>
              }
            />
            <Route
              path="/pricing"
              element={
                <MainLayout>
                  <PricingPage />
                </MainLayout>
              }
            />
            <Route
              path="/vehicle-info"
              element={
                <MainLayout>
                  <VehicleInfoPage />
                </MainLayout>
              }
            />

            <Route
              path="/my-vendors"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <MyVendors />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/transporterdetails/:id"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <VendorDetailsPage />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            {/* Test Lab (public) */}
            <Route
              path="/test-lab"
              element={
                <MainLayout>
                  <TestLab />
                </MainLayout>
              }
            />

            {/* ⬇️ NEW PUBLIC ROUTES for the buy page (with optional vendor slug) */}
            <Route
              path="/buy-subscription-plan"
              element={
                <MainLayout>
                  <BuySubscriptionPage />
                </MainLayout>
              }
            />
            <Route
              path="/buy-subscription-plan/:vendorSlug"
              element={
                <MainLayout>
                  <BuySubscriptionPage />
                </MainLayout>
              }
            />

            {/* --- 404 --- */}
            <Route
              path="*"
              element={
                <MainLayout>
                  <NotFoundPage />
                </MainLayout>
              }
            />
          </Routes>
        </Router>
      </PincodeProvider>
    </AuthProvider>
  );
}

export default App;
