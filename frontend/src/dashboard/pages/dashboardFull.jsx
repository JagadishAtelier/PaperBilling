// src/components/dashboard/DashboardFull.jsx
import React, { useEffect, useState } from "react";
import { Row, Col, Card, Typography, Skeleton, Select, Tag, Table, Empty } from "antd";
import StatCard from "./StatCard";
import { Tooltip } from "antd";
import {
  IndianRupee, Users, ShoppingBasket, Wallet, TrendingUp, AlertTriangle, Package, ShoppingCart
} from 'lucide-react';
import dashboardService from "../service/dashboardService";
import { useBranch } from "../../context/BranchContext";

import BillDetailsModal from "./BillDetailsModal";

const { Title, Text } = Typography;
const { Option } = Select;
import { useNavigate } from "react-router-dom";

const styles = {
  page: { padding: 6, minHeight: "100vh", width: "100%" },
  roundedCard: { borderRadius: 14, boxShadow: "0 6px 18px rgba(15,23,42,0.06)" },
};

const DashboardFull = () => {
  const [period, setPeriod] = useState("today");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedBranch } = useBranch();

  // Bill Modal State
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null); // Add state for object
  const [billModalVisible, setBillModalVisible] = useState(false);
  const navigate = useNavigate();

  const handleBillClick = (record) => {
    // Try to get ID from standard fields
    const id = record.id || record.billing_id || record._id;
    if (!id) {
      console.warn("Bill record missing ID:", record);
      // Fallback to billing_no if numeric ID is not required by API? 
      // Likely API needs ID. Showing error via modal content.
    }
    setSelectedBillId(id);
    setSelectedBill(record); // Set the record object
    setBillModalVisible(true);
  };

  const handleProductClick = (record) => {
    // Assuming product list accepts search param via URL or state
    // Passing it as query parameter 'search'
    navigate(`/product/list?search=${encodeURIComponent(record.product_code)}`);
  };
  const handleLowStockClick = (record) => {
  navigate(`/inward/add?product=${record.product_code}&qty=${record.quantity}&min=${record.product?.min_stock || 10}`);
};

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, selectedBranch]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getDashboardData(period);
      setDashboardData(response.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "0";

    const format = (value, suffix) => {
      const formatted = (num / value).toFixed(1);
      return formatted.endsWith(".0")
        ? Math.floor(num / value) + suffix
        : formatted + suffix;
    };

    if (num >= 10000000) return format(10000000, "Cr");
    if (num >= 100000) return format(100000, "L");
    if (num >= 1000) return format(1000, "K");

    return num.toString();
  };
  // Prepare summary cards
  const summaryCards = dashboardData ? [
    {
      id: "revenue",
      title: "Total Revenue",
      value: (
        <Tooltip title={`₹${dashboardData.summary.totalRevenue}`}>
          <span>
            ₹{formatNumber(dashboardData.summary.totalRevenue)}
          </span>
        </Tooltip>
      ),
      meta: `Period: ₹${dashboardData.summary.periodRevenue}`,
      gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)",
      icon: <Wallet />,
      onClick: () => navigate('/billing/reports'),
    },
    {
      id: "bills",
      title: "Total Bills",
      value: dashboardData.summary.totalBills,
      meta: `Period: ${dashboardData.summary.periodBills} bills`,
      gradient: "linear-gradient(135deg,#ff8a00,#ff5e3a)",
      icon: <IndianRupee />,
      onClick: () => navigate('/billing/list'),
    },
    {
      id: "customers",
      title: "Total Customers",
      value: dashboardData.summary.totalCustomers,
      meta: "Registered customers",
      gradient: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
      icon: <Users />,
      onClick: () => navigate('/customer/list'),
    },
    {
      id: "products",
      title: "Total Products",
      value: dashboardData.summary.totalProducts,
      meta: `Stock: ${dashboardData.summary.totalStockQuantity} items`,
      gradient: "linear-gradient(135deg,#059669,#34d399)",
      icon: <ShoppingBasket />,
      onClick: () => navigate('/Product/list'),
    },
  ] : [];

  // Recent bills columns
  const recentBillsColumns = [
    {
      title: "Bill No",
      dataIndex: "billing_no",
      key: "billing_no",
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: "Customer",
      dataIndex: "customer_name",
      key: "customer_name",
    },
    {
      title: "Phone",
      dataIndex: "customer_phone",
      key: "customer_phone",
    },
    {
      title: "Amount",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (amount) => `₹${amount}`,
      align: "right"
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method) => <Tag>{method}</Tag>
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === 'paid' ? 'green' : status === 'pending' ? 'orange' : 'red'}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
  ];

  // Top products columns
  const topProductsColumns = [
    {
      title: "Product",
      dataIndex: "product_name",
      key: "product_name",
      render: (text, record) => (
        <div>
          <div><Text strong>{text}</Text></div>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{record.product_code}</Text></div>
        </div>
      )
    },
    {
      title: "Sold",
      dataIndex: "total_quantity",
      key: "total_quantity",
      align: "center"
    },
    {
      title: "Revenue",
      dataIndex: "total_revenue",
      key: "total_revenue",
      render: (amount) => `₹${amount}`,
      align: "right"
    },
  ];

  // Low stock columns
  const lowStockColumns = [
    {
      title: "Product",
      dataIndex: "product_name",
      key: "product_name",
      render: (text, record) => (
        <div>
          <div><Text strong>{text}</Text></div>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{record.product_code}</Text></div>
        </div>
      )
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      render: (qty) => <Tag color="red">{qty}</Tag>,
      align: "center"
    },
    {
      title: "Alert At",
      dataIndex: ["product", "min_stock"],
      key: "min_stock",
      render: (min) => <Text type="secondary">{min || 10}</Text>,
      align: "center"
    },
    {
      title: "Details",
      key: "details",
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          {record.size && <Tag>{record.size}</Tag>}
          {record.color && <Tag>{record.color}</Tag>}
        </div>
      )
    },
  ];

  return (
    <div style={styles.page}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Dashboard
          </Title>
          {selectedBranch && (
            <Text type="secondary">
              {selectedBranch.name === "All Branches" ? "All Branches" : selectedBranch.name}
            </Text>
          )}
        </Col>
        <Col>
          <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
            <Option value="today">Today</Option>
            <Option value="week">This Week</Option>
            <Option value="month">This Month</Option>
            <Option value="year">This Year</Option>
          </Select>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row gutter={[12, 12]}>
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <Col xs={24} sm={12} md={6} key={`skele-${i}`}>
              <Card style={{ borderRadius: 14, overflow: "hidden", minHeight: 96 }}>
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              </Card>
            </Col>
          ))
        ) : (
          summaryCards.map((s) => (
            <Col xs={24} sm={12} md={6} key={s.id}>
              <StatCard
                title={s.title}
                value={s.value}
                meta={s.meta}
                gradient={s.gradient}
                icon={s.icon}
                onClick={s.onClick}
              />
            </Col>
          ))
        )}
      </Row>

      {loading ? (
        <Card style={{ ...styles.roundedCard, marginTop: 16 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      ) : dashboardData ? (
        <>
          {/* Recent Bills & Top Products */}
          <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShoppingCart size={18} />
                    <span>Recent Bills</span>
                  </div>
                }
                style={styles.roundedCard}
              >
                <Table
                  dataSource={dashboardData.recentBills}
                  columns={recentBillsColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 800 }}
                  onRow={(record) => ({
                    onClick: () => handleBillClick(record),
                    style: { cursor: "pointer" },
                  })}
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={18} />
                    <span>Top Products</span>
                  </div>
                }
                style={styles.roundedCard}
              >
                <Table
                  dataSource={dashboardData.topProducts}
                  columns={topProductsColumns}
                  rowKey="product_id"
                  pagination={false}
                  size="small"
                  scroll={{ x: true }}
                  onRow={(record) => ({
                    onClick: () => handleProductClick(record),
                    style: { cursor: "pointer" },
                  })}
                />
              </Card>
            </Col>
          </Row>

          {/* Low Stock Alert & Payment Methods */}
          <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={18} color="#ff4d4f" />
                    <span>Low Stock Alert</span>
                    <Tag color="red">{dashboardData.summary.lowStockCount}</Tag>
                  </div>
                }
                style={styles.roundedCard}
              >
                {dashboardData.lowStockProducts.length > 0 ? (
                  <Table
  dataSource={dashboardData.lowStockProducts}
  columns={lowStockColumns}
  rowKey="product_id"
  pagination={false}
  size="small"
  scroll={{ x: true }}
  onRow={(record) => ({
    onClick: () => handleLowStockClick(record),
    style: { cursor: "pointer" },
  })}
/>
                ) : (
                  <Empty description="All products have sufficient stock" />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Wallet size={18} />
                    <span>Payment Methods</span>
                  </div>
                }
                style={styles.roundedCard}
              >
                {dashboardData.paymentMethods.map((pm, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: idx < dashboardData.paymentMethods.length - 1 ? "1px solid #f0f0f0" : "none"
                  }}>
                    <div>
                      <Tag>{pm.method}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>{pm.count} bills</Text>
                    </div>
                    <Text strong>₹{pm.total_amount}</Text>
                  </div>
                ))}
              </Card>

              {/* Recent Inwards */}
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Package size={18} />
                    <span>Recent Inwards</span>
                  </div>
                }
                style={{ ...styles.roundedCard, marginTop: 12 }}
              >
                {dashboardData.recentInwards.slice(0, 5).map((inward, idx) => (
                  <div key={idx} style={{
                    padding: "8px 0",
                    borderBottom: idx < 4 ? "1px solid #f0f0f0" : "none"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <Text strong>{inward.inward_no}</Text>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>{inward.supplier_name}</Text></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div><Text strong>₹{inward.total_amount}</Text></div>
                        <Tag color={inward.status === 'completed' ? 'green' : 'orange'} style={{ fontSize: 10 }}>
                          {inward.status}
                        </Tag>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Card style={{ ...styles.roundedCard, marginTop: 16 }}>
          <Empty description="No data available" />
        </Card>
      )}
      <BillDetailsModal
        visible={billModalVisible}
        onClose={() => {
          setBillModalVisible(false);
          setSelectedBillId(null);
          setSelectedBill(null);
        }}
        billId={selectedBillId}
        initialData={selectedBill}
      />
    </div>
  );
};

export default DashboardFull;
