import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Empty,
  Input,
  Tooltip,
} from "antd";
import {
  FileTextOutlined,
  BarChartOutlined,
  ReloadOutlined,
  ShopOutlined,
  UserOutlined,
  SearchOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import reportService from "../service/reportService";
import { useBranch } from "../../context/BranchContext";
import { BadgeIndianRupee, IndianRupee, IndianRupeeIcon } from "lucide-react";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

/* ─────────────────── helper ─────────────────── */
const safe = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const fmt = (v) => safe(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─────────────── mini bar chart ─────────────── */
function MiniBarChart({ data = [] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => safe(d.total_amount)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60, padding: "0 4px" }}>
      {data.slice(-14).map((d, i) => {
        const h = Math.max((safe(d.total_amount) / max) * 100, 4);
        return (
          <Tooltip key={i} title={`${dayjs(d.date).format("DD MMM")}: ₹${fmt(d.total_amount)}`}>
            <div
              style={{
                flex: 1,
                height: `${h}%`,
                background: "linear-gradient(180deg, #7c3aed 0%, #a78bfa 100%)",
                borderRadius: "3px 3px 0 0",
                minWidth: 6,
                cursor: "pointer",
                transition: "height .3s ease",
              }}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}

/* ─────────────────── component ─────────────── */
function SalesReport() {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("this_month");
  const [dateRange, setDateRange] = useState(null);
  const [customerNameFilter, setCustomerNameFilter] = useState("");
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const { selectedBranch } = useBranch();
  const debounceRef = useRef(null);

  /* ── initial + branch change ── */
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  /* ── custom range change ── */
  useEffect(() => {
    if (period === "custom" && dateRange) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  /* ── debounced customer filter ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (period !== "custom" || dateRange) fetchReport();
    }, 600);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerNameFilter]);

  /* ── fetch ── */
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { period };
      if (period === "custom" && dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      if (customerNameFilter.trim()) {
        params.customer_name = customerNameFilter.trim();
      }
      const response = await reportService.getSalesReport(params);
      const data = response?.data || response;
      setReportData(data);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch report");
      message.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (value !== "custom") {
      setDateRange(null);
      setTimeout(() => fetchReport(), 0);
    }
  };

  /* ── summary safe access ── */
  const summary = useMemo(() => {
    const s = reportData?.summary || {};
    return {
      totalSales: safe(s.total_sales),
      totalBills: parseInt(s.total_bills) || 0,
      avgWithGst: safe(s.average_bill_value_with_gst || s.average_bill_value),
      avgWithoutGst: safe(s.average_bill_value_without_gst),
      totalTax: safe(s.total_tax),
      totalWithoutGst: safe(s.total_without_gst),
    };
  }, [reportData]);

  /* ── period label ── */
  const getPeriodLabel = () => {
    switch (period) {
      case "today": return "Today";
      case "this_month": return "This Month";
      case "this_year": return "This Year";
      case "custom":
        return dateRange
          ? `${dayjs(dateRange[0]).format("DD MMM")} – ${dayjs(dateRange[1]).format("DD MMM YYYY")}`
          : "Custom Range";
      default: return "";
    }
  };

  /* ─── payment method labels ─── */
  const methodLabel = (m) => {
    const map = {
      cash: "Cash",
      credit_card: "Credit Card",
      debit_card: "Debit Card",
      "UPI Current Account": "UPI Current",
      "UPI Normal Account": "UPI",
      net_banking: "Net Banking",
      split: "Split Payment",
    };
    return map[m] || m;
  };

  const methodColor = (m) => {
    const map = {
      cash: "#16a34a",
      credit_card: "#2563eb",
      debit_card: "#0891b2",
      "UPI Current Account": "#7c3aed",
      "UPI Normal Account": "#c026d3",
      net_banking: "#ea580c",
      split: "#ca8a04",
    };
    return map[m] || "#6b7280";
  };

  /* ── payment columns ── */
  const paymentColumns = [
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      render: (m) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: methodColor(m), flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{methodLabel(m)}</span>
        </div>
      ),
    },
    { title: "Bills", dataIndex: "count", key: "count", align: "center", render: (v) => <Tag>{v}</Tag> },
    {
      title: "Total (₹)",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right",
      render: (v) => <span style={{ fontWeight: 600 }}>₹{fmt(v)}</span>,
    },
    {
      title: "Paid (₹)",
      dataIndex: "paid_amount",
      key: "paid_amount",
      align: "right",
      render: (v) => `₹${fmt(v)}`,
    },
    {
      title: "Due (₹)",
      dataIndex: "due_amount",
      key: "due_amount",
      align: "right",
      render: (v) => (
        <span style={{ color: safe(v) > 0 ? "#dc2626" : "#16a34a", fontWeight: safe(v) > 0 ? 600 : 400 }}>
          ₹{fmt(v)}
        </span>
      ),
    },
    {
      title: "Share",
      dataIndex: "percentage",
      key: "percentage",
      align: "right",
      render: (p) => {
        const pct = safe(p);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <div style={{ width: 50, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "#7c3aed", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, color: "#6b7280", minWidth: 36 }}>{pct}%</span>
          </div>
        );
      },
    },
  ];

  /* ── branch columns ── */
  const branchColumns = [
    {
      title: "Branch",
      key: "branch",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.branch_name}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.branch_code}</div>
        </div>
      ),
    },
    { title: "Bills", dataIndex: "count", key: "count", align: "center", render: (v) => <Tag color="blue">{v}</Tag> },
    {
      title: "Revenue (₹)",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right",
      render: (v) => <span style={{ fontWeight: 600 }}>₹{fmt(v)}</span>,
    },
    {
      title: "Share",
      dataIndex: "percentage",
      key: "percentage",
      align: "right",
      render: (p) => `${safe(p)}%`,
    },
  ];

  /* ── top days columns ── */
  const topDaysColumns = [
    {
      title: "#",
      key: "rank",
      width: 40,
      render: (_, __, i) => (
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#d97706" : "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: i < 3 ? "#fff" : "#374151",
          }}
        >
          {i + 1}
        </div>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (d) => (
        <div>
          <div style={{ fontWeight: 600 }}>{dayjs(d).format("DD MMM YYYY")}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{dayjs(d).format("dddd")}</div>
        </div>
      ),
    },
    {
      title: "Bills",
      dataIndex: "bills_count",
      key: "bills_count",
      align: "center",
      render: (v) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: "Revenue (₹)",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right",
      render: (v) => <span style={{ fontWeight: 700, color: "#7c3aed" }}>₹{fmt(v)}</span>,
    },
  ];

  /* ─── gradient card helper ─── */
  const GradientCard = ({ gradient, border, icon, label, sublabel, value, prefix, suffix, valueColor }) => (
    <Card
      style={{
        borderRadius: 14,
        border: `1px solid ${border}`,
        background: gradient,
        overflow: "hidden",
        height: "100%",
        width: "100%",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      }}
      bodyStyle={{ padding: "16px 20px" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            {icon}
            <span style={{ fontSize: 13, fontWeight: 600, color: valueColor }}>{label}</span>
          </div>
          {sublabel && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>{sublabel}</div>}
          <div style={{ fontSize: 26, fontWeight: 800, color: valueColor, letterSpacing: "-0.5px", marginTop: "auto" }}>
            {prefix}{typeof value === "number" ? value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
            {suffix}
          </div>
        </div>
      </div>
    </Card>
  );

  /* ─────────────────── render ─────────────────── */
  return (
    <div style={{ padding: "20px 24px 40px", background: "#f8f9fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
              <BarChartOutlined style={{ color: "#7c3aed" }} />
              Sales Report
            </h2>
            <span style={{ color: "#6b7280", fontSize: 13 }}>Analytics, payment breakdown &amp; average bill metrics</span>
          </div>
          {selectedBranch && (
            <Tag color="purple" style={{ fontSize: 13, padding: "4px 14px", borderRadius: 20 }}>
              <ShopOutlined /> {selectedBranch.name === "All Branches" ? "All Branches" : selectedBranch.name}
            </Tag>
          )}
        </div>

        {/* ── Filters Bar ── */}
        <Card
          style={{ marginBottom: 20, borderRadius: 14, border: "1px solid #ede9fe", boxShadow: "0 1px 4px rgba(124,58,237,.06)" }}
          bodyStyle={{ padding: "16px 20px" }}
        >
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={8} md={5}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
                <CalendarOutlined /> Period
              </div>
              <Select value={period} onChange={handlePeriodChange} style={{ width: "100%" }} size="large">
                <Option value="today">Today</Option>
                <Option value="this_month">This Month</Option>
                <Option value="this_year">This Year</Option>
                <Option value="custom">Custom Range</Option>
              </Select>
            </Col>

            {period === "custom" && (
              <Col xs={24} sm={16} md={7}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Date Range</div>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ width: "100%" }}
                  format="DD MMM YYYY"
                  size="large"
                />
              </Col>
            )}

            <Col xs={24} sm={10} md={6}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
                <UserOutlined /> Customer Name
              </div>
              <Input
                placeholder="Search customer…"
                prefix={<SearchOutlined style={{ color: "#c4b5fd" }} />}
                value={customerNameFilter}
                onChange={(e) => setCustomerNameFilter(e.target.value)}
                allowClear
                size="large"
              />
            </Col>

            <Col xs={24} sm={6} md={period === "custom" ? 6 : 4}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "transparent", marginBottom: 4 }}>.</div>
              <Button
                type="primary"
                icon={<ReloadOutlined spin={loading} />}
                onClick={fetchReport}
                loading={loading}
                block
                size="large"
                style={{ background: "#7c3aed", borderColor: "#7c3aed", borderRadius: 10, fontWeight: 600 }}
              >
                Generate
              </Button>
            </Col>
          </Row>

          {customerNameFilter.trim() && (
            <div style={{ marginTop: 10 }}>
              <Tag closable onClose={() => setCustomerNameFilter("")} color="purple" style={{ borderRadius: 12 }}>
                Customer: <b>{customerNameFilter}</b>
              </Tag>
            </div>
          )}
        </Card>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: 80 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: "#9ca3af" }}>Generating report for <b>{getPeriodLabel()}</b>…</div>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <Card style={{ borderRadius: 14, border: "1px solid #fecaca", background: "#fef2f2" }}>
            <div style={{ textAlign: "center", padding: 40 }}>
              <InfoCircleOutlined style={{ fontSize: 48, color: "#dc2626", marginBottom: 16 }} />
              <Title level={5} style={{ color: "#dc2626" }}>Failed to Load Report</Title>
              <Text type="secondary">{error}</Text>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={fetchReport} style={{ background: "#7c3aed", borderColor: "#7c3aed" }}>
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Empty ── */}
        {!loading && !error && !reportData && (
          <Card style={{ borderRadius: 14 }}>
            <div style={{ textAlign: "center", padding: 60 }}>
              <BarChartOutlined style={{ fontSize: 56, color: "#d1d5db" }} />
              <div style={{ marginTop: 16 }}>
                <Title level={5} style={{ color: "#9ca3af" }}>No Report Data</Title>
                <Text type="secondary">
                  Select a period and click <b>Generate</b> to view sales data
                </Text>
              </div>
            </div>
          </Card>
        )}

        {/* ── Report Content ── */}
        {!loading && !error && reportData && (
          <>
            {/* ── Period Badge ── */}
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Tag color="purple" style={{ borderRadius: 12, fontSize: 13, padding: "2px 14px" }}>{getPeriodLabel()}</Tag>
              {summary.totalBills === 0 && (
                <Tag color="orange" style={{ borderRadius: 12, fontSize: 12 }}>No bills found for this period</Tag>
              )}
            </div>

            {/* ── Summary Cards Row 1 ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ height: "100%", display: "flex", width: "100%" }}>
                  <GradientCard
                    gradient="linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)"
                    border="#ede9fe"
                    icon={<IndianRupeeIcon style={{ color: "#7c3aed" }} />}
                    label="Total Sales"
                    sublabel={getPeriodLabel()}
                    value={summary.totalSales}
                    prefix="₹ "
                    valueColor="#7c3aed"
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ height: "100%", display: "flex", width: "100%" }}>
                  <GradientCard
                    gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
                    border="#bfdbfe"
                    icon={<FileTextOutlined style={{ color: "#2563eb" }} />}
                    label="Total Bills"
                    value={summary.totalBills}
                    sublabel="Total Number Of bills"
                    prefix="No "
                    valueColor="#2563eb"
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ height: "100%", display: "flex", width: "100%" }}>
                  <GradientCard
                    gradient="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
                    border="#bbf7d0"
                    icon={<RiseOutlined style={{ color: "#16a34a" }} />}
                    label="Avg Bill (incl. GST)"
                    sublabel="Per transaction average"
                    value={summary.avgWithGst}
                    prefix="₹ "
                    valueColor="#16a34a"
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ height: "100%", display: "flex", width: "100%" }}>
                  <GradientCard
                    gradient="linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
                    border="#fde68a"
                    icon={<FallOutlined style={{ color: "#ca8a04" }} />}
                    label="Avg Bill (ex-GST)"
                    sublabel="Excluding taxes"
                    value={summary.avgWithoutGst}
                    prefix="₹ "
                    valueColor="#ca8a04"
                  />
                </div>
              </Col>
            </Row>

            {/* ── Summary Cards Row 2 ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card style={{ borderRadius: 14, borderLeft: "4px solid #dc2626", height: "100%", width: "100%", minHeight: "100px" }} bodyStyle={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>Total GST Collected</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>₹{fmt(summary.totalTax)}</div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card style={{ borderRadius: 14, borderLeft: "4px solid #0369a1", height: "100%", width: "100%", minHeight: "100px" }} bodyStyle={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>Sales (ex-GST)</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#0369a1" }}>₹{fmt(summary.totalWithoutGst)}</div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card style={{ borderRadius: 14, borderLeft: "4px solid #7c3aed", height: "100%", width: "100%", minHeight: "100px" }} bodyStyle={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>Daily Trend (last {Math.min(reportData?.daily_sales?.length || 0, 14)} days)</div>
                  <MiniBarChart data={reportData?.daily_sales || []} />
                </Card>
              </Col>
            </Row>

            {/* ── Payment Breakdown ── */}
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IndianRupee style={{ color: "#7c3aed" }} />
                  <span style={{ fontWeight: 700 }}>Payment Method Breakdown</span>
                </div>
              }
              style={{ marginBottom: 20, borderRadius: 14 }}
              bodyStyle={{ padding: 0 }}
            >
              {reportData.payment_methods?.length > 0 ? (
                <Table
                  dataSource={reportData.payment_methods}
                  columns={paymentColumns}
                  pagination={false}
                  rowKey="method"
                  size="middle"
                  scroll={{ x: 600 }}
                  style={{ borderRadius: "0 0 14px 14px" }}
                />
              ) : (
                <Empty description="No payment data" style={{ padding: 40 }} />
              )}
            </Card>

            {/* ── Two-column: Branches + Top Days ── */}
            <Row gutter={[16, 16]} style={{ display: 'flex' }}>
              {/* Branches */}
              {reportData.branches?.length > 0 && (
                <Col xs={24} lg={12} style={{ display: 'flex' }}>
                  <Card
                    title={
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ShopOutlined style={{ color: "#2563eb" }} />
                        <span style={{ fontWeight: 700 }}>Branch-wise Sales</span>
                      </div>
                    }
                    style={{ borderRadius: 14, height: "100%", width: "100%" }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <Table
                      dataSource={reportData.branches}
                      columns={branchColumns}
                      pagination={false}
                      rowKey="branch_id"
                      size="middle"
                    />
                  </Card>
                </Col>
              )}

              {/* Top Days */}
              {reportData.top_days?.length > 0 && (
                <Col xs={24} lg={reportData.branches?.length > 0 ? 12 : 24} style={{ display: 'flex' }}>
                  <Card
                    title={
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <BarChartOutlined style={{ color: "#ca8a04" }} />
                        <span style={{ fontWeight: 700 }}>Top 5 Selling Days</span>
                      </div>
                    }
                    style={{ borderRadius: 14, height: "100%", width: "100%" }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <Table
                      dataSource={reportData.top_days}
                      columns={topDaysColumns}
                      pagination={false}
                      rowKey="date"
                      size="middle"
                    />
                  </Card>
                </Col>
              )}
            </Row>
          </>
        )}
      </div>
    </div>
  );
}

export default SalesReport;
