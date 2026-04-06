import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Table, Button, Select, InputNumber, Input,
  Space, Typography, Divider, message, Popconfirm, Tag, Spin,
} from "antd";
import { PlusOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import productService from "../services/productService";
import rawMaterialService from "../../rawmaterial/service/rawMaterialService";

const { Option } = Select;
const { Text, Title } = Typography;

const BOMForm = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [items, setItems] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load product BOM
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    productService.getBOM(productId)
      .then((res) => {
        const data = res.data;
        setProduct(data.product);
        setItems(
          (data.items || []).map((item, idx) => ({
            key: item.id || idx,
            bomId: item.id,
            raw_material_id: item.raw_material_id,
            material_name: item.rawMaterial?.material_name || "",
            material_code: item.rawMaterial?.material_code || "",
            quantity: parseFloat(item.quantity),
            unit: item.unit || item.rawMaterial?.unit || "kg",
            notes: item.notes || "",
          }))
        );
      })
      .catch(() => message.error("Failed to load BOM"))
      .finally(() => setLoading(false));
  }, [productId]);

  // Load raw materials for dropdown
  const fetchMaterials = async (search = "") => {
    setMaterialsLoading(true);
    try {
      const res = await rawMaterialService.getAll({ page: 1, limit: search ? 100 : 30, search, status: "active" });
      setAllMaterials(res.data || []);
    } catch {
      message.error("Failed to load raw materials");
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const addRow = () => {
    setItems(prev => [...prev, { key: Date.now(), raw_material_id: null, quantity: 1, unit: "kg", notes: "" }]);
  };

  const removeRow = (key) => setItems(prev => prev.filter(i => i.key !== key));

  const updateRow = (key, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === "raw_material_id") {
        const mat = allMaterials.find(m => m.id === value);
        if (mat) {
          updated.unit = mat.unit || "kg";
          updated.material_name = mat.material_name;
          updated.material_code = mat.material_code;
        }
      }
      return updated;
    }));
  };

  // Check for duplicate raw materials in the list
  const hasDuplicates = () => {
    const ids = items.filter(i => i.raw_material_id).map(i => i.raw_material_id);
    return ids.length !== new Set(ids).size;
  };

  const handleSave = async () => {
    if (items.length === 0) return message.error("Add at least one raw material");
    if (items.some(i => !i.raw_material_id)) return message.error("Select a raw material for all rows");
    if (items.some(i => !i.quantity || i.quantity <= 0)) return message.error("Quantity must be greater than 0");
    if (hasDuplicates()) return message.error("Duplicate raw materials found — each material can only appear once");

    setSaving(true);
    try {
      await productService.saveBOM(productId, {
        items: items.map(i => ({
          raw_material_id: i.raw_material_id,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          notes: i.notes || undefined,
        })),
      });
      message.success("BOM saved successfully");
      navigate("/Product/bom");
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to save BOM");
    } finally {
      setSaving(false);
    }
  };

  // Already-selected material IDs (to disable in dropdown)
  const selectedIds = items.map(i => i.raw_material_id).filter(Boolean);

  const columns = [
    {
      title: "Raw Material",
      key: "raw_material_id",
      width: 260,
      render: (_, record) => (
        <Select
          showSearch
          style={{ width: "100%" }}
          placeholder="Select raw material"
          value={record.raw_material_id}
          loading={materialsLoading}
          filterOption={false}
          onSearch={fetchMaterials}
          onChange={(val) => updateRow(record.key, "raw_material_id", val)}
        >
          {allMaterials.map(m => (
            <Option
              key={m.id}
              value={m.id}
              disabled={selectedIds.includes(m.id) && m.id !== record.raw_material_id}
            >
              {m.material_name}
              <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>
                ({m.material_code})
              </Text>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Qty per Product",
      key: "quantity",
      width: 140,
      render: (_, record) => (
        <InputNumber
          min={0.001}
          step={0.001}
          precision={3}
          value={record.quantity}
          style={{ width: "100%" }}
          onChange={(val) => updateRow(record.key, "quantity", val)}
        />
      ),
    },
    {
      title: "Unit",
      key: "unit",
      width: 100,
      render: (_, record) => (
        <Select
          value={record.unit}
          style={{ width: "100%" }}
          onChange={(val) => updateRow(record.key, "unit", val)}
        >
          {["kg", "g", "meter", "liter", "piece", "roll", "bundle"].map(u => (
            <Option key={u} value={u}>{u}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Notes",
      key: "notes",
      render: (_, record) => (
        <Input
          value={record.notes}
          placeholder="Optional"
          onChange={(e) => updateRow(record.key, "notes", e.target.value)}
        />
      ),
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_, record) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeRow(record.key)}
        />
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={
          <Space>
            <span>Bill of Materials</span>
            {product && (
              <Tag color="blue">{product.product_name} — {product.product_code}</Tag>
            )}
          </Space>
        }
        extra={
          <Button onClick={() => navigate("/Product/bom")}>← Back to BOM List</Button>
        }
      >
        <Text type="secondary">
          Define how much of each raw material is needed to produce <strong>one unit</strong> of this product.
        </Text>

        <Divider />

        <Table
          dataSource={items}
          columns={columns}
          rowKey="key"
          pagination={false}
          scroll={{ x: 700 }}
          footer={() => (
            <Space>
              <Button icon={<PlusOutlined />} onClick={addRow}>Add Raw Material</Button>
              <Text type="secondary">Total: {items.length} material(s)</Text>
            </Space>
          )}
        />

        <Divider />

        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            Save BOM
          </Button>
          <Button onClick={() => navigate("/Product/bom")}>Cancel</Button>
        </Space>
      </Card>
    </Spin>
  );
};

export default BOMForm;
