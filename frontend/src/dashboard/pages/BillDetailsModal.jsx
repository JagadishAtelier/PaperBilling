import React, { useEffect, useState, useRef } from "react";
import { Modal, Button, Table, Row, Col, Card, Avatar, Tag, message, Space, Spin, Typography, Input, DatePicker, Select, Empty, Divider } from "antd";
const { Text, Title } = Typography;
import { DownloadOutlined, EditOutlined, SaveOutlined, CloseOutlined, PrinterOutlined, FilePdfOutlined } from "@ant-design/icons";
import billingService from "../../billing/service/billingService";
import shipmentService from "../../billing/service/shipmentService";
import userService from "../../user/service/userService";
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
    if (s === "partially_paid") {
        return { color: "#f97316", bg: "#fff7ed", textColor: "#9a3412", label: "Partially Paid" };
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

// Format vehicle number to Indian registration format: AA 00 A(A) 0000
// Supports both 1-letter series (TN 37 A 1234) and 2-letter series (MH 12 AB 1234)
const formatVehicleNo = (value) => {
    // Strip everything except alphanumeric, convert to uppercase
    const raw = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const part1 = raw.slice(0, 2); // State code: AA
    const part2 = raw.slice(2, 4); // District no: 00
    const rest  = raw.slice(4);    // Series + Number

    if (!rest) return [part1, part2].filter(Boolean).join(' ');

    // Detect series: leading 1 or 2 letters, then up to 4 digits
    let seriesLen = 0;
    while (seriesLen < 2 && seriesLen < rest.length && /[A-Z]/.test(rest[seriesLen])) {
        seriesLen++;
    }

    const part3 = rest.slice(0, seriesLen);             // Series: A or AA
    const part4 = rest.slice(seriesLen, seriesLen + 4); // Number: 0000

    return [part1, part2, part3, part4].filter(Boolean).join(' ');
};

const BillDetailsModal = ({ visible, onClose, billId, initialData }) => {
    const [selectedBilling, setSelectedBilling] = useState(null);
    const [branchDetails, setBranchDetails] = useState(null);
    const [shipment, setShipment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [shipmentLoading, setShipmentLoading] = useState(false);
    const [isEditingShipment, setIsEditingShipment] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
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

    const fetchBranchDetails = async (branchId) => {
        if (!branchId) return;
        try {
            const res = await userService.getBranchById(branchId);
            const data = res?.data?.data || res?.data || res;
            setBranchDetails(data);
        } catch (e) {
            console.error("Failed to fetch branch details:", e);
        }
    };

    const fetchBillingById = async (id, isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const res = await billingService.getById(id);
            const payload = res?.data ? res.data : res;
            if (payload) {
                setSelectedBilling(payload);
                // Fetch branch details using the billing's branch_id
                if (payload.branch_id) {
                    fetchBranchDetails(payload.branch_id);
                }
            }
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
            messageApi.success("Shipment updated successfully");
            setIsEditingShipment(false);
            fetchShipment(billId);
        } catch (e) {
            messageApi.error("Failed to update shipment");
        } finally {
            setShipmentLoading(false);
        }
    };

    const exportGSTInvoicePDF = () => {
        const billing = selectedBilling;
        if (!billing) return;

        const branch = branchDetails || {};
        const sellerName = branch.branch_name || 'Your Company';
        const sellerAddress = [branch.address, branch.city, branch.state].filter(Boolean).join(', ') || '';
        const sellerGSTIN = branch.gstin || 'N/A';
        const sellerPhone = branch.phone || '';

        // Compute CGST/SGST per item (assume intra-state: CGST = SGST = tax/2)
        const items = (billing.items || []).map((it, idx) => {
            const baseAmt = parseFloat(it.unit_price || 0) * parseInt(it.quantity || 1);
            const storedTaxAmt = parseFloat(it.tax || it.tax_amount || 0);

            // Use stored tax_percentage if available; otherwise reverse-calculate from tax amount
            let taxRate = parseFloat(it.tax_percentage || 0);
            if (taxRate === 0 && storedTaxAmt > 0 && baseAmt > 0) {
                taxRate = Math.round((storedTaxAmt / baseAmt) * 100 * 100) / 100; // round to 2dp
            }

            const cgstRate = taxRate / 2;
            const sgstRate = taxRate / 2;
            // Use stored tax amount (split half each) if available, else compute from rate
            const taxAmtToSplit = storedTaxAmt > 0 ? storedTaxAmt : (baseAmt * taxRate) / 100;
            const cgstAmt = (taxAmtToSplit / 2).toFixed(2);
            const sgstAmt = (taxAmtToSplit / 2).toFixed(2);
            const total = parseFloat(it.total_price || 0).toFixed(2);
            return {
                idx: idx + 1,
                name: it.product?.product_name || it.product_name || '-',
                hsn: it.product?.hsn_code || '-',
                qty: it.quantity,
                unit: it.product?.unit || 'Pcs',
                rate: parseFloat(it.unit_price || 0).toFixed(2),
                taxRate,
                cgstRate,
                sgstRate,
                cgstAmt,
                sgstAmt,
                total,
            };
        });

        const totalCGST = items.reduce((s, i) => s + parseFloat(i.cgstAmt), 0).toFixed(2);
        const totalSGST = items.reduce((s, i) => s + parseFloat(i.sgstAmt), 0).toFixed(2);
        const subtotal = parseFloat(billing.subtotal_amount || 0).toFixed(2);
        const discount = parseFloat(billing.discount_amount || 0).toFixed(2);
        const grandTotal = parseFloat(billing.total_amount || 0).toFixed(2);

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            messageApi.error('Please allow popups to download the invoice.');
            return;
        }

        const itemRows = items.map(it => `
            <tr>
                <td>${it.idx}</td>
                <td>${it.name}</td>
                <td>${it.hsn}</td>
                <td>${it.unit}</td>
                <td style="text-align:right">${it.qty}</td>
                <td style="text-align:right">₹${it.rate}</td>
                <td style="text-align:right">${it.cgstRate}%</td>
                <td style="text-align:right">₹${it.cgstAmt}</td>
                <td style="text-align:right">${it.sgstRate}%</td>
                <td style="text-align:right">₹${it.sgstAmt}</td>
                <td style="text-align:right">₹${it.total}</td>
            </tr>
        `).join('');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${billing.billing_no}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
    .outer-border { border: 2px solid #111; padding: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 14px; border-bottom: 1px solid #ccc; }
    .company-name { font-size: 18px; font-weight: 800; color: #1a3a5c; }
    .company-sub { font-size: 10px; color: #555; margin-top: 2px; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .invoice-title .copy-label { font-size: 9px; color: #888; margin-top: 2px; }
    .info-section { display: flex; border-bottom: 1px solid #ccc; }
    .info-box { flex: 1; padding: 10px 14px; }
    .info-box:not(:last-child) { border-right: 1px solid #ccc; }
    .info-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; font-weight: 700; }
    .info-value { font-size: 11px; font-weight: 600; line-height: 1.5; }
    .info-value-sm { font-size: 10px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead tr { background: #1a3a5c; color: #fff; }
    thead th { padding: 6px 5px; text-align: left; font-weight: 600; }
    thead th.num { text-align: right; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 5px; border-bottom: 1px solid #e8ecf0; vertical-align: top; }
    .summary-section { display: flex; border-top: 1px solid #ccc; }
    .words-box { flex: 2; padding: 10px 14px; border-right: 1px solid #ccc; }
    .totals-box { flex: 1; padding: 8px 14px; }
    .total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
    .total-row.grand { border-top: 2px solid #111; margin-top: 4px; padding-top: 4px; font-weight: 800; font-size: 13px; color: #1a3a5c; }
    .footer-section { display: flex; justify-content: space-between; padding: 10px 14px; border-top: 1px solid #ccc; font-size: 10px; }
    .sign-box { text-align: right; }
    .sign-line { border-top: 1px solid #555; margin-top: 30px; padding-top: 4px; font-size: 10px; color: #555; }
    .gstin-badge { display: inline-block; background: #eef2ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-top: 4px; }
    @media print { button { display: none !important; } }
  </style>
</head>
<body>
<div class="outer-border">
  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="company-name">${sellerName}</div>
      ${sellerAddress ? `<div class="company-sub">${sellerAddress}</div>` : ''}
      ${sellerPhone ? `<div class="company-sub">Ph: ${sellerPhone}</div>` : ''}
      <div class="gstin-badge">GSTIN: ${sellerGSTIN}</div>
    </div>
    <div class="invoice-title">
      <h2>Tax Invoice</h2>
      <div class="copy-label">ORIGINAL FOR BUYER</div>
      <div style="margin-top:8px; font-size:11px;">
        <strong>Invoice No:</strong> ${billing.billing_no || '-'}<br>
        <strong>Date:</strong> ${billing.billing_date ? dayjs(billing.billing_date).format('DD-MM-YYYY') : '-'}<br>
        ${billing.counter_no ? `<strong>Counter:</strong> ${billing.counter_no}` : ''}
      </div>
    </div>
  </div>

  <!-- BILL TO / DETAILS -->
  <div class="info-section">
    <div class="info-box" style="flex:2">
      <div class="info-label">Bill To</div>
      <div class="info-value">${billing.customer_name || '-'}</div>
      <div class="info-value-sm">${billing.custom_phone || billing.customer_phone || ''}</div>
      ${billing.buyer_gstin ? `<div class="gstin-badge" style="margin-top:4px;">GSTIN: ${billing.buyer_gstin}</div>` : ''}
      ${billing.customer_address ? `<div class="info-value-sm" style="margin-top:3px;">${billing.customer_address}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="info-label">Place of Supply</div>
      <div class="info-value">${branch.state || '-'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Payment</div>
      <div class="info-value">${(billing.payment_method || 'Cash').toUpperCase()}</div>
      <div class="info-value-sm" style="margin-top:3px;">
        <span style="background:${statusMeta(billing.status).bg};color:${statusMeta(billing.status).color};padding:2px 8px;border-radius:4px;font-weight:700">${statusMeta(billing.status).label}</span>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th style="width:24px">#</th>
        <th>Description of Goods</th>
        <th>HSN</th>
        <th>Unit</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">CGST%</th>
        <th class="num">CGST Amt</th>
        <th class="num">SGST%</th>
        <th class="num">SGST Amt</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- TOTALS + AMOUNT IN WORDS -->
  <div class="summary-section">
    <div class="words-box">
      <div class="info-label">Amount in Words</div>
      <div style="font-size:11px; font-weight:600; margin-top:4px; font-style:italic;">Rupees ${amountToWords(billing.total_amount)}</div>
      ${billing.notes ? `<div style="margin-top:8px;"><span class="info-label">Notes:</span><div style="font-size:10px;margin-top:2px;">${billing.notes}</div></div>` : ''}
    </div>
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>₹${subtotal}</span></div>
      <div class="total-row"><span>CGST</span><span>₹${totalCGST}</span></div>
      <div class="total-row"><span>SGST</span><span>₹${totalSGST}</span></div>
      ${parseFloat(discount) > 0 ? `<div class="total-row"><span>Discount</span><span style="color:#dc2626">- ₹${discount}</span></div>` : ''}
      <div class="total-row grand"><span>Grand Total</span><span>₹${grandTotal}</span></div>
      <div class="total-row" style="margin-top:4px;"><span>Paid Amount</span><span>₹${parseFloat(billing.paid_amount || 0).toFixed(2)}</span></div>
      <div class="total-row" style="color:#c2410c; font-weight:700;"><span>Balance Due</span><span>₹${parseFloat(billing.due_amount || 0).toFixed(2)}</span></div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer-section">
    <div>
      <div class="info-label">Declaration</div>
      <div style="font-size:9px; color:#555; max-width:300px; margin-top:2px;">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
    </div>
    <div class="sign-box">
      <div style="font-size:10px; font-weight:700; margin-bottom:4px;">${sellerName}</div>
      <div class="sign-line">Authorised Signatory</div>
    </div>
  </div>
</div>

<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const printShipmentSlip = () => {
        if (!shipment || !selectedBilling) return;

        // Validation: Ensure required fields are filled before printing
        const required = [
            { field: shipment.estimated_delivery, label: "Est. Delivery" },
            { field: shipment.status, label: "Status" },
            { field: shipment.vehicle_no, label: "Vehicle No" },
            { field: shipment.driver_name, label: "Driver Name" },
            { field: shipment.driver_phone, label: "Driver Phone" }
        ];

        const missing = required.filter(item => !item.field).map(item => item.label);
        if (missing.length > 0) {
            messageApi.error(`Please fill the following shipment details before printing: ${missing.join(", ")}`);
            return;
        }

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
    .customer-section-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .customer-info { flex: 1; }
    .customer-name { font-size: 16px; font-weight: 700; }
    .customer-phone { font-size: 13px; color: #333; margin-top: 3px; }
    .qr-wrapper { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
    .qr-container { position: relative; width: 110px; height: 110px; }
    .qr-container img.qr-img { width: 110px; height: 110px; display: block; }
    .qr-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 26px; height: 26px; background: white; border-radius: 50%; padding: 2px; box-shadow: 0 0 0 2px white; }
    .qr-label { font-size: 9px; color: #555; text-align: center; font-weight: 600; letter-spacing: 0.3px; }
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
    <div class="customer-section-inner">
      <div class="customer-info">
        <div class="customer-name">${selectedBilling.customer_name || "—"}</div>
        ${selectedBilling.custom_phone || selectedBilling.customer_phone ? `<div class="customer-phone">Ph: ${selectedBilling.custom_phone || selectedBilling.customer_phone}</div>` : ""}
        ${shipment.shipping_address ? `<div class="address-box" style="margin-top:8px;">${shipment.shipping_address}</div>` : ""}
      </div>
      ${shipment.shipping_address ? (() => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shipment.shipping_address)}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(mapsUrl)}`;
        const mapsPinSvg = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="white"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EA4335"/></svg>')}`;
        return `<div class="qr-wrapper">
          <div class="qr-container">
            <img class="qr-img" src="${qrUrl}" alt="Location QR" crossorigin="anonymous" />
            <img class="qr-icon" src="${mapsPinSvg}" alt="maps" />
          </div>
          <div class="qr-label">Scan for Location</div>
        </div>`;
      })() : ""}
    </div>
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
        <>
        {contextHolder}
        <Modal
            style={{ top: 15 }}
            className="invoice-modal"
            centered
            open={visible}
            title={null}
            onCancel={onClose}
            footer={[
                <Space key="modal-actions">
                    <Button
                        type="primary"
                        icon={<FilePdfOutlined />}
                        onClick={exportGSTInvoicePDF}
                        disabled={!selectedBilling}
                    >
                        GST Invoice
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
                                                <Input
                                                    value={shipmentForm.vehicle_no}
                                                    onChange={e => {
                                                        const formatted = formatVehicleNo(e.target.value);
                                                        setShipmentForm({...shipmentForm, vehicle_no: formatted});
                                                    }}
                                                    placeholder="e.g. MH 12 AB 1234"
                                                    maxLength={13}
                                                    style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                                />
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
                                {(selectedBilling.due_amount > 0 || selectedBilling.paid_amount > 0) && (
                                    <>
                                        <Divider style={{ margin: "10px 0" }} />
                                        <Row justify="space-between">
                                            <Text type="secondary">Paid Amount</Text>
                                            <Text strong style={{ color: "#16a34a" }}>₹{selectedBilling.paid_amount}</Text>
                                        </Row>
                                        <Row justify="space-between">
                                            <Text strong>Balance Due</Text>
                                            <Text strong style={{ color: "#c2410c", fontSize: 16 }}>₹{selectedBilling.due_amount}</Text>
                                        </Row>
                                    </>
                                )}

                                {selectedBilling.payments && selectedBilling.payments.length > 0 && (
                                    <>
                                        <Divider style={{ margin: "10px 0" }} />
                                        <Text strong style={{ fontSize: 13, color: "#64748b" }}>Payment History</Text>
                                        <div style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
                                            {selectedBilling.payments.map((pmt, idx) => (
                                                <Row key={idx} justify="space-between" align="middle" style={{ padding: "4px 0", borderBottom: idx < selectedBilling.payments.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                                                    <div>
                                                        <div style={{ fontSize: 12, color: "#475569" }}>
                                                            {dayjs(pmt.payment_date).format("DD MMM YYYY, HH:mm")}
                                                        </div>
                                                        <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>
                                                            {pmt.payment_method}
                                                        </div>
                                                    </div>
                                                    <Text strong style={{ color: "#16a34a" }}>₹{pmt.amount}</Text>
                                                </Row>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </Col>
                    </Row>
                </div>
            ) : (
                <Empty description="Billing details not found" />
            )}
        </Modal>
        </>
    );
};

export default BillDetailsModal;
