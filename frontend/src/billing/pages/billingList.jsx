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
  FileTextOutlined,
} from "@ant-design/icons";
import billingService from "../service/billingService.js";
import { useBranch } from "../../context/BranchContext";
import BillDetailsModal from "../../dashboard/pages/BillDetailsModal";
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
  if (s === "partially_paid") {
    return { color: "#f97316", bg: "#fff7ed", textColor: "#9a3412", label: "Partially Paid" }; // orange
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

  // Show modal
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
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBilling(null);
  };

  const manualRefresh = async () => {
    if (!selectedBilling?.id) return;
    await fetchBillingById(selectedBilling.id);
    message.success("Refreshed");
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
      title: "Balance",
      dataIndex: "due_amount",
      key: "due_amount",
      render: (due) => (
        <span style={{ color: due > 0 ? "#c2410c" : "#16a34a", fontWeight: 700 }}>
          {due > 0 ? `₹${due}` : "—"}
        </span>
      ),
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
      {/* ── Page Heading ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined style={{ color: "#7c3aed" }} />
          Bills &amp; Invoices
        </h2>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          Manage all billing records, view status and details
        </span>
      </div>

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
              { key: "partially_paid", label: "Partially Paid" },
              { key: "pending", label: "Pending" },
              // { key: "failed", label: "Failed" },
              { key: "overdue", label: "Overdue" },
            ]}
            className="w-full sm:w-auto"
          />

          {/* <Tabs
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
          /> */}
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
            {/* <Button icon={<FilePdfOutlined />} onClick={exportPDF} className="flex-1 sm:flex-none">
              PDF
            </Button> */}

            <div className="hidden md:block">
              <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} optionType="button" buttonStyle="solid" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                    <Card styles={{ body: { padding: 16 } }} style={cardStyles.cardWrap}>
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
                          <div style={{ background: sMeta.bg, color: sMeta.color, padding: "6px 10px", borderRadius: 16, fontWeight: 700, fontSize: 11 }}>
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
                        
                        {item.due_amount > 0 && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ color: "#c2410c", fontSize: 12, fontWeight: 600 }}>Due</div>
                            <div style={{ color: "#c2410c", fontWeight: 700 }}>₹{item.due_amount}</div>
                          </div>
                        )}

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

      <BillDetailsModal
        visible={modalVisible}
        onClose={closeModal}
        billId={selectedBilling?.id}
        initialData={selectedBilling}
      />
    </div>
  );
}

export default BillingList;
