import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Statistic,
  Table,
  Spin,
  message,
  Tag,
  Space,
  Typography,
  Divider,
} from "antd";
import {
  FileTextOutlined,
  BarChartOutlined,
  ReloadOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { IndianRupee } from "lucide-react";
import dayjs from "dayjs";
import reportService from "../service/reportService";
import { useBranch } from "../../context/BranchContext";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

function SalesReport() {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("today");
  const [dateRange, setDateRange] = useState(null);
  const [reportData, setReportData] = useState(null);
  const { selectedBranch } = useBranch();

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]); // Re-fetch when branch changes

  useEffect(() => {
    if (period === "custom" && dateRange) {
      fetchReport();
    }
  }, [dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { period };

      if (period === "custom" && dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }

      const response = await reportService.getSalesReport(params);
      setReportData(response.data);
      message.success("Report generated successfully");
    } catch (error) {
      console.error("Error fetching report:", error);
      message.error(error.response?.data?.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);

    if (value !== "custom") {
      setDateRange(null);

      setTimeout(() => {
        fetchReport();
      }, 0);
    }
  };

  const handleGenerateReport = () => {
    if (period === "custom" && !dateRange) {
      message.warning("Please select a date range");
      return;
    }
    fetchReport();
  };

  // Payment method columns
  const paymentColumns = [
    {
      title: "Payment Method",
      dataIndex: "method",
      key: "method",
      render: (method) => {
        const colors = {
          cash: "green",
          credit_card: "blue",
          debit_card: "cyan",
          "UPI Current Account": "purple",
          "UPI Normal Account": "magenta",
          net_banking: "orange",
          split: "gold",
        };
        return <Tag color={colors[method] || "default"}>{method.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Bills Count",
      dataIndex: "count",
      key: "count",
      align: "center",
    },
    {
      title: "Total Amount",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right",
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`,
    },
    {
      title: "Paid Amount",
      dataIndex: "paid_amount",
      key: "paid_amount",
      align: "right",
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`,
    },
    {
      title: "Due Amount",
      dataIndex: "due_amount",
      key: "due_amount",
      align: "right",
      render: (amount) => (
        <Text type={amount > 0 ? "danger" : "success"}>
          ₹{parseFloat(amount).toFixed(2)}
        </Text>
      ),
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      align: "right",
      render: (pct) => `${pct}%`,
    },
  ];

  // Branch columns
  const branchColumns = [
    {
      title: "Branch Code",
      dataIndex: "branch_code",
      key: "branch_code",
    },
    {
      title: "Branch Name",
      dataIndex: "branch_name",
      key: "branch_name",
    },
    {
      title: "Bills Count",
      dataIndex: "count",
      key: "count",
      align: "center",
    },
    {
      title: "Total Amount",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right",
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      align: "right",
      render: (pct) => `${pct}%`,
    },
  ];

  // Top days columns
  const topDaysColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "Bills Count",
      dataIndex: "bills_count",
      key: "bills_count",
      align: "center",
    },
    {
      title: "Total Sales",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right",
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`,
    },
  ];

  const getPeriodLabel = () => {
    switch (period) {
      case "today":
        return "Today";
      case "this_month":
        return "This Month";
      case "this_year":
        return "This Year";
      case "custom":
        return dateRange
          ? `${dayjs(dateRange[0]).format("DD MMM YYYY")} - ${dayjs(dateRange[1]).format("DD MMM YYYY")}`
          : "Custom Range";
      default:
        return "";
    }
  };

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Title level={2}>
                <BarChartOutlined /> Sales Report
              </Title>
              <Text type="secondary">
                View sales analytics and payment method breakdown
              </Text>
            </div>
            {selectedBranch && (
              <Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
                <ShopOutlined /> {selectedBranch.name === "All Branches" ? "All Branches" : selectedBranch.name}
              </Tag>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text strong>Period</Text>
                <Select
                  value={period}
                  onChange={handlePeriodChange}
                  style={{ width: "100%" }}
                >
                  <Option value="today">Today</Option>
                  <Option value="this_month">This Month</Option>
                  <Option value="this_year">This Year</Option>
                  <Option value="custom">Custom Range</Option>
                </Select>
              </Space>
            </Col>

            {period === "custom" && (
              <Col xs={24} sm={12} md={10}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>Date Range</Text>
                  <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    style={{ width: "100%" }}
                    format="DD MMM YYYY"
                  />
                </Space>
              </Col>
            )}

            {/* <Col xs={24} sm={24} md={6}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleGenerateReport}
                loading={loading}
                block
                style={{ marginTop: period === "custom" ? 24 : 0 }}
              >
                Generate Report
              </Button>
            </Col> */}
          </Row>
        </Card>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title={`Total Sales - ${getPeriodLabel()}`}
                    value={reportData.summary.total_sales}
                    prefix={<IndianRupee size={20} />}
                    precision={2}
                    valueStyle={{ color: "#3f8600" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Bills"
                    value={reportData.summary.total_bills}
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Average Bill Value"
                    value={reportData.summary.average_bill_value}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ color: "#cf1322" }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title={
                <Space>
                  <IndianRupee size={20} />
                  <span>Payment Method Breakdown</span>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <Table
                dataSource={reportData.payment_methods}
                columns={paymentColumns}
                pagination={false}
                rowKey="method"
                size="small"
                scroll={{ x: true }}
              />
            </Card>

            {/* Branch Breakdown */}
            {reportData.branches && reportData.branches.length > 0 && (
              <Card
                title={
                  <Space>
                    <ShopOutlined />
                    <span>Branch-wise Sales</span>
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                <Table
                  dataSource={reportData.branches}
                  columns={branchColumns}
                  pagination={false}
                  rowKey="branch_id"
                  size="small"
                  scroll={{ x: true }}
                />
              </Card>
            )}

            {/* Top Selling Days */}
            {reportData.top_days && reportData.top_days.length > 0 && (
              <Card
                title={
                  <Space>
                    <BarChartOutlined />
                    <span>Top 5 Selling Days</span>
                  </Space>
                }
              >
                <Table
                  dataSource={reportData.top_days}
                  columns={topDaysColumns}
                  pagination={false}
                  rowKey="date"
                  size="small"
                  scroll={{ x: true }}
                />
              </Card>
            )}
          </>
        ) : (
          <Card>
            <div style={{ textAlign: "center", padding: 40 }}>
              <BarChartOutlined style={{ fontSize: 48, color: "#ccc" }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  Select a period and click "Generate Report" to view sales data
                </Text>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default SalesReport;
