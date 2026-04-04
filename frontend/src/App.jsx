import { Suspense, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/Mainlayout";
import {
  LayoutDashboard,
  IndianRupee,
  Box,
  Tags,
  Layers,
  ShoppingCart,
  Database,
  Users,
  Percent,
  User,
  BarChart,
  Megaphone
} from "lucide-react";
import CustomerBillCopy from "./billing/pages/CustomerBillCopy";
import CustomerBillForm from "./billing/pages/CustomerBillingForm";
import Login from "./login/Login";
import ProtectedRoute from "./context/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { BranchProvider } from "./context/BranchContext";
import Loading from "./utils/Loading";
import Settings from "./components/pages/Settings";
import ComingSoon from "./billing/pages/ComingSoon";

const routeModules = import.meta.glob("./*/AppRoutes.jsx", { eager: true });

const moduleIcons = {
  dashboard: <LayoutDashboard size={20} />,
  billing: <IndianRupee size={20} />,
  Product: <Box size={20} />,
  Category: <Tags size={20} />,
  subcategory: <Layers size={20} />,
  inward: <ShoppingCart size={20} />,
  stock: <Database size={20} />,
  customer: <Users size={20} />,
  coupon: <Percent size={20} />,
  user: <User size={20} />,
  marketing: <Megaphone size={20} />,
};
const App = () => {
  const modules = Object.entries(routeModules).map(([path, mod]) => {
    const match = path.match(/\.\/(.*?)\/AppRoutes\.jsx$/);
    const name = match?.[1];

    return {
      name,
      path: `/${name}/*`,
      element: mod.default,
      menuItems: mod[`${name}MenuItems`] || [],
    };
  });

  const menuItems = useMemo(() => {
    const items = modules
      .filter(({ name }) => name !== "Category" && name !== "subcategory")
      .map(({ name, menuItems }) => {

        // Dashboard direct route
        if (name === "dashboard") {
          return {
            key: "/dashboard",
            icon: moduleIcons[name] || null,
            label: "Dashboard",
            children: null,
          };
        }

        // ✅ If only ONE child → make it direct route
        if (menuItems && menuItems.length === 1) {
          return {
            key: menuItems[0].key,   // use actual child route
            icon: moduleIcons[name] || null,
            label: name.charAt(0).toUpperCase() + name.slice(1),
            children: null,
          };
        }

        // ✅ If MULTIPLE children → dropdown
        if (menuItems && menuItems.length > 1) {
          return {
            key: name,
            icon: moduleIcons[name] || null,
            label: name.charAt(0).toUpperCase() + name.slice(1),
            children: menuItems,
          };
        }

        // ✅ If NO children → direct route fallback
        return {
          key: `/${name}`,
          icon: moduleIcons[name] || null,
          label: name.charAt(0).toUpperCase() + name.slice(1),
          children: null,
        };
      });

    // Add Sales Report manually
    items.push({
      key: "/billing/reports",
      label: "Sales Report",
      icon: <BarChart size={20} />,
      children: null
    });

    // Keep dashboard first
    items.sort((a, b) => {
      if (a.key === "/dashboard") return -1;
      if (b.key === "/dashboard") return 1;
      return 0;
    });

    return items;
  }, [modules]);

  const getDefaultRedirect = () => {
    const filteredModules = modules.filter((mod) => mod.name !== "dashboard");
    return filteredModules.length > 0
      ? `/${filteredModules[0].name}/pages/dashboard`
      : "/404";
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <BranchProvider>
          <Loading duration={3000} />
          <Suspense fallback={<div className="p-4"><Loading /></div>}>
            <Routes>
              {/* Public/Login routes */}
              <Route path="/" element={<Login />} />

              {/* Routes WITHOUT sidebar/header */}
              <Route
                path="/billing/customer-copy"
                element={
                  <ProtectedRoute>
                    <CustomerBillCopy />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing/customer-add"
                element={
                  <ProtectedRoute>
                    <CustomerBillForm />
                  </ProtectedRoute>
                }
              />

              {/* Routes WITH sidebar/header */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout menuItems={menuItems} />
                  </ProtectedRoute>
                }
              >
                {/* Default redirect */}
                <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />

                {modules.map(({ name, path, element: Element }) => (
                  <Route
                    key={name}
                    path={path}
                    element={
                      <ProtectedRoute>
                        <Element />
                      </ProtectedRoute>
                    }
                  />
                ))}

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="*"
                  element={<div className="p-4 text-red-500">404 - Page Not Found</div>}
                />
              </Route>
            </Routes>
          </Suspense>
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>


  );
};

export default App;
