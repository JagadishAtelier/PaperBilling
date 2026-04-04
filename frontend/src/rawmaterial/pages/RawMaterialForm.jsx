import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, InputNumber, Button, Select, Card, Row, Col, message } from "antd";
import rawMaterialService from "../service/rawMaterialService";

const { Option } = Select;
const { TextArea } = Input;

const RawMaterialForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      rawMaterialService.getById(id).then((res) => {
        const data = res.data || res;
        form.setFieldsValue(data);
      }).catch(() => message.error("Failed to load raw material"));
    }
  }, [id]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (id) {
        await rawMaterialService.update(id, values);
        message.success("Raw material updated successfully");
      } else {
        await rawMaterialService.create(values);
        message.success("Raw material created successfully");
      }
      navigate("/rawmaterial/list");
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to save raw material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={id ? "Edit Raw Material" : "Add Raw Material"}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ unit: "kg", status: "active", purchase_price: 0, min_stock: 0 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="material_name" label="Material Name" rules={[{ required: true, message: "Material name is required" }]}>
              <Input placeholder="e.g. Cotton Fabric" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="material_code" label="Material Code" rules={[{ required: true, message: "Material code is required" }]}>
              <Input placeholder="e.g. RM-001" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="category" label="Category">
              <Input placeholder="e.g. Fabric, Thread, Dye" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="unit" label="Unit">
              <Select>
                <Option value="kg">kg</Option>
                <Option value="g">g</Option>
                <Option value="meter">meter</Option>
                <Option value="liter">liter</Option>
                <Option value="piece">piece</Option>
                <Option value="roll">roll</Option>
                <Option value="bundle">bundle</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="purchase_price" label="Purchase Price (₹)">
              <InputNumber min={0} precision={2} style={{ width: "100%" }} prefix="₹" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="min_stock" label="Minimum Stock">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="supplier_name" label="Default Supplier">
              <Input placeholder="Supplier name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="status" label="Status">
              <Select>
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="description" label="Description">
              <TextArea rows={3} placeholder="Optional description" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {id ? "Update" : "Create"} Raw Material
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate("/rawmaterial/list")}>
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default RawMaterialForm;
