import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Form, Input, InputNumber, Button, Select, DatePicker,
  message, Table, Card, Row, Col, Space, Typography, Divider,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import rawMaterialService from "../service/rawMaterialService";
import { useBranch } from "../../context/BranchContext";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const RawMaterialInwardForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { branches, selectedBranch } = useBranch();
  const [allMaterials, setAllMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [items, setItems] = useState([]);

  const needsBranchSelection = selectedBranch?.id === "all" && branches.length > 1;

  const fetchMaterials = async (search = "") => {
    setMaterialsLoading(true);
    try {
      const res = await rawMaterialService.getAll({ page: 1, limit: search ? 100 : 20, search, status: "active" });
      setAllMaterials(res.data || []);
    } catch {
      message.error("Failed to load raw materials");
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  useEffect(() => {
    if (id) {
      rawMaterialService.getInwardById(id).then((res) => {
        const data = res.data || res;
        form.setFieldsValue({
          supplier_name: data.supplier_name,
          supplier_invoice: data.supplier_invoice,
          received_date: data.received_date ? dayjs(data.received_date) : null,
          status: data.status,
          notes: data.notes,
        });
        setItems((data.items || []).map((item, idx) => ({
          key: idx,
          raw_material_id: item.raw_material_id,
          material_name: item.rawMaterial?.material_name || "",
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          batch_number: item.batch_number,
        })));
      }).catch(() => message.error("Failed to load inward"));
    }
  }, [id]);

  const addItem = () => {
    setItems(prev => [...prev, { key: Date.now(), raw_material_id: null, quantity: 1, unit: "kg", unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key));

  const updateItem = (key, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "unit_price") {
        updated.total_price = parseFloat((updated.quantity || 0) * (updated.unit_price || 0)).toFixed(2);
      }
      if (field === "raw_material_id") {
        const mat = allMaterials.find(m => m.id === value);
        if (mat) { updated.unit = mat.unit; updated.unit_price = parseFloat(mat.purchase_price || 0); updated.total_price = parseFloat((updated.quantity || 0) * updated.unit_price).toFixed(2); }
      }
      return updated;
    }));
  };

  const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.total_price || 0), 0);
  const totalQty = items.reduce((sum, i) => sum + parseFloat(i.quantity || 0), 0);

  const onFinish = async (values) => {
    if (items.length === 0) return message.error("Add at least one item");
    if (items.some(i => !i.raw_material_id)) return message.error("Select a raw material for all items");
    if (needsBranchSelection && !values.branch_id) return message.error("Please select a branch");

    setLoading(true);
    try {
      const payload = {
        ...values,
        received_date: values.received_date?.toISOString(),
        items: items.map(i => ({
          raw_material_id: i.raw_material_id,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          unit_price: parseFloat(i.unit_price),
          total_price: parseFloat(i.total_price),
          batch_number: i.batch_number,
        })),
      };
      if (needsBranchSelection) payload.branch_id = values.branch_id;

      await rawMaterialService.createInward(payload);
      message.success("Inward created successfully");
      navigate("/rawmaterial/inward/list");
    } catch (err) {
      message.error(err?.response?.data?.error || err.message || "Failed to save inward");
    } finally {
      setLoading(false);
    }
  };

  const itemColumns = [
    {
      title: "Raw Material",
      key: "raw_material_id",
      width: 220,
      render: (_, record) => (
        <Select
          showSearch
          style={{ width: "100%" }}
          placeholder="Select material"
          value={record.raw_material_id}
          loading={materialsLoading}
          filterOption={false}
          onSearch={fetchMaterials}
          onChange={(val) => updateItem(record.key, "raw_material_id", val)}
        >
          {allMaterials.map(m => <Option key={m.id} value={m.id}>{m.material_name} ({m.material_code})</Option>)}
        </Select>
      ),
    },
    {
      title: "Qty",
      key: "quantity",
      width: 100,
      render: (_, record) => (
        <InputNumber min={0.001} step={0.001} value={record.quantity} style={{ width: "100%" }}
          onChange={(val) => updateItem(record.key, "quantity", val)} />
      ),
    },
    {
      title: "Unit",
      key: "unit",
      width: 90,
      render: (_, record) => (
        <Select value={record.unit} style={{ width: "100%" }} onChange={(val) => updateItem(record.key, "unit", val)}>
          {["kg", "g", "meter", "liter", "piece", "roll", "bundle"].map(u => <Option key={u} value={u}>{u}</Option>)}
        </Select>
      ),
    },
    {
      title: "Unit Price",
      key: "unit_price",
      width: 110,
      render: (_, record) => (
        <InputNumber min={0} precision={2} value={record.unit_price} style={{ width: "100%" }}
          onChange={(val) => updateItem(record.key, "unit_price", val)} />
      ),
    },
    {
      title: "Total",
      key: "total_price",
      width: 110,
      render: (_, record) => <Text>₹{parseFloat(record.total_price || 0).toFixed(2)}</Text>,
    },
    {
      title: "Batch No",
      key: "batch_number",
      width: 120,
      render: (_, record) => (
        <Input value={record.batch_number} placeholder="Optional"
          onChange={(e) => updateItem(record.key, "batch_number", e.target.value)} />
      ),
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_, record) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeItem(record.key)} />
      ),
    },
  ];

  return (
    <Card title={id ? "View Inward" : "Add Raw Material Inward"}>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ status: "pending", received_date: dayjs() }}>
        <Row gutter={16}>
          {needsBranchSelection && (
            <Col xs={24} sm={12}>
              <Form.Item name="branch_id" label="Branch" rules={[{ required: true }]}>
                <Select placeholder="Select branch">
                  {branches.map(b => <Option key={b.id} value={b.id}>{b.branch_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={12}>
            <Form.Item name="supplier_name" label="Supplier Name" rules={[{ required: true, message: "Supplier name is required" }]}>
              <Input placeholder="Supplier name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="supplier_invoice" label="Supplier Invoice">
              <Input placeholder="Invoice number" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="received_date" label="Received Date" rules={[{ required: true, message: "Date is required" }]}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="status" label="Status">
              <Select>
                <Option value="pending">Pending</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="notes" label="Notes">
              <TextArea rows={2} placeholder="Optional notes" />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Items</Divider>
        <Table
          dataSource={items}
          columns={itemColumns}
          rowKey="key"
          pagination={false}
          scroll={{ x: 800 }}
          footer={() => (
            <Space>
              <Button icon={<PlusOutlined />} onClick={addItem}>Add Item</Button>
              <Text strong>Total Qty: {totalQty.toFixed(3)}</Text>
              <Text strong>Total Amount: ₹{totalAmount.toFixed(2)}</Text>
            </Space>
          )}
        />

        <Divider />
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Save Inward</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate("/rawmaterial/inward/list")}>Cancel</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default RawMaterialInwardForm;
