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
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
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
      if (customerData.customer_email) {
        setVerified(true);
        setEmailValue(customerData.customer_email);
        setOriginalEmail(customerData.customer_email);
      }
    } catch (error) {
      message.error("Failed to fetch customer");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const email = form.getFieldValue("email");
    if (!email) {
      return message.error("Please enter email first");
    }
    
    setOtpLoading(true);
    try {
      await customerService.sendOtp(email);
      message.success("OTP sent to " + email);
      setOtpSent(true);
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = form.getFieldValue("email");
    const otp = form.getFieldValue("otp");
    if (!otp) {
      return message.error("Please enter OTP");
    }

    setOtpLoading(true);
    try {
      await customerService.verifyOtp(email, otp);
      message.success("Email verified successfully");
      setVerified(true);
      setOtpSent(false);
    } catch (error) {
      message.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
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
            label="Email (Optional)"
            name="email"
            rules={[
              { type: "email", message: "Please enter a valid email address" },
              {
                pattern: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
                message: "Invalid email format (e.g., name@domain.com)",
              },
            ]}
          >
            <Input 
              placeholder="customer@example.com" 
              type="email" 
              onChange={(e) => {
                const val = e.target.value;
                setEmailValue(val);
                if (val === originalEmail && originalEmail !== "") {
                    setVerified(true);
                } else if (val !== emailValue) {
                    setVerified(false);
                    setOtpSent(false);
                }
              }}
              suffix={verified ? <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Verified</span> : null}
              disabled={verified && !id}
            />
          </Form.Item>

          {emailValue && !verified && !otpSent && (
            <Button 
                type="dashed" 
                onClick={handleSendOtp} 
                loading={otpLoading}
                style={{ marginBottom: 16 }}
            >
                Send Verification OTP
            </Button>
          )}

          {otpSent && !verified && (
            <div style={{ marginBottom: 16, background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <Form.Item
                    label="Enter OTP"
                    name="otp"
                    extra="Check your email for the 6-digit code"
                >
                    <Input placeholder="6-digit OTP" maxLength={6} style={{ width: 200 }} />
                </Form.Item>
                <Space>
                    <Button type="primary" onClick={handleVerifyOtp} loading={otpLoading}>
                        Verify OTP
                    </Button>
                    <Button onClick={handleSendOtp} loading={otpLoading}>
                        Resend
                    </Button>
                </Space>
            </div>
          )}

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
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                disabled={emailValue && !verified}
              >
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
