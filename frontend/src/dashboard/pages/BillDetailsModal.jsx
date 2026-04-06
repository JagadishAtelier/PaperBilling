import React, { useEffect, useState, useRef } from "react";
import { Modal, Button, Table, Row, Col, Card, Avatar, Tag, message, Space, Spin, Typography, Input, DatePicker, Select, Empty, Divider } from "antd";
const { Text, Title } = Typography;
import { DownloadOutlined, EditOutlined, SaveOutlined, CloseOutlined, PrinterOutlined } from "@ant-design/icons";
import billingService from "../../billing/service/billingService";
import shipmentService from "../../billing/service/shipmentService";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Truck, Package, Clock, CheckCircle, XCircle } from "lucide-react";
import dayjs from "dayjs";

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
        return { color: "#16a34a", bg: "#dcfce7", textColor: "#065f46", label: "Paid" };
    }
    if (s === "pending" || s === "in progress") {
        return { color: "#d97706", bg: "#fff7ed", textColor: "#92400e", label: "Pending" };
    }
    if (s === "failed") {
        return { color: "#dc2626", bg: "#fee2e2", textColor: "#7f1d1d", label: "Failed" };
    }
    if (s === "overdue") {
        return { color: "#b91c1c", bg: "#fff1f2", textColor: "#7f1d1d", label: "Overdue" };
    }
    return { color: "#374151", bg: "#f3f4f6", textColor: "#374151", label: (status || "Unknown").toString() };
}

function getTypeLabel(type = "") {
    if (!type) return "Unknown";
    if (type === "Customer Billing") return "Mobile";
    if (type === "Casier Billing") return "Casier";
    return type;
}

// 📌 Helper for Amount in Words
const amountToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (!num || isNaN(num)) return '';
    let n = Math.floor(num);
    if (n === 0) return 'Zero Only';
    
    const convert = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    };
    
    return convert(n) + ' Only';
};

const BillDetailsModal = ({ visible, onClose, billId, initialData }) => {
    const [selectedBilling, setSelectedBilling] = useState(null);
    const [shipment, setShipment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [shipmentLoading, setShipmentLoading] = useState(false);
    const [isEditingShipment, setIsEditingShipment] = useState(false);
    const [shipmentForm, setShipmentForm] = useState({ 
        carrier_name: '', 
        tracking_id: '', 
        estimated_delivery: null, 
        status: 'Pending',
        vehicle_no: '',
        driver_name: '',
        driver_phone: '',
        shipping_address: ''
    });

    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (visible && billId) {
            // Show initial data immediately while fetching
            if (initialData) setSelectedBilling(initialData);
            // Only fetch once per open
            if (!hasFetchedRef.current) {
                hasFetchedRef.current = true;
                fetchData(billId);
            }
        } else if (!visible) {
            // Reset on close
            hasFetchedRef.current = false;
            setSelectedBilling(null);
            setShipment(null);
            setIsEditingShipment(false);
        }
    }, [visible, billId]);

    const fetchData = async (id) => {
        if (!id) return;
        setLoading(true);
        await Promise.all([fetchBillingById(id), fetchShipment(id)]);
        setLoading(false);
    };

    const fetchShipment = async (id) => {
        setShipmentLoading(true);
        try {
            const res = await shipmentService.getByBillingId(id);
            const data = res?.data ? res.data : res;
            setShipment(data);
            if (data) {
                setShipmentForm({
                    carrier_name: data.carrier_name || '',
                    tracking_id: data.tracking_id || '',
                    estimated_delivery: data.estimated_delivery ? dayjs(data.estimated_delivery) : null,
                    status: data.status || 'Pending',
                    vehicle_no: data.vehicle_no || '',
                    driver_name: data.driver_name || '',
                    driver_phone: data.driver_phone || '',
                    shipping_address: data.shipping_address || ''
                });
            }
        } catch (e) {
            console.error("Fetch shipment error:", e);
        } finally {
            setShipmentLoading(false);
        }
    };

    const fetchBillingById = async (id, isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const res = await billingService.getById(id);
            const payload = res?.data ? res.data : res;
            if (payload) setSelectedBilling(payload);
        } catch (e) {
            if (!isPolling) message.error(`Failed to load details: ${e.message}`);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    const handleSaveShipment = async () => {
        if (!billId) return;
        setShipmentLoading(true);
        try {
            const payload = {
                ...shipmentForm,
                estimated_delivery: shipmentForm.estimated_delivery ? shipmentForm.estimated_delivery.toISOString() : null
            };
            await shipmentService.upsert(billId, payload);
            message.success("Shipment updated successfully");
            setIsEditingShipment(false);
            fetchShipment(billId);
        } catch (e) {
            message.error("Failed to update shipment");
        } finally {
            setShipmentLoading(false);
        }
    };

    const exportInvoicePDF = () => {
        const billing = selectedBilling;
        if (!billing) return;
        const doc = new jsPDF({ unit: "pt", format: "A4" });

        doc.setFontSize(18);
        doc.text("Tax Invoice", 40, 40);

        doc.setFontSize(10);
        doc.text(`Billing No: ${billing.billing_no || "-"}`, 40, 70);
        doc.text(`Customer: ${billing.customer_name || "-"}`, 40, 85);
        doc.text(`Date: ${billing.billing_date ? dayjs(billing.billing_date).format("DD-MM-YYYY HH:mm") : "-"}`, 40, 100);

        const head = [["#", "Product", "HSN", "Qty", "Price", "Tax", "Total"]];
        const body = (billing.items || []).map((it, idx) => [
            idx + 1,
            it.product?.product_name || it.product_name || "-",
            it.product?.hsn_code || "-",
            it.quantity,
            `₹${it.unit_price}`,
            `${it.tax_percentage || 0}%`,
            `₹${it.total_price}`,
        ]);

        doc.autoTable({ startY: 120, head, body, styles: { fontSize: 9 } });

        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 300;

        doc.text(`Subtotal: ₹${billing.subtotal_amount || "0.00"}`, 400, finalY);
        doc.text(`Tax: ₹${billing.tax_amount || "0.00"}`, 400, finalY + 15);
        doc.text(`Discount: ₹${billing.discount_amount || "0.00"}`, 400, finalY + 30);
        doc.setFont(undefined, 'bold');
        doc.text(`GRAND TOTAL: ₹${billing.total_amount || "0.00"}`, 400, finalY + 50);
        
        doc.setFont(undefined, 'italic');
        doc.text(`In Words: ${amountToWords(billing.total_amount)}`, 40, finalY + 70);

        doc.save(`${billing.billing_no || "invoice"}.pdf`);
    };

    const printShipmentSlip = () => {
        if (!shipment || !selectedBilling) return;

        const printWindow = window.open("", "_blank", "width=700,height=600");
        if (!printWindow) return;

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shipment Slip - ${selectedBilling.billing_no || ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .subtitle { color: #555; font-size: 12px; margin-top: 2px; }
    .billing-no { font-size: 14px; font-weight: 700; text-align: right; }
    .billing-date { font-size: 11px; color: #555; text-align: right; margin-top: 4px; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .field-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .field-value { font-size: 13px; font-weight: 600; color: #111; }
    .address-box { background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; font-size: 12px; line-height: 1.5; white-space: pre-wrap; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; background: #dbeafe; color: #1d4ed8; margin-top: 8px; }
    .status-badge.delivered { background: #dcfce7; color: #15803d; }
    .footer { margin-top: 24px; border-top: 1px dashed #ccc; padding-top: 12px; font-size: 11px; color: #888; display: flex; justify-content: space-between; }
    .customer-section { border: 2px solid #111; border-radius: 6px; padding: 12px; margin-bottom: 16px; }
    .customer-name { font-size: 16px; font-weight: 700; }
    .customer-phone { font-size: 13px; color: #333; margin-top: 3px; }
    @media print {
      body { padding: 12px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">SHIPMENT SLIP</div>
      <div class="subtitle">Delivery Tracking Document</div>
    </div>
    <div>
      <div class="billing-no"># ${selectedBilling.billing_no || "—"}</div>
      <div class="billing-date">Bill Date: ${selectedBilling.billing_date ? dayjs(selectedBilling.billing_date).format("DD MMM YYYY") : "—"}</div>
    </div>
  </div>

  <div class="customer-section">
    <div class="section-title">Deliver To</div>
    <div class="customer-name">${selectedBilling.customer_name || "—"}</div>
    ${selectedBilling.custom_phone || selectedBilling.customer_phone ? `<div class="customer-phone">Ph: ${selectedBilling.custom_phone || selectedBilling.customer_phone}</div>` : ""}
    ${shipment.shipping_address ? `<div class="address-box" style="margin-top:8px;">${shipment.shipping_address}</div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Shipment Details</div>
    <div class="grid">
      <div>
        <div class="field-label">Carrier</div>
        <div class="field-value">${shipment.carrier_name || "—"}</div>
      </div>
      <div>
        <div class="field-label">Tracking ID</div>
        <div class="field-value">${shipment.tracking_id || "—"}</div>
      </div>
      <div>
        <div class="field-label">Est. Delivery</div>
        <div class="field-value">${shipment.estimated_delivery ? dayjs(shipment.estimated_delivery).format("DD MMM YYYY") : "TBD"}</div>
      </div>
      ${shipment.vehicle_no ? `
      <div>
        <div class="field-label">Vehicle No</div>
        <div class="field-value">${shipment.vehicle_no}</div>
      </div>` : ""}
      ${shipment.driver_name ? `
      <div>
        <div class="field-label">Driver</div>
        <div class="field-value">${shipment.driver_name}</div>
      </div>` : ""}
      ${shipment.driver_phone ? `
      <div>
        <div class="field-label">Driver Phone</div>
        <div class="field-value">${shipment.driver_phone}</div>
      </div>` : ""}
    </div>
    <div class="status-badge ${shipment.status === 'Delivered' ? 'delivered' : ''}">${shipment.status || 'Pending'}</div>
  </div>

  <div class="footer">
    <span>Bill Amount: ₹${selectedBilling.total_amount || "0.00"}</span>
    <span>Printed: ${dayjs().format("DD MMM YYYY, HH:mm")}</span>
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const itemColumns = [
        { title: "Product", key: "product_name", render: (r) => r.product?.product_name || r.product_name || "-" },
        { title: "HSN", key: "hsn", render: (r) => r.product?.hsn_code || "-" },
        { title: "Code", key: "product_code", render: (r) => r.product?.product_code || r.product_code || "-" },
        { title: "Qty", dataIndex: "quantity", key: "quantity" },
        { title: "Unit Price", dataIndex: "unit_price", key: "unit_price", render: (v) => `₹${v}` },
        { title: "Total", dataIndex: "total_price", key: "total_price", render: (v) => `₹${v}` },
    ];

    return (
        <Modal
            style={{ top: 15 }}
            className="invoice-modal"
            open={visible}
            title={null}
            onCancel={onClose}
            footer={[
                <Space key="modal-actions">
                    <Button icon={<DownloadOutlined />} onClick={exportInvoicePDF} disabled={!selectedBilling}>
                        Download PDF
                    </Button>
                    <Button key="close" onClick={onClose}>
                        Close
                    </Button>
                </Space>,
            ]}
            width={980}
            styles={{ body: { maxHeight: "85vh", overflowY: "auto", padding: "10px 20px" } }}
        >
            {loading && !selectedBilling ? (
                <div style={{ textAlign: "center", padding: "50px" }}><Spin size="large" /></div>
            ) : selectedBilling ? (
                <div>
                    <Card size="small" variant="borderless" style={{ borderRadius: 12, background: "#f8fafc", marginBottom: 16 }}>
                        <Row align="middle" justify="space-between" gutter={16}>
                            <Col>
                                <Space size={16}>
                                    <Avatar size={48} style={{ background: "#0ea5a4", fontWeight: 800 }}>
                                        {getInitials(selectedBilling.customer_name)}
                                    </Avatar>
                                    <div>
                                        <Title level={5} style={{ margin: 0 }}>{selectedBilling.customer_name}</Title>
                                        <Text type="secondary">{selectedBilling.billing_no} • {dayjs(selectedBilling.billing_date).format("DD MMM YYYY, HH:mm")}</Text>
                                    </div>
                                </Space>
                            </Col>
                            <Col>
                                <Space>
                                    <Tag color="blue">{getTypeLabel(selectedBilling.type)}</Tag>
                                    <Tag color="orange">{(selectedBilling.payment_method || "cash").toUpperCase()}</Tag>
                                    <Tag color={statusMeta(selectedBilling.status).color}>{statusMeta(selectedBilling.status).label}</Tag>
                                </Space>
                            </Col>
                        </Row>
                    </Card>

                    <Title level={5} style={{ marginBottom: 12 }}>Items</Title>
                    <Table
                        columns={itemColumns}
                        dataSource={selectedBilling.items || []}
                        pagination={false}
                        size="small"
                        rowKey={(r) => r.id || Math.random()}
                        bordered
                    />

                    <Row gutter={24} style={{ marginTop: 20 }}>
                        <Col span={14}>
                            <Card 
                                size="small" 
                                title={
                                    <Space justify="space-between" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Truck size={18} />
                                            <span>Shipment Tracking</span>
                                        </div>
                                        <Space>
                                            {shipment && !isEditingShipment && (
                                                <Button
                                                    size="small"
                                                    icon={<PrinterOutlined />}
                                                    onClick={printShipmentSlip}
                                                >
                                                    Print Slip
                                                </Button>
                                            )}
                                            {!isEditingShipment && (
                                                <Button size="small" icon={<EditOutlined />} onClick={() => setIsEditingShipment(true)}>Edit</Button>
                                            )}
                                        </Space>
                                    </Space>
                                }
                                style={{ borderRadius: 12 }}
                            >
                                {isEditingShipment ? (
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <Row gutter={8}>
                                            <Col span={12}>
                                                <Text size="small">Carrier</Text>
                                                <Input value={shipmentForm.carrier_name} onChange={e => setShipmentForm({...shipmentForm, carrier_name: e.target.value})} placeholder="e.g. BlueDart" />
                                            </Col>
                                            <Col span={12}>
                                                <Text size="small">Tracking ID</Text>
                                                <Input value={shipmentForm.tracking_id} onChange={e => setShipmentForm({...shipmentForm, tracking_id: e.target.value})} placeholder="e.g. BD123456" />
                                            </Col>
                                        </Row>
                                        <Row gutter={8}>
                                            <Col span={12}>
                                                <Text size="small">Est. Delivery</Text>
                                                <DatePicker style={{ width: '100%' }} value={shipmentForm.estimated_delivery} onChange={val => setShipmentForm({...shipmentForm, estimated_delivery: val})} />
                                            </Col>
                                            <Col span={12}>
                                                <Text size="small">Status</Text>
                                                <Select style={{ width: '100%' }} value={shipmentForm.status} onChange={val => setShipmentForm({...shipmentForm, status: val})}>
                                                    <Select.Option value="Pending">Pending</Select.Option>
                                                    <Select.Option value="Packed">Packed</Select.Option>
                                                    <Select.Option value="Shipped">Shipped</Select.Option>
                                                    <Select.Option value="Delivered">Delivered</Select.Option>
                                                    <Select.Option value="Cancelled">Cancelled</Select.Option>
                                                </Select>
                                            </Col>
                                        </Row>
                                        <Row gutter={8}>
                                            <Col span={12}>
                                                <Text size="small">Vehicle No</Text>
                                                <Input value={shipmentForm.vehicle_no} onChange={e => setShipmentForm({...shipmentForm, vehicle_no: e.target.value})} placeholder="e.g. MH 12 AB 1234" />
                                            </Col>
                                            <Col span={12}>
                                                <Text size="small">Driver Name</Text>
                                                <Input value={shipmentForm.driver_name} onChange={e => setShipmentForm({...shipmentForm, driver_name: e.target.value})} placeholder="e.g. John Doe" />
                                            </Col>
                                        </Row>
                                        <Row gutter={8}>
                                            <Col span={12}>
                                                <Text size="small">Driver Phone</Text>
                                                <Input value={shipmentForm.driver_phone} onChange={e => setShipmentForm({...shipmentForm, driver_phone: e.target.value})} placeholder="e.g. 9876543210" />
                                            </Col>
                                            <Col span={12}>
                                                <Text size="small">Address</Text>
                                                <Input value={shipmentForm.shipping_address} onChange={e => setShipmentForm({...shipmentForm, shipping_address: e.target.value})} placeholder="Full Address" />
                                            </Col>
                                        </Row>
                                        <Space style={{ marginTop: 8 }}>
                                            <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSaveShipment} loading={shipmentLoading}>Save</Button>
                                            <Button size="small" icon={<CloseOutlined />} onClick={() => setIsEditingShipment(false)}>Cancel</Button>
                                        </Space>
                                    </Space>
                                ) : !shipment ? (
                                    <div style={{ textAlign: "center", padding: "10px" }}>
                                        <Text type="secondary">No shipment details found.</Text>
                                        <div style={{ marginTop: 8 }}>
                                            <Button size="small" type="dashed" onClick={() => setIsEditingShipment(true)}>Add Tracking Info</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <div style={{ fontSize: 11, color: "#94a3b8" }}>CARRIER</div>
                                            <div style={{ fontWeight: 600 }}>{shipment.carrier_name || "N/A"}</div>
                                        </Col>
                                        <Col span={8}>
                                            <div style={{ fontSize: 11, color: "#94a3b8" }}>TRACKING ID</div>
                                            <div style={{ fontWeight: 600 }}>{shipment.tracking_id || "N/A"}</div>
                                        </Col>
                                        <Col span={8}>
                                            <div style={{ fontSize: 11, color: "#94a3b8" }}>EST. DELIVERY</div>
                                            <div style={{ fontWeight: 600 }}>{shipment.estimated_delivery ? dayjs(shipment.estimated_delivery).format("DD MMM YYYY") : "TBD"}</div>
                                        </Col>

                                        {shipment.vehicle_no && (
                                            <Col span={8} style={{ marginTop: 8 }}>
                                                <div style={{ fontSize: 11, color: "#94a3b8" }}>VEHICLE NO</div>
                                                <div style={{ fontWeight: 600 }}>{shipment.vehicle_no}</div>
                                            </Col>
                                        )}
                                        {shipment.driver_name && (
                                            <Col span={8} style={{ marginTop: 8 }}>
                                                <div style={{ fontSize: 11, color: "#94a3b8" }}>DRIVER</div>
                                                <div style={{ fontWeight: 600 }}>{shipment.driver_name}</div>
                                            </Col>
                                        )}
                                        {shipment.driver_phone && (
                                            <Col span={8} style={{ marginTop: 8 }}>
                                                <div style={{ fontSize: 11, color: "#94a3b8" }}>DRIVER PHONE</div>
                                                <div style={{ fontWeight: 600 }}>{shipment.driver_phone}</div>
                                            </Col>
                                        )}

                                        {shipment.shipping_address && (
                                            <Col span={24} style={{ marginTop: 12 }}>
                                                <div style={{ fontSize: 11, color: "#94a3b8" }}>SHIPPING ADDRESS</div>
                                                <div style={{ fontWeight: 500, fontSize: 12, backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                                                    {shipment.shipping_address}
                                                </div>
                                            </Col>
                                        )}
                                        <Col span={24} style={{ marginTop: 8 }}>
                                            <Tag color={shipment.status === 'Delivered' ? 'green' : 'blue'}>{shipment.status}</Tag>
                                        </Col>
                                    </Row>
                                )}
                            </Card>
                        </Col>
                        <Col span={10}>
                            <div style={{ background: "#fff7ed", padding: 16, borderRadius: 12, border: "1px solid #ffedd5" }}>
                                <Row justify="space-between" style={{ marginBottom: 4 }}>
                                    <Text type="secondary">Subtotal</Text>
                                    <Text strong>₹{selectedBilling.subtotal_amount}</Text>
                                </Row>
                                <Row justify="space-between" style={{ marginBottom: 4 }}>
                                    <Text type="secondary">Tax</Text>
                                    <Text strong>₹{selectedBilling.tax_amount}</Text>
                                </Row>
                                <Row justify="space-between" style={{ marginBottom: 4 }}>
                                    <Text type="secondary">Discount</Text>
                                    <Text strong style={{ color: "#dc2626" }}>- ₹{selectedBilling.discount_amount}</Text>
                                </Row>
                                <Divider style={{ margin: "10px 0" }} />
                                <Row justify="space-between" align="middle">
                                    <Text strong style={{ fontSize: 16 }}>Total</Text>
                                    <Text strong style={{ fontSize: 20, color: "#c2410c" }}>₹{selectedBilling.total_amount}</Text>
                                </Row>
                                <div style={{ marginTop: 8, fontSize: 11, fontStyle: "italic", color: "#9a3412", textAlign: "right" }}>
                                    {amountToWords(selectedBilling.total_amount)}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            ) : (
                <Empty description="Billing details not found" />
            )}
        </Modal>
    );
};

export default BillDetailsModal;
