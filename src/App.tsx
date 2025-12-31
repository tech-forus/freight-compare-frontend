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

            <Route
              path="/super-admin"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <SuperAdminDashboard />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/super-admin/vendor-approval"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <VendorApprovalPage />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/super-admin/user-management"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <UserManagementPage />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/super-admin/user-management/customers"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <CustomerManagementPage />
                  </PrivateRoute>
                </MainLayout>
              }
            />

            <Route
              path="/super-admin/user-management/transporters"
              element={
                <MainLayout>
                  <PrivateRoute>
                    <TransporterManagementPage />
                  </PrivateRoute>
                </MainLayout>
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
