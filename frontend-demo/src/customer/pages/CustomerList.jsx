import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Button, Space, Popconfirm, message, Input, Tag, Grid, List, Card } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import customerService from "../service/customerService";

const CustomerList = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [messageApi, contextHolder] = message.useMessage();
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerService.getAllCustomers();
      setCustomers(response.data.data || []);
    } catch (error) {
      message.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await customerService.deleteCustomer(id);
      messageApi.success("Customer deleted successfully");
      fetchCustomers();
    } catch (error) {
      messageApi.error("Failed to delete customer");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "customer_name",
      key: "customer_name",
      filteredValue: [searchText],
      onFilter: (value, record) =>
        record.customer_name?.toLowerCase().includes(value.toLowerCase()) ||
        record.customer_phone?.toLowerCase().includes(value.toLowerCase()) ||
        record.customer_email?.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: "Phone",
      dataIndex: "customer_phone",
      key: "customer_phone",
    },
    {
      title: "Email",
      dataIndex: "customer_email",
      key: "customer_email",
      render: (email) => email || "-",
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      render: (city) => city || "-",
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <>
          {contextHolder}
          <Space>
            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/customer/details/${record.id}`)}
            />
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/customer/edit/${record.id}`)}
            />
            {/* <Popconfirm
            title="Delete customer?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" danger icon={<DeleteOutlined />} />
          </Popconfirm> */}
          </Space>
        </>
      ),
    },
  ];

  const screens = Grid.useBreakpoint();

  const filteredCustomers = customers.filter((c) =>
    (c.customer_name?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
    (c.customer_phone?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
    (c.customer_email?.toLowerCase() || "").includes(searchText.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold m-0">Customers</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search customers..."
            prefix={<SearchOutlined />}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-[300px]"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/customer/add")}
            className="w-full sm:w-auto"
          >
            Add Customer
          </Button>
        </div>
      </div>

      {!screens.md ? (
        <List
          grid={{ gutter: 16, column: 1 }}
          dataSource={filteredCustomers}
          loading={loading}
          pagination={{ pageSize: 10 }}
          renderItem={(item) => (
            <List.Item>
              <Card
                title={item.customer_name}
                bordered={false}
                style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                actions={[
                  <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/customer/details/${item.id}`)}>
                    View
                  </Button>,
                  <Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/customer/edit/${item.id}`)}>
                    Edit
                  </Button>,
                ]}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium">{item.customer_phone || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium">{item.customer_email || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">City:</span>
                    <span className="font-medium">{item.city || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}
                    </span>
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={customers}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
        />
      )}
    </div>
  );
};

export default CustomerList;
