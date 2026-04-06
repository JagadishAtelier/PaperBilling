import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { Card, Button, Table, Alert, Space, Typography, Tag, Upload } from "antd";
import { UploadOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from "@ant-design/icons";
import rawMaterialService from "../service/rawMaterialService";

const { Text } = Typography;

const RawMaterialBulkUpload = () => {
  const navigate = useNavigate();
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const parseFile = (file) => {
    setError("");
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        const parsed = rows.map((row) => ({
          material_name: row.material_name || row["Material Name"] || "",
          material_code: row.material_code || row["Material Code"] || "",
          category: row.category || row["Category"] || "",
          unit: row.unit || row["Unit"] || "kg",
          purchase_price: parseFloat(row.purchase_price || row["Purchase Price"] || 0),
          min_stock: parseFloat(row.min_stock || row["Min Stock"] || 0),
          supplier_name: row.supplier_name || row["Supplier Name"] || "",
          description: row.description || row["Description"] || "",
          status: row.status || row["Status"] || "active",
        }));

        setPreview(parsed);
      } catch {
        setError("Error parsing file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // prevent antd auto-upload
  };

  const handleUpload = async () => {
    if (preview.length === 0) return setError("No data to upload");
    setLoading(true);
    setError("");
    try {
      const res = await rawMaterialService.bulkUpload(preview);
      setResult(res);
      setPreview([]);
    } catch (err) {
      setError(err?.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        material_name: "Cotton Fabric",
        material_code: "RM00001",
        category: "Fabric",
        unit: "meter",
        purchase_price: 150,
        min_stock: 50,
        supplier_name: "ABC Textiles",
        description: "Premium cotton fabric",
        status: "active",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Raw Materials");
    XLSX.writeFile(wb, "raw_material_bulk_upload_template.xlsx");
  };

  const previewColumns = [
    { title: "Name", dataIndex: "material_name", key: "material_name" },
    { title: "Code", dataIndex: "material_code", key: "material_code" },
    { title: "Category", dataIndex: "category", key: "category" },
    { title: "Unit", dataIndex: "unit", key: "unit" },
    { title: "Purchase Price", dataIndex: "purchase_price", key: "purchase_price", render: (v) => `₹${v}` },
    { title: "Min Stock", dataIndex: "min_stock", key: "min_stock" },
    { title: "Supplier", dataIndex: "supplier_name", key: "supplier_name" },
  ];

  return (
    <Card
      title="Bulk Upload Raw Materials"
      extra={<Button onClick={() => navigate("/rawmaterial/list")}>← Back</Button>}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">

        {/* Actions */}
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Download Template
          </Button>
          <Upload beforeUpload={parseFile} accept=".xlsx,.xls" showUploadList={false}>
            <Button icon={<UploadOutlined />}>Choose Excel File</Button>
          </Upload>
        </Space>

        {error && <Alert type="error" message={error} showIcon />}

        {/* Preview table */}
        {preview.length > 0 && (
          <>
            <Alert
              type="info"
              message={`${preview.length} row(s) ready to upload`}
              showIcon
            />
            <Table
              dataSource={preview}
              columns={previewColumns}
              rowKey={(_, i) => i}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 700 }}
              size="small"
            />
            <Button type="primary" loading={loading} onClick={handleUpload}>
              Upload {preview.length} Materials
            </Button>
          </>
        )}

        {/* Results */}
        {result && (
          <Card size="small" title="Upload Results">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Space>
                <Tag color="green" icon={<CheckCircleOutlined />}>Created: {result.summary.success}</Tag>
                <Tag color="orange" icon={<WarningOutlined />}>Skipped: {result.summary.skipped}</Tag>
                <Tag color="red" icon={<CloseCircleOutlined />}>Failed: {result.summary.failed}</Tag>
              </Space>

              <Text type="secondary">{result.message}</Text>

              {/* Skipped */}
              {result.results.filter(r => r.skipped).length > 0 && (
                <div>
                  <Text strong style={{ color: "#d48806" }}>Skipped (already exist):</Text>
                  {result.results.filter(r => r.skipped).map((r, i) => (
                    <div key={i} style={{ padding: "4px 0", fontSize: 13, color: "#d48806" }}>
                      • {r.material_name} — {r.error}
                    </div>
                  ))}
                </div>
              )}

              {/* Failed */}
              {result.results.filter(r => !r.success && !r.skipped).length > 0 && (
                <div>
                  <Text strong style={{ color: "#cf1322" }}>Failed:</Text>
                  {result.results.filter(r => !r.success && !r.skipped).map((r, i) => (
                    <div key={i} style={{ padding: "4px 0", fontSize: 13, color: "#cf1322" }}>
                      • {r.material_name} — {r.error}
                    </div>
                  ))}
                </div>
              )}

              {result.summary.success > 0 && (
                <Button type="primary" onClick={() => navigate("/rawmaterial/list")}>
                  View Raw Materials
                </Button>
              )}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );
};

export default RawMaterialBulkUpload;
