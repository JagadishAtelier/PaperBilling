import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Divider,
  Select,
  Tabs,
  notification,
  Space,
  Upload,
  Radio,
  Row,
  Col,
  Avatar,
  message,
  Spin,
} from "antd";
import {
  SaveOutlined,
  UserOutlined,
  SettingOutlined,
  BellOutlined,
  SecurityScanOutlined,
  LockOutlined,
  UploadOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import userService from "../../user/service/userService";

const { Option } = Select;
const { TabPane } = Tabs;

const Settings = () => {
  const [profileForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [userData, setUserData] = useState(null);
  const { user } = useAuth();

  const {
    theme,
    setTheme,
    primaryColor,
    setPrimaryColor,
    contentBgColor,
    setContentBgColor,
    headerBgColor,
    setHeaderBgColor,
    sidebarBgColor,
    setSidebarBgColor,
    footerBgColor,
    setFooterBgColor,
    presetThemes,
    applyPresetTheme,
    currentPreset,
  } = useTheme();

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setFetchingData(true);
      
      // Check if token exists
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
      
      console.log('Fetching user profile data...');
      const response = await userService.getMe();
      console.log('Profile response:', response);
      
      // Handle different response structures
      const data = response.data?.data || response.data;
      console.log('User data:', data);
      
      setUserData(data);
      
      // Set profile form values
      const formValues = {
        username: data.username,
        email: data.email,
        phone: data.phone,
        role: data.role?.role_name || 'N/A',
      };
      
      console.log('Setting profile form values:', formValues);
      profileForm.setFieldsValue(formValues);
      console.log('Profile form values after set:', profileForm.getFieldsValue());
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      console.error('Error response:', error.response?.data);
      message.error('Failed to load user profile');
    } finally {
      setFetchingData(false);
    }
  };

  const handleProfileSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        username: values.username,
        email: values.email,
        phone: values.phone,
      };

      await userService.updateUser(userData.id, payload);
      
      message.success('Profile updated successfully');
      fetchUserData(); // Refresh user data
    } catch (error) {
      console.error('Failed to update profile:', error);
      message.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (values) => {
    setLoading(true);
    try {
      await userService.changePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      
      message.success('Password changed successfully');
      securityForm.resetFields();
    } catch (error) {
      console.error('Failed to change password:', error);
      message.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (info) => {
    if (info.file.status === "done") {
      setAvatarUrl(URL.createObjectURL(info.file.originFileObj));
    }
  };

  return (
    <div className="settings-page">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <Card variant={"borderless"}>
        <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key)}>
          <TabPane
            tab={
              <span>
                <UserOutlined /> Profile
              </span>
            }
            key="profile"
          >
            <Spin spinning={fetchingData}>
              {/* <div className="mb-6 flex justify-center">
                <Space direction="vertical" align="center">
                  <Avatar size={100} icon={<UserOutlined />} src={avatarUrl} />
                  <Upload
                    showUploadList={false}
                    beforeUpload={() => false}
                    onChange={handleAvatarChange}
                  >
                    <Button icon={<UploadOutlined />}>Change Avatar</Button>
                  </Upload>
                </Space>
              </div> */}

              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleProfileSubmit}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="username"
                      label="Username"
                      rules={[
                        { required: true, message: 'Please enter your username' },
                        { min: 3, message: 'Username must be at least 3 characters' }
                      ]}
                    >
                      <Input placeholder="Username" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[
                        { required: true, message: 'Please enter your email' },
                        { type: 'email', message: 'Please enter a valid email' }
                      ]}
                    >
                      <Input placeholder="Email" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[
                      { required: true, message: 'Please enter your phone number' },
                      { pattern: /^\d{10}$/, message: 'Phone must be 10 digits' }
                    ]}
                  >
                    <Input placeholder="Phone Number" maxLength={10} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="role"
                    label="Role"
                  >
                    <Input disabled placeholder="Role" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  Update Profile
                </Button>
              </Form.Item>
            </Form>
            </Spin>
          </TabPane>

          <TabPane
            tab={
              <span>
                <SecurityScanOutlined /> Security
              </span>
            }
            key="security"
          >
            <Form
              form={securityForm}
              layout="vertical"
              onFinish={handleSecuritySubmit}
            >
              <Form.Item
                name="currentPassword"
                label="Current Password"
                rules={[
                  {
                    required: true,
                    message: "Please enter your current password",
                  },
                ]}
              >
                <Input.Password placeholder="Enter current password" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: "Please enter your new password" },
                  { min: 6, message: "Password must be at least 6 characters" }
                ]}
              >
                <Input.Password placeholder="Enter new password" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={["newPassword"]}
                rules={[
                  {
                    required: true,
                    message: "Please confirm your new password",
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("The two passwords do not match")
                      );
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Confirm new password" />
              </Form.Item>

              <Divider />

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LockOutlined />}
                  loading={loading}
                >
                  Change Password
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;


