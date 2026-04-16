import React, { useEffect, useState } from "react";
import {
  LogoutOutlined,
  UserOutlined,
  BellFilled,
  DownOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { Dropdown, message, Menu, Popover, Badge, List, Avatar, Empty } from "antd";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import companyLogo from "../assets/Company_logo.png";
import BranchSelector from "../BranchSelector";
import dashboardService from "../../dashboard/service/dashboardService";

const HeaderBar = ({ collapsed, setCollapsed }) => {
  const { theme, headerBgColor, headerGradient } = useTheme();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    fetchNotifications();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const response = await dashboardService.getDashboardData('today');
      if (response.data && response.data.lowStockProducts) {
        setNotifications(response.data.lowStockProducts.map(p => ({
          type: 'low_stock',
          id: p.product_id,
          title: 'Low Stock Alert',
          message: `Only ${p.quantity} units of ${p.product_name} left!`,
          product_code: p.product_code
        })));
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      message.success("Logged out");
      navigate("/");
    } else if (key === "profile") {
      navigate("/settings");
    }
  };

  // user menu (AntD Menu)
  const userMenuItems = {
    items: [
      {
        key: "profile",
        icon: <UserOutlined />,
        label: "Profile",
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Logout",
        danger: true,
      },
    ],
    onClick: handleMenuClick,
  };

  // Dummy recent bills for notifications
  const recentBills = [
    { id: 1, customer: "John Doe", amount: 1280.5 },
    { id: 2, customer: "Alice Rao", amount: 560.0 },
    { id: 3, customer: "Mohan Kumar", amount: 2300.75 },
  ];

  const notificationContent = (
    <div style={{ minWidth: 300, maxHeight: 400, overflowY: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Notifications</span>
        <Badge status={notifications.length > 0 ? "error" : "default"} text={`${notifications.length} Alerts`} />
      </div>
      {notifications.length > 0 ? (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{ padding: '12px 16px', cursor: 'pointer' }}
              onClick={() => {
                navigate(`/Product/list?search=${item.product_code}`);
              }}
              className="hover:bg-gray-50 transition-colors"
            >
              <List.Item.Meta
                avatar={<Avatar icon={<AlertTriangle style={{ color: '#ff4d4f', width: 14 }} />} style={{ backgroundColor: '#fff1f0' }} />}
                title={<span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>}
                description={<span style={{ fontSize: 12 }}>{item.message}</span>}
              />
            </List.Item>
          )}
        />
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
           <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No new notifications" />
        </div>
      )}
      <div style={{ textAlign: "center", padding: 8, borderTop: "1px solid #f0f0f0" }}>
        <a onClick={() => navigate('/dashboard')}>View all in Dashboard</a>
      </div>
    </div>
  );

  const isGradient = headerGradient && headerGradient.includes("gradient");
  const headerStyle = isGradient
    ? { background: headerGradient }
    : { backgroundColor: headerBgColor || "#ffffff" };

  const textColor = theme === "dark" || isGradient ? "#fff" : "#000";

  return (
    <div
      className="flex justify-between items-center px-6 py-2 transition-all duration-300"
      style={{
        ...headerStyle,
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        borderBottom: theme === "dark" ? "1px solid #374151" : "1px solid #f3f4f6",
      }}
    >
      {/* Left side: Collapse Button */}
      <div
        className="cursor-pointer p-2 rounded-lg hover:bg-gray-100  transition-colors"
        onClick={() => setCollapsed(!collapsed)}
        style={{ color: textColor }}
      >
        {collapsed ? (
          <MenuUnfoldOutlined style={{ fontSize: 20 }} />
        ) : (
          <MenuFoldOutlined style={{ fontSize: 20 }} />
        )}
      </div>

      {/* Right side: notifications + user */}
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Branch Selector */}
        <BranchSelector />

        {/* Notifications */}
        <Popover
          content={notificationContent}
          trigger="click"
          placement="bottomRight"
          overlayInnerStyle={{ borderRadius: "12px", padding: 0 }}
        >
          <Badge count={notifications.length} offset={[-2, 2]} size="small">
            <div
              className="cursor-pointer p-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: theme === "dark" ? "rgba(255,255,255,0.05)" : "#F3F4F6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
              }}
            >
              <BellFilled style={{ fontSize: 20, color: theme === "dark" ? "#D1D5DB" : "#4B5563" }} />
            </div>
          </Badge>
        </Popover>

        {/* User dropdown */}
        <Dropdown menu={userMenuItems} placement="bottomRight" trigger={["click"]}>
          <div
            className="cursor-pointer flex items-center gap-3 p-1 pr-3 rounded-full border border-transparent hover:border-gray-200 transition-all duration-200"
            style={{
              background: theme === "dark" ? "rgba(255,255,255,0.05)" : "#ffffff",
              boxShadow: theme === "dark" ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600"
              style={{ width: 36, height: 36 }}
            >
              <UserOutlined style={{ fontSize: 18 }} />
            </div>
            <span className="text-sm font-medium hidden sm:block" style={{ color: textColor }}>
              Admin
            </span>
            <DownOutlined style={{ fontSize: 10, color: theme === "dark" ? "#9CA3AF" : "#9CA3AF" }} />
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default HeaderBar;
