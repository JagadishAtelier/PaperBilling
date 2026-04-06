// CustomerBillCopy.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Table, Typography, Divider, message } from "antd";
import dayjs from "dayjs";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import companyLogo from "../../components/assets/Company_logo.png"; // ✅ update path

const { Title, Text } = Typography;

// ✅ Attach fonts once (prevents vfs undefined error)
if (pdfFonts && pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else {
  pdfMake.vfs = pdfFonts.vfs; // fallback (for some builds)
}

const CustomerBillCopy = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { billing } = location.state || {};

  if (!billing) {
    return (
      <div style={{ padding: 12 }}>
        <Text>No billing data found.</Text>
        <Button
          type="primary"
          onClick={() => navigate(-1)}
          style={{ marginTop: 12, fontSize: 12 }}
        >
          Back
        </Button>
      </div>
    );
  }

  // ✅ Calculations
  const subtotal = billing.items.reduce(
    (sum, i) => sum + Number(i.unit_price || 0) * Number(i.quantity || 0),
    0
  );
  const totalTax = billing.items.reduce(
    (sum, i) => sum + Number(i.tax_amount || 0),
    0
  );
  const grandTotal = subtotal + totalTax;

  // 📌 Helper for Amount in Words
  const amountToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : 'Only ';
    return str;
  };

  // 📌 PDF Generator with pdfmake
  const generatePDF = async () => {
    const getBase64Image = (url) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
      });

    let logoBase64 = "";
    try {
      logoBase64 = await getBase64Image(companyLogo);
    } catch (e) {
      console.warn("Logo load failed", e);
    }

    const branch = billing.branch || {};
    const customer = billing.customer || {};

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      content: [
        // HEADER
        {
          columns: [
            logoBase64 ? { image: logoBase64, width: 60 } : { text: "ATELIER", style: "companyName", width: 60 },
            {
              stack: [
                { text: branch.branch_name || "Atelier Creations Pvt Ltd", style: "companyName" },
                { text: branch.address || "123 Main Street, City", style: "companyInfo" },
                { text: `${branch.city || ""}, ${branch.state || ""} - ${branch.zip || ""}`, style: "companyInfo" },
                { text: `Phone: ${branch.phone || "+91 98765 43210"} | Email: info@atelier.com`, style: "companyInfo" },
                { text: `GSTIN: ${branch.gstin || "33ABCDE1234F1Z5"}`, style: "gstinInfo" },
              ],
              alignment: 'right'
            },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 0.5, lineColor: '#e2e8f0' }] },

        // INVOICE TITLE
        { 
          text: "TAX INVOICE", 
          style: "invoiceTitle"
        },

        // CUSTOMER & BILL INFO
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: "BILL TO:", style: "sectionTitle" },
                { text: billing.customer_name, style: "customerName" },
                { text: billing.customer_address || customer.address || "No address provided", style: "customerInfo" },
                { text: `Phone: ${billing.custom_phone || billing.customer_phone}`, style: "customerInfo" },
                customer.gstin ? { text: `GSTIN: ${customer.gstin}`, style: "customerInfo" } : {},
              ],
            },
            {
              width: '50%',
              stack: [
                {
                  columns: [
                    { text: "Invoice No:", style: "billLabel", width: 80 },
                    { text: billing.billing_no, style: "billValue" },
                  ]
                },
                {
                  columns: [
                    { text: "Invoice Date:", style: "billLabel", width: 80 },
                    { text: dayjs(billing.billing_date).format("DD-MMM-YYYY"), style: "billValue" },
                  ]
                },
                {
                  columns: [
                    { text: "Place of Supply:", style: "billLabel", width: 80 },
                    { text: branch.state || "N/A", style: "billValue" },
                  ]
                },
                {
                  columns: [
                    { text: "Payment:", style: "billLabel", width: 80 },
                    { text: (billing.payment_method || "Cash").toUpperCase(), style: "billValue" },
                  ]
                },
              ],
              alignment: 'right'
            },
          ],
          margin: [0, 20, 0, 20],
        },

        // ITEMS TABLE
        {
          table: {
            headerRows: 1,
            widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
            body: [
              [
                { text: "#", style: "tableHeader" },
                { text: "Product / Description", style: "tableHeader" },
                { text: "HSN", style: "tableHeader" },
                { text: "Qty", style: "tableHeader", alignment: "center" },
                { text: "Rate", style: "tableHeader", alignment: "right" },
                { text: "Tax (%)", style: "tableHeader", alignment: "right" },
                { text: "Amount", style: "tableHeader", alignment: "right" },
              ],
              ...billing.items.map((item, i) => [
                { text: i + 1, style: "tableData" },
                { 
                  stack: [
                    { text: item.product_name, bold: true },
                    item.color || item.size ? { text: `${item.color || ""} ${item.size || ""}`, fontSize: 8, color: '#64748b' } : {}
                  ], 
                  style: "tableData" 
                },
                { text: item.product?.hsn_code || "N/A", style: "tableData" },
                { text: item.quantity, style: "tableData", alignment: "center" },
                { text: Number(item.unit_price).toFixed(2), style: "tableData", alignment: "right" },
                { text: `${Number(item.tax_percentage || 0).toFixed(1)}%`, style: "tableData", alignment: "right" },
                { text: Number(item.total_price).toFixed(2), style: "tableData", alignment: "right" },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i, node) => (i === 0 || i === node.table.body.length) ? '#000' : '#e2e8f0',
            fillColor: (i) => i === 0 ? '#f8fafc' : null,
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
        },

        // TOTALS & TAX BREAKUP
        {
          columns: [
            {
              width: '60%',
              stack: [
                { text: "Amount in words:", style: "sectionTitle", margin: [0, 20, 0, 5] },
                { text: amountToWords(Math.round(grandTotal)), style: "amountWords" },
                
                { text: "Tax Details:", style: "sectionTitle", margin: [0, 15, 0, 5] },
                {
                  table: {
                    widths: ['*', 'auto', 'auto'],
                    body: [
                      [{ text: "Tax Type", style: "taxHeader" }, { text: "Rate", style: "taxHeader" }, { text: "Amount", style: "taxHeader", alignment: 'right' }],
                      [{ text: "CGST", style: "taxData" }, { text: "9%", style: "taxData" }, { text: `₹${(totalTax / 2).toFixed(2)}`, style: "taxData", alignment: 'right' }],
                      [{ text: "SGST", style: "taxData" }, { text: "9%", style: "taxData" }, { text: `₹${(totalTax / 2).toFixed(2)}`, style: "taxData", alignment: 'right' }],
                    ]
                  },
                  layout: 'noBorders'
                }
              ]
            },
            {
              width: '40%',
              margin: [0, 20, 0, 0],
              table: {
                widths: ['*', 'auto'],
                body: [
                  [{ text: "Subtotal", style: "totalLabel" }, { text: `₹${subtotal.toFixed(2)}`, style: "totalValue" }],
                  [{ text: "Tax Total", style: "totalLabel" }, { text: `₹${totalTax.toFixed(2)}`, style: "totalValue" }],
                  billing.discount_amount > 0 ? [{ text: "Discount", style: "totalLabel" }, { text: `- ₹${Number(billing.discount_amount).toFixed(2)}`, style: "totalValue" }] : [],
                  [{ text: "Round Off", style: "totalLabel" }, { text: `₹${(Math.round(grandTotal) - grandTotal).toFixed(2)}`, style: "totalValue" }],
                  [
                    { text: "GRAND TOTAL", style: "grandTotalLabel" }, 
                    { text: `₹${Math.round(grandTotal).toFixed(2)}`, style: "grandTotalValue" }
                  ],
                ].filter(r => r.length > 0)
              },
              layout: 'noBorders'
            },
          ],
        },

        // TERMS & SIGNATURE
        {
          stack: [
            { text: "Terms & Conditions:", style: "sectionTitle", margin: [0, 40, 0, 5] },
            { text: "1. Goods once sold will not be taken back.", style: "termsText" },
            { text: "2. Subject to State Jurisdiction.", style: "termsText" },
            { text: "3. This is a computer generated invoice.", style: "termsText" },
          ]
        },
        {
          stack: [
            { text: "For Atelier Creations Pvt Ltd", alignment: "right", style: "sectionTitle", margin: [0, 10, 0, 40] },
            { text: "Authorized Signatory", alignment: "right", style: "footerSign" },
          ]
        },
      ],
      styles: {
        companyName: { fontSize: 18, bold: true, color: '#1e293b' },
        companyInfo: { fontSize: 9, color: '#475569' },
        gstinInfo: { fontSize: 9, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
        invoiceTitle: { fontSize: 16, bold: true, alignment: "center", margin: [0, 10, 0, 10], color: '#1e293b', background: '#f1f5f9' },
        sectionTitle: { fontSize: 9, bold: true, color: '#64748b', textTransform: 'uppercase' },
        customerName: { fontSize: 13, bold: true, color: '#0f172a', margin: [0, 2, 0, 2] },
        customerInfo: { fontSize: 10, color: '#334155' },
        billLabel: { fontSize: 10, color: '#64748b' },
        billValue: { fontSize: 10, bold: true, color: '#0f172a' },
        tableHeader: { bold: true, fontSize: 10, color: '#475569', margin: [0, 5, 0, 5] },
        tableData: { fontSize: 10, color: '#1e293b' },
        taxHeader: { fontSize: 8, bold: true, color: '#64748b' },
        taxData: { fontSize: 8, color: '#475569' },
        totalLabel: { fontSize: 10, color: '#64748b', margin: [0, 3, 0, 3] },
        totalValue: { fontSize: 10, bold: true, color: '#0f172a', alignment: 'right', margin: [0, 3, 0, 3] },
        grandTotalLabel: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 8, 0, 0] },
        grandTotalValue: { fontSize: 14, bold: true, color: '#b45309', alignment: 'right', margin: [0, 8, 0, 0] },
        amountWords: { fontSize: 10, italics: true, color: '#1e293b' },
        termsText: { fontSize: 8, color: '#64748b' },
        footerSign: { fontSize: 10, bold: true, color: '#0f172a' },
      },
    };

    pdfMake.createPdf(docDefinition).download(`Invoice_${billing.billing_no}_${billing.customer_name}.pdf`);
    message.success("Professional Invoice Generated!");
  };


  return (
    <div
      style={{
        padding: 12,
        maxWidth: 360,
        margin: "0 auto",
        background: "#fff",
        fontSize: 12,
      }}
    >
      <Title
        level={4}
        style={{ textAlign: "center", fontSize: 14, marginBottom: 8 }}
      >
        Customer Billing Copy
      </Title>
      <Divider style={{ margin: "4px 0" }} />

      <div style={{ fontSize: 12, lineHeight: 1.2 }}>
        <Text strong>Customer: </Text>
        {billing.customer_name} <br />
        <Text strong>Address: </Text>
        {billing.customer_address || "N/A"} <br />
        <Text strong>Phone: </Text>
        {billing.custom_phone || billing.customer_phone} <br />
        <Text strong>Date: </Text>
        {dayjs(billing.billing_date).format("DD-MM-YYYY")} <br />
        <Text strong>Status: </Text>
        {billing.status} <br />
        {billing.remarks && (
          <>
            <Text strong>Remarks: </Text>
            {billing.remarks} <br />
          </>
        )}
      </div>

      <Divider style={{ margin: "4px 0" }} />

      <div style={{ overflowX: "auto" }}>
        <Table
          dataSource={billing.items}
          columns={[
            { title: "Name", dataIndex: "product_name" },
            { title: "Qty", dataIndex: "quantity" },
            {
              title: "Unit",
              dataIndex: "unit_price",
              render: (v) => `₹${Number(v || 0).toFixed(2)}`,
            },
            {
              title: "Tax %",
              dataIndex: "tax_percentage",
              render: (v) => `${Number(v || 0).toFixed(2)}%`,
            },
            {
              title: "Total",
              dataIndex: "total_price",
              render: (v) => `₹${Number(v || 0).toFixed(2)}`,
            },
          ]}
          pagination={false}
          rowKey={(r, idx) => idx}
          size="small"
          bordered
          style={{ fontSize: 11 }}
        />
      </div>

      <Divider style={{ margin: "4px 0" }} />

      <div style={{ textAlign: "right", fontSize: 12, lineHeight: 1.2 }}>
        <Text strong>Subtotal: </Text>₹{subtotal.toFixed(2)} <br />
        <Text strong>Total Tax: </Text>₹{totalTax.toFixed(2)} <br />
        <Text strong>Grand Total: </Text>₹{grandTotal.toFixed(2)}
      </div>

      <Divider style={{ margin: "4px 0" }} />

      <Button
        type="primary"
        block
        onClick={() => window.print()}
        style={{ fontSize: 12, padding: "4px 0" }}
      >
        Print / Save
      </Button>

      <Button
        type="dashed"
        block
        style={{ marginTop: 4, fontSize: 12, padding: "4px 0" }}
        onClick={generatePDF}
      >
        Download PDF
      </Button>

      <Button
        type="default"
        block
        style={{ marginTop: 4, fontSize: 12, padding: "4px 0" }}
        onClick={() => navigate(-1)}
      >
        Back
      </Button>
    </div>
  );
};

export default CustomerBillCopy;
