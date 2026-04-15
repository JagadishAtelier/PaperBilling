import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, Button, message, Card, Space, Row, Col } from "antd";
import { UserAddOutlined, EditOutlined } from "@ant-design/icons";
import customerService from "../service/customerService";

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
const [messageApi, contextHolder] = message.useMessage();
  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await customerService.getCustomerById(id);
      const customerData = response.data.data;
      
      // Map backend field names to form field names
      form.setFieldsValue({
        name: customerData.customer_name,
        phone: customerData.customer_phone,
        email: customerData.customer_email,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        pincode: customerData.pincode,
        gender: customerData.gender,
        date_of_birth: customerData.date_of_birth,
        anniversary_date: customerData.anniversary_date,
        notes: customerData.notes,
        gstin: customerData.customer_gstin,
      });
    } catch (error) {
      message.error("Failed to fetch customer");
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Map form field names to backend field names
      const payload = {
        customer_name: values.name,
        customer_phone: values.phone,
        customer_email: values.email || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        pincode: values.pincode || null,
        gender: values.gender || null,
        date_of_birth: values.date_of_birth || null,
        anniversary_date: values.anniversary_date || null,
        notes: values.notes || null,
        customer_gstin: values.gstin || null,
      };
      
      if (id) {
        await customerService.updateCustomer(id, payload);
        await messageApi.success("Customer updated successfully");
      } else {
        await customerService.createCustomer(payload);
        await messageApi.success("Customer created successfully");
      }
      navigate("/customer/list");
    } catch (error) {
      messageApi.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {contextHolder}
    <div className="p-6">
      {/* ── Page Heading ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {id ? <EditOutlined style={{ color: "#7c3aed" }} /> : <UserAddOutlined style={{ color: "#16a34a" }} />}
          {id ? "Edit Customer" : "Add New Customer"}
        </h2>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          {id ? "Update customer details below" : "Fill in customer details to create a new record"}
        </span>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input placeholder="Customer name" />
          </Form.Item>

          <Form.Item
            label="Phone"
            name="phone"
            rules={[
              { required: true, message: "Please enter phone" },
              { pattern: /^[0-9]{10}$/, message: "Invalid phone number" },
            ]}
          >
            <Input placeholder="10-digit phone number" maxLength={10} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { type: "email", message: "Please enter a valid email address" },
              {
                pattern: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
                message: "Invalid email format (e.g., name@domain.com)",
              },
            ]}
          >
            <Input placeholder="customer@example.com" type="email" />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <Input.TextArea rows={3} placeholder="Customer address" />
          </Form.Item>

          <Form.Item
            label="GSTIN"
            name="gstin"
            rules={[
              {
                pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                message: "Enter a valid 15-digit GSTIN",
              },
            ]}
          >
            <Input placeholder="e.g., 29ABCDE1234F1Z5" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {id ? "Update" : "Create"}
              </Button>
              <Button onClick={() => navigate("/customer/list")}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
    </>
  );
};

export default CustomerForm;
