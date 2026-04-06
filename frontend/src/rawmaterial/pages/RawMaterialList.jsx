import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, Input, Button, Space, Popconfirm, Tag, message, Select, Card, Grid
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import rawMaterialService from "../service/rawMaterialService";
import debounce from "lodash.debounce";

const { Search } = Input;
const { Option } = Select;

const RawMaterialList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const screens = Grid.useBreakpoint();

  const fetchData = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await rawMaterialService.getAll({
        page: params.current || pagination.current,
        limit: params.pageSize || pagination.pageSize,
        search: params.search !== undefined ? params.search : searchText,
        status: params.status !== undefined ? params.status : statusFilter,
      });
      setData(res.data || []);
      setPagination(prev => ({
        ...prev,
        current: res.page || 1,
        total: res.total || 0,
        pageSize: res.limit || 10,
      }));
    } catch (err) {
      message.error("Failed to fetch raw materials");
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, statusFilter]);

  useEffect(() => { fetchData(); }, []);

  const handleSearch = debounce((value) => {
    setPagination(prev => ({ ...prev, current: 1 }));
    setSearchText(value);
    fetchData({ current: 1, search: value });
  }, 500);

  const handleDelete = async (id) => {
    try {
      await rawMaterialService.remove(id);
      message.success("Raw material deleted");
      fetchData();
    } catch {
      message.error("Failed to delete");
    }
  };

  const columns = [
    { title: "Code", dataIndex: "material_code", key: "material_code", width: 120 },
    { title: "Name", dataIndex: "material_name", key: "material_name" },
    { title: "Category", dataIndex: "category", key: "category" },
    { title: "Unit", dataIndex: "unit", key: "unit", width: 80 },
    {
      title: "Purchase Price",
      dataIndex: "purchase_price",
      key: "purchase_price",
      render: (v) => `₹${parseFloat(v || 0).toFixed(2)}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => <Tag color={s === "active" ? "green" : "red"}>{s}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/rawmaterial/edit/${record.id}`)} />
          <Popconfirm title="Delete this raw material?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Raw Materials"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/rawmaterial/add")}>
          Add Material
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Search placeholder="Search by name or code" onSearch={handleSearch} onChange={e => handleSearch(e.target.value)} allowClear style={{ width: 250 }} />
        <Select placeholder="Filter by status" allowClear style={{ width: 150 }} onChange={(val) => { setStatusFilter(val); fetchData({ current: 1, status: val }); }}>
          <Option value="active">Active</Option>
          <Option value="inactive">Inactive</Option>
        </Select>
      </Space>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Total ${t} items` }}
        onChange={(pag) => { setPagination(pag); fetchData({ current: pag.current, pageSize: pag.pageSize }); }}
        scroll={{ x: 700 }}
      />
    </Card>
  );
};

export default RawMaterialList;
