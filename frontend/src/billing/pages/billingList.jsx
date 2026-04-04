import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Input,
  Button,
  Space,
  Popconfirm,
  Tag,
  message,
  Tabs,
  Radio,
  List,
  Card,
  Row,
  Col,
  Empty,
  Divider,
  Modal,
  Tooltip,
  Avatar,
  Badge,
  Statistic,
  Progress,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  EyeOutlined,
  ReloadOutlined,
  PrinterOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import billingService from "../service/billingService.js";
import { useBranch } from "../../context/BranchContext";
import debounce from "lodash.debounce";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const { Search } = Input;

function getInitials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusMeta(status = "") {
  const s = (status || "").toLowerCase();
  if (s === "paid") {
    return { color: "#16a34a", bg: "#dcfce7", textColor: "#065f46", label: "Paid" }; // green
  }
  if (s === "pending" || s === "in progress") {
    return { color: "#d97706", bg: "#fff7ed", textColor: "#92400e", label: "Pending" }; // amber
  }
  if (s === "failed") {
    return { color: "#dc2626", bg: "#fee2e2", textColor: "#7f1d1d", label: "Failed" }; // red
  }
  if (s === "overdue") {
    return { color: "#b91c1c", bg: "#fff1f2", textColor: "#7f1d1d", label: "Overdue" }; // dark red
  }
  return { color: "#374151", bg: "#f3f4f6", textColor: "#374151", label: (status || "Unknown").toString() }; // neutral
}

const cardStyles = {
  cardWrap: {
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(16,24,40,0.06)",
    overflow: "hidden",
    border: "1px solid #f1f5f9",
  },
  headerRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftMeta: { display: "flex", gap: 12, alignItems: "center" },
  avatarSquare: (bg) => ({
    background: bg,
    width: 48,
    height: 48,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
  }),
  smallMeta: { color: "#6b7280", fontSize: 12 },
  itemsRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "6px 0" },
  footerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  totalText: { fontWeight: 700, fontSize: 16 },
};

function getTypeLabel(type = "") {
  if (!type) return "Unknown";
  if (type === "Customer Billing") return "Mobile";
  if (type === "Casier Billing") return "Casier";
  return type;
}

function BillingList() {
  const navigate = useNavigate();
  const { selectedBranch: contextBranch } = useBranch();

  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchText, setSearchText] = useState("");
  const [sorter, setSorter] = useState({ field: null, order: null });
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // <-- all | mobile | casier
  const [viewMode, setViewMode] = useState("card"); // default to card to preview easily

  // modal + realtime state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const pollingRef = useRef(null);
  const lastSyncedRef = useRef(null);
  const POLL_INTERVAL = 5000; // 5 seconds (change if needed)

  // map the small user-facing type keys to the backend type strings
  const mapTypeKeyToBackend = (key) => {
    if (!key || key === "all") return null;
    if (key === "mobile") return "Customer Billing";
    if (key === "casier") return "Casier Billing";
    return key;
  };

  const fetchBillings = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const req = {
          page: params.current ?? pagination.current,
          limit: params.pageSize ?? pagination.pageSize,
          search: params.search ?? searchText,
          sortField: params.sortField ?? sorter.field,
          sortOrder: params.sortOrder ?? sorter.order,
        };

        const effectiveStatus = params.status ?? statusFilter;
        if (effectiveStatus && effectiveStatus !== "all") req.status = effectiveStatus;

        const effectiveTypeKey = params.type ?? typeFilter;
        const backendType = mapTypeKeyToBackend(effectiveTypeKey);
        if (backendType) req.type = backendType; // pass actual type label the backend expects

        const data = await billingService.getAll(req);

        setBillings(data.data || []);
        setPagination((prev) => ({
          ...prev,
          current: data.page || req.page || 1,
          total: data.total || 0,
          pageSize: data.limit || req.limit || 10,
        }));
      } catch (err) {
        console.error(err);
        message.error("Failed to fetch billings");
      } finally {
        setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize, searchText, sorter, statusFilter, typeFilter]
  );

  const doSearch = debounce((value) => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setSearchText(value);
  }, 500);

  useEffect(() => {
    fetchBillings();
    // eslint-disable-next-line
  }, [fetchBillings]);

  // Refresh data when branch changes in header
  useEffect(() => {
    if (contextBranch) {
      console.log("Branch changed in header:", contextBranch);
      // Reset pagination and fetch new data
      setPagination((prev) => ({ ...prev, current: 1 }));
      fetchBillings({ current: 1 });
    }
  }, [contextBranch?.id]); // Only trigger when branch ID changes

  async function handleDelete(id) {
    try {
      await billingService.remove(id);
      message.success("Billing deleted successfully");
      fetchBillings({ current: pagination.current });
    } catch (err) {
      console.error(err);
      message.error("Failed to delete billing");
    }
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.text("Billing List", 14, 10);

    const tableData = billings.map((bill) => [
      bill.billing_no,
      bill.customer_name,
      new Date(bill.billing_date).toLocaleDateString(),
      bill.total_quantity,
      bill.total_amount,
      bill.status,
    ]);

    doc.autoTable({ head: [["Billing No", "Customer", "Date", "Quantity", "Amount", "Status"]], body: tableData });

    doc.save("billings.pdf");
  }

  // fetch single billing (tries billingService.get, otherwise looks in list)
  const fetchBillingById = useCallback(
    async (id) => {
      setModalLoading(true);
      try {
        if (billingService.get) {
          const res = await billingService.get(id);
          // some services return { data: {...} }
          const payload = res?.data ? res.data : res;
          setSelectedBilling(payload);
          lastSyncedRef.current = Date.now();
          return payload;
        }

        // fallback to searching in the loaded list
        const found = billings.find((b) => b.id === id);
        if (found) {
          setSelectedBilling(found);
          lastSyncedRef.current = Date.now();
          return found;
        }

        message.warn("Billing details not available");
        return null;
      } catch (e) {
        console.error(e);
        message.error("Failed to load billing details");
        return null;
      } finally {
        setModalLoading(false);
      }
    },
    [billings]
  );

  // Show modal; start polling for realtime updates if possible
  const showDetails = async (recOrId) => {
    // accept either object or id
    let id = null;
    if (recOrId && typeof recOrId === "object") {
      setSelectedBilling(recOrId);
      id = recOrId.id;
      setModalVisible(true);
    } else {
      id = recOrId;
      setModalVisible(true);
    }

    // fetch latest right away
    if (id) {
      await fetchBillingById(id);

      // start polling when modal open
      if (billingService.get) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => fetchBillingById(id), POLL_INTERVAL);
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBilling(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const manualRefresh = async () => {
    if (!selectedBilling?.id) return;
    await fetchBillingById(selectedBilling.id);
    message.success("Refreshed");
  };

  const exportInvoicePDF = (billing) => {
    if (!billing) return;
    const doc = new jsPDF({ unit: "pt", format: "A4" });

    doc.setFontSize(18);
    doc.text("Invoice", 40, 40);

    doc.setFontSize(12);
    doc.text(`Billing No: ${billing.billing_no || "-"}`, 40, 70);
    doc.text(`Customer: ${billing.customer_name || "-"}`, 40, 88);
    doc.text(`Date: ${billing.billing_date ? new Date(billing.billing_date).toLocaleString() : "-"}`, 40, 106);

    const head = [["Product", "Code", "Unit", "Qty", "Unit Price", "Total"]];
    const body = (billing.items || []).map((it) => [
      it.product?.product_name || "-",
      it.product?.product_code || "-",
      it.product?.unit || "-",
      it.quantity,
      `₹${it.unit_price}`,
      `₹${it.total_price}`,
    ]);

    doc.autoTable({ startY: 130, head, body, styles: { fontSize: 10 } });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 300;

    doc.text(`Subtotal: ₹${billing.subtotal_amount || "0.00"}`, 40, finalY);
    doc.text(`Discount: ₹${billing.discount_amount || "0.00"}`, 40, finalY + 16);
    doc.text(`Tax: ₹${billing.tax_amount || "0.00"}`, 40, finalY + 32);
    doc.setFontSize(13);
    doc.text(`Total: ₹${billing.total_amount || "0.00"}`, 40, finalY + 56);

    doc.save(`${billing.billing_no || "invoice"}.pdf`);
  };

  const itemColumns = [
    { title: "Product", dataIndex: ["product", "product_name"], key: "product_name" },
    { title: "Code", dataIndex: ["product", "product_code"], key: "product_code" },
    { title: "Unit", dataIndex: ["product", "unit"], key: "unit" },
    { title: "Qty", dataIndex: "quantity", key: "quantity" },
    { title: "Unit Price", dataIndex: "unit_price", key: "unit_price", render: (v) => `₹${v}` },
    { title: "Total", dataIndex: "total_price", key: "total_price", render: (v) => `₹${v}` },
  ];

  const columns = [
    { title: "Billing No", dataIndex: "billing_no", key: "billing_no", sorter: true },
    { title: "Customer", dataIndex: "customer_name", key: "customer_name", sorter: true },
    {
      title: "Billing Date",
      dataIndex: "billing_date",
      key: "billing_date",
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: true,
    },
    { title: "Quantity", dataIndex: "total_quantity", key: "total_quantity", sorter: true },
    {
      title: "Amount",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (amount) => `₹${amount}`,
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const meta = statusMeta(status);
        return <Tag style={{ background: meta.bg, color: meta.color, fontWeight: 700 }}>{meta.label}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Tooltip title="Quick view">
            <Button type="default" icon={<EyeOutlined />} onClick={() => showDetails(record)} />
          </Tooltip>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/billing/edit/${record.id}`)} />
          {/* <Popconfirm title="Are you sure to delete this billing?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm> */}
        </Space>
      ),
    },
  ];

  // helper to compute paid percent
  const paidPercent = (b) => {
    const total = parseFloat((b?.total_amount ?? 0) || 0);
    const paid = parseFloat((b?.paid_amount ?? 0) || 0);
    if (!total || total <= 0) return 0;
    const p = Math.round((paid / total) * 100);
    return Math.max(0, Math.min(100, p));
  };

  return (
    <div className="p-4 min-h-screen">
      {/* Filters + Controls */}
      {/* Filters + Controls */}
      <div className="flex flex-col justify-between items-start gap-4 mb-4">
        {/* Left Side: Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto overflow-x-auto">
          <Tabs
            activeKey={statusFilter}
            onChange={(key) => {
              setStatusFilter(key);
              setPagination((prev) => ({ ...prev, current: 1 }));
              fetchBillings({ current: 1, status: key, search: searchText, type: typeFilter });
            }}
            items={[
              { key: "all", label: "All" },
              { key: "paid", label: "Paid" },
              { key: "pending", label: "Pending" },
              { key: "failed", label: "Failed" },
              { key: "overdue", label: "Overdue" },
            ]}
            className="w-full sm:w-auto"
          />

          <Tabs
            activeKey={typeFilter}
            onChange={(key) => {
              setTypeFilter(key);
              setPagination((prev) => ({ ...prev, current: 1 }));
              fetchBillings({ current: 1, status: statusFilter, search: searchText, type: key });
            }}
            items={[
              { key: "all", label: "All Types" },
              { key: "mobile", label: "Mobile" },
              { key: "casier", label: "Casier" },
            ]}
            className="w-full sm:w-auto"
          />
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-col sm:flex-row lg:justify-between gap-2 w-full lg:w-auto">
          <Search
            placeholder="Search billings..."
            onSearch={(v) => doSearch(v)}
            onChange={(e) => doSearch(e.target.value)}
            enterButton
            allowClear
            className="w-full sm:w-[250px]"
          />

          <div className="flex gap-2">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/billing/add")} className="flex-1 sm:flex-none">
              Add
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={exportPDF} className="flex-1 sm:flex-none">
              PDF
            </Button>

            <div className="hidden md:block">
              <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} optionType="button" buttonStyle="solid" style={{display:'flex',justifyContent:'center',alignItems:'center'}}>
                <Radio.Button value="table">Table</Radio.Button>
                <Radio.Button value="card">Card</Radio.Button>
              </Radio.Group>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <Table
          columns={columns}
          rowKey={(record) => record.id}
          dataSource={billings}
          pagination={pagination}
          loading={loading}
          onChange={(pag, filters, sort) => {
            const convertedOrder = sort.order === "ascend" ? "asc" : sort.order === "descend" ? "desc" : null;
            setPagination(pag);
            setSorter({ field: sort.field, order: convertedOrder });
            fetchBillings({
              current: pag.current,
              pageSize: pag.pageSize,
              sortField: sort.field,
              sortOrder: convertedOrder,
              status: statusFilter,
              search: searchText,
              type: typeFilter,
            });
          }}
          bordered
          scroll={{ x: 800 }}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                columns={[
                  { title: "Product", dataIndex: ["product", "product_name"], key: "product_name" },
                  { title: "Code", dataIndex: ["product", "product_code"], key: "product_code" },
                  { title: "Quantity", dataIndex: "quantity", key: "quantity" },
                  { title: "Unit Price", dataIndex: "unit_price", key: "unit_price", render: (v) => `₹${v}` },
                  { title: "Total", dataIndex: "total_price", key: "total_price", render: (v) => `₹${v}` },
                ]}
                dataSource={record.items || []}
                pagination={false}
                rowKey={(item) => item.id}
                size="small"
              />
            ),
          }}
        />
      ) : (
        <div>
          {billings.length === 0 && !loading ? (
            <Empty description="No billings" />
          ) : (
            <List
              grid={{ gutter: 18, xs: 1, sm: 2, md: 2, lg: 2, xl: 3 }}
              dataSource={billings}
              renderItem={(item) => {
                const initials = getInitials(item.customer_name);
                const sMeta = statusMeta(item.status);
                const typeLabel = getTypeLabel(item.type);
                return (
                  <List.Item key={item.id}>
                    <Card bodyStyle={{ padding: 16 }} style={cardStyles.cardWrap}>
                      <div style={cardStyles.headerRow}>
                        <div style={cardStyles.leftMeta}>
                          <div style={cardStyles.avatarSquare("#0ea5a4")}>{initials}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{item.customer_name}</div>
                            <div style={cardStyles.smallMeta}>Order {item.billing_no}</div>
                            <div style={cardStyles.smallMeta}>{new Date(item.billing_date).toLocaleString()}</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <div style={{ background: sMeta.bg, color: sMeta.color, padding: "6px 10px", borderRadius: 16, fontWeight: 700, fontSize: 12 }}>
                            {sMeta.label}
                          </div>

                          <div style={{ background: "#eef2ff", color: "#3730a3", padding: "6px 10px", borderRadius: 16, fontWeight: 700, fontSize: 12 }}>
                            {typeLabel}
                          </div>
                        </div>
                      </div>

                      <Divider style={{ margin: "12px 0" }} />

                      <div style={{ height: 90, overflowY: "auto", scrollbarWidth: "none", marginRight: -8, paddingRight: 8 }}>
                        {(item.items || []).map((it) => (
                          <div key={it.id || `${it.product?.product_code}-${Math.random()}`} style={cardStyles.itemsRow}>
                            <div style={{ fontSize: 14, color: "#111827" }}>{it.product?.product_name || "–"}</div>
                            <div style={{ textAlign: "right", color: "#374151" }}>
                              {it.quantity} × ₹{it.unit_price}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={cardStyles.footerRow}>
                        <div>
                          <div style={{ color: "#6b7280", fontSize: 13 }}>Total</div>
                          <div style={cardStyles.totalText}>₹{item.total_amount}</div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <Tooltip title="Quick view (opens live modal)">
                            <Button
                              type="default"
                              icon={<EyeOutlined />}
                              onClick={() => showDetails(item)}
                              style={{ borderRadius: 8, padding: "6px 14px" }}
                            />
                          </Tooltip>

                          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/billing/edit/${item.id}`)} style={{ borderRadius: 8, padding: "6px 14px" }} />

                          {/* <Popconfirm title="Are you sure to delete this billing?" onConfirm={() => handleDelete(item.id)}>
                            <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8, padding: "6px 14px" }} />
                          </Popconfirm> */}
                        </div>
                      </div>
                    </Card>
                  </List.Item>
                );
              }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: (page, pageSize) => {
                  setPagination((p) => ({ ...p, current: page, pageSize }));
                  fetchBillings({ current: page, pageSize, status: statusFilter, search: searchText, type: typeFilter });
                },
              }}
            />
          )}
        </div>
      )}


      <style>
        {`
    /* scope to only this modal so other modals stay untouched */
    .invoice-modal .ant-modal-content {
      padding-top: 2px !important;
    }

    /* optional: reduce the default modal header padding if you want it even tighter */
    .invoice-modal .ant-card-body {
      padding-top: 0px !important;
      padding-bottom: 8px !important;
    }
  `}
      </style>

      {/* Advanced Modal — colorful invoice-like layout, realtime polling, print/pdf/refresh */}
      <Modal style={{ top: 15, paddingTop: 0 }}
        className="invoice-modal"
        open={modalVisible}
        title={null}
        onCancel={closeModal}
        footer={[
          <Space key="modal-actions">
            <Button icon={<DownloadOutlined />} onClick={() => exportInvoicePDF(selectedBilling)}>
              Download PDF
            </Button>
            <Button key="close" onClick={closeModal}>
              Close
            </Button>
          </Space>,
        ]}
        width={980}
        bodyStyle={{ maxHeight: "80vh", overflowY: "auto", padding: 0, scrollbarWidth: "none", scrollbarWidth: "none", }}
      >


        {/* Modal body */}
        <div style={{ padding: 10 }}>
          <Row gutter={16}>
            <Col xs={24} md={24}>
              <Card
                size="small"
                bordered={false}
                style={{ borderRadius: 12, overflow: "hidden" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between", // space between left info and right tags
                    gap: 16,
                    flexWrap: "wrap", // keeps it responsive on small screens
                  }}
                >
                  {/* Left side: Avatar + Customer Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <Avatar
                      size={40}
                      style={{
                        background: "#0ea5a4",
                        color: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      {getInitials(selectedBilling?.customer_name)}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {selectedBilling?.customer_name}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        Order{" "}
                        <strong style={{ color: "#0f172a" }}>
                          {selectedBilling?.billing_no || "—"}
                        </strong>
                        {" • "}
                        {selectedBilling?.billing_date
                          ? new Date(selectedBilling.billing_date).toLocaleString()
                          : "Date —"}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Tags */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Tag
                      style={{
                        fontWeight: 800,
                        borderRadius: 8,
                        padding: "0 10px",
                        background: "#eef2ff",
                        color: "#3730a3",
                      }}
                    >
                      {getTypeLabel(selectedBilling?.type)}
                    </Tag>
                    <Tag
                      style={{
                        fontWeight: 800,
                        borderRadius: 8,
                        padding: "0 10px",
                        background: "#fff7ed",
                        color: "#92400e",
                      }}
                    >
                      {(selectedBilling?.payment_method || "cash")
                        .toString()
                        .toUpperCase()}
                    </Tag>
                    <Tag
                      style={{
                        fontWeight: 800,
                        borderRadius: 8,
                        padding: "0 10px",
                        background: statusMeta(selectedBilling?.status).bg,
                        color: statusMeta(selectedBilling?.status).color,
                      }}
                    >
                      {statusMeta(selectedBilling?.status).label}
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>


          <div style={{ fontWeight: 600, marginBottom: 1 }}>Items</div>
          <Table columns={itemColumns} dataSource={selectedBilling?.items || []} pagination={false} size="small" rowKey={(r) => r.id} />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <div style={{ width: 360 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0px 0" }}>
                <div style={{ color: "#6b7280" }}>Subtotal</div>
                <div style={{ fontWeight: 700 }}>₹{selectedBilling?.subtotal_amount ?? "0.00"}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "0px 0" }}>
                <div style={{ color: "#6b7280" }}>Discount</div>
                <div style={{ fontWeight: 700 }}>₹{selectedBilling?.discount_amount ?? "0.00"}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "0px 0" }}>
                <div style={{ color: "#6b7280" }}>Tax</div>
                <div style={{ fontWeight: 700 }}>₹{selectedBilling?.tax_amount ?? "0.00"}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0", background: "linear-gradient(90deg,#fef3c7,#fff7ed)", borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Total</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#b45309" }}>₹{selectedBilling?.total_amount ?? "0.00"}</div>
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default BillingList;
