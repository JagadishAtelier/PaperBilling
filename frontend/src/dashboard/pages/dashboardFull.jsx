// src/components/dashboard/DashboardFull.jsx
import React, { useEffect, useState } from "react";
import { Row, Col, Card, Typography, Skeleton, Select, Tag, Table, Empty, Alert, Button, Popover, List } from "antd";
import { InfoCircleOutlined, BellOutlined } from "@ant-design/icons";
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
import { PieChart, Pie, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const styles = {
  page: { padding: 6, minHeight: "100vh", width: "100%" },
  roundedCard: { borderRadius: 14, boxShadow: "0 6px 18px rgba(15,23,42,0.06)" },
};

const DashboardFull = () => {
  const [period, setPeriod] = useState("month");
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

      {/* 🔔 Notifications Section */}
      {(dashboardData?.summary?.countUnder50 > 0 || dashboardData?.summary?.countUnder10 > 0) && (
        <div style={{ marginBottom: 16 }}>
          <Popover
            placement="bottom"
            title={<Text strong>Products with Low Stock</Text>}
            content={
              <div style={{ width: 320, maxHeight: 400, overflowY: 'auto' }}>
                <List
                  size="small"
                  dataSource={dashboardData.lowStockProducts}
                  renderItem={(p) => (
                    <List.Item 
                      style={{ padding: '8px 4px', cursor: 'pointer' }}
                      onClick={() => navigate(`/Product/list?search=${p.product_code}`)}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{p.product_name}</div>
                          <div style={{ fontSize: 11, color: '#8c8c8c' }}>{p.product_code}</div>
                        </div>
                        <Tag color={p.quantity < 10 ? "red" : "orange"} style={{ borderRadius: 10, minWidth: 35, textAlign: 'center' }}>
                          {p.quantity}
                        </Tag>
                      </div>
                    </List.Item>
                  )}
                />
                <div style={{ padding: '8px 0 0 0', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
                   <Button type="link" size="small" onClick={() => document.getElementById('low-stock-card')?.scrollIntoView({ behavior: 'smooth' })}>
                     Manage All Stock
                   </Button>
                </div>
              </div>
            }
            trigger="hover"
          >
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <BellOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ color: '#d32f2f' }}>Stock Alert Summary: </Text>
                    <Text>
                      {dashboardData.summary.countUnder10 > 0 && (
                        <span>
                          <Text strong style={{ color: '#cf1322' }}>{dashboardData.summary.countUnder10}</Text> products are critically low ({'<'} 10)
                        </span>
                      )}
                      {dashboardData.summary.countUnder10 > 0 && dashboardData.summary.countUnder50 > 0 && " and "}
                      {dashboardData.summary.countUnder50 > 0 && (
                        <span>
                          <Text strong style={{ color: '#d46b08' }}>{dashboardData.summary.countUnder50}</Text> products have stock less than 50.
                        </span>
                      )}
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>(Hover to see list)</Text>
                    </Text>
                  </div>
                  <Button 
                    size="small" 
                    type="link" 
                    danger 
                    onClick={() => document.getElementById('low-stock-card')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Manage
                  </Button>
                </div>
              }
              type="error"
              showIcon={false}
              style={{ 
                borderRadius: 12, 
                border: '1px solid #ffccc7', 
                background: '#fff2f0',
                boxShadow: '0 2px 8px rgba(255, 77, 79, 0.1)',
                cursor: 'pointer'
              }}
            />
          </Popover>
        </div>
      )}

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
          <Row gutter={[12, 12]} style={{ marginTop: 16, display: 'flex', alignItems: 'stretch' }}>
            <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShoppingCart size={18} />
                    <span>Recent Bills</span>
                  </div>
                }
                style={{ ...styles.roundedCard, flex: 1, display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, overflow: 'auto' } }}
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

            <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={18} />
                    <span>Top Products</span>
                  </div>
                }
                style={{ ...styles.roundedCard, flex: 1, display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, overflow: 'auto' } }}
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
          <Row gutter={[12, 12]} style={{ marginTop: 16, display: 'flex', alignItems: 'stretch' }} id="low-stock-card">
            <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={18} color="#ff4d4f" />
                    <span>Low Stock Alert</span>
                    <Tag color="red">{dashboardData.summary.lowStockCount}</Tag>
                  </div>
                }
                style={{ ...styles.roundedCard, flex: 1, display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, overflow: 'auto' } }}
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

            <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8,overflow:"hidden" }}>
                    <Wallet size={18} />
                    <span>Payment Methods</span>
                  </div>
                }
                style={{ ...styles.roundedCard, flex: 1, display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, overflow: 'auto' } }}
              >
                {dashboardData.paymentMethods.length > 0 ? (
                  <Row align="middle" style={{ height: '100%', width: '100%' }}>
                    <Col xs={24} sm={10} style={{ height: 220,zIndex:1 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.paymentMethods.map((pm, index) => ({
                              name: pm.method?.toUpperCase(),
                              value: parseFloat(pm.total_amount),
                              fill: COLORS[index % COLORS.length]
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          />
                          <RechartsTooltip 
                            formatter={(value) => `₹${parseFloat(value).toLocaleString()}`}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Col>
                    <Col xs={24} sm={14}>
                      <div style={{ paddingLeft: 16 }}>
                        {dashboardData.paymentMethods.map((pm, idx) => (
                          <div key={idx} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 0",
                            borderBottom: idx < dashboardData.paymentMethods.length - 1 ? "1px solid #f0f0f0" : "none"
                          }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                                <Text strong style={{ fontSize: 13 }}>{pm.method?.toUpperCase()}</Text>
                              </div>
                              <Text type="secondary" style={{ fontSize: 11, marginLeft: 18 }}>({pm.count} bills)</Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                               <Text strong>₹{parseFloat(pm.total_amount).toLocaleString()}</Text>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Col>
                  </Row>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transactions in this period" />
                )}
              </Card>

              {/* Recent Inwards */}
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Package size={18} />
                    <span>Recent Inwards</span>
                  </div>
                }
                style={{ ...styles.roundedCard, flex: 1, display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, overflow: 'auto' } }}
              >
                {dashboardData.recentInwards.length > 0 ? (
                  dashboardData.recentInwards.slice(0, 5).map((inward, idx) => (
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
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent inwards" />
                )}
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
