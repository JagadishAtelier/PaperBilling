import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Button, Space, Popconfirm, Tag, message, Card, Input } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import rawMaterialService from "../service/rawMaterialService";
import { useBranch } from "../../context/BranchContext";
import debounce from "lodash.debounce";

const { Search } = Input;

const RawMaterialInwardList = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useBranch();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchText, setSearchText] = useState("");

  const fetchData = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await rawMaterialService.getAllInwards({
        page: params.current || pagination.current,
        limit: params.pageSize || pagination.pageSize,
        search: params.search !== undefined ? params.search : searchText,
      });
      setData(res.data || []);
      setPagination(prev => ({ ...prev, current: res.page || 1, total: res.total || 0, pageSize: res.limit || 10 }));
    } catch (err) {
      message.error("Failed to fetch inwards");
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText]);

  useEffect(() => { fetchData(); }, [selectedBranch]);

  const handleSearch = debounce((value) => {
    setSearchText(value);
    fetchData({ current: 1, search: value });
  }, 500);

  const handleDelete = async (id) => {
    try {
      await rawMaterialService.removeInward(id);
      message.success("Inward deleted");
      fetchData();
    } catch {
      message.error("Failed to delete inward");
    }
  };

  const columns = [
    { title: "Inward No", dataIndex: "inward_no", key: "inward_no", width: 130 },
    { title: "Supplier", dataIndex: "supplier_name", key: "supplier_name" },
    { title: "Invoice", dataIndex: "supplier_invoice", key: "supplier_invoice" },
    {
      title: "Date",
      dataIndex: "received_date",
      key: "received_date",
      render: (d) => d ? new Date(d).toLocaleDateString() : "-",
    },
    {
      title: "Total Qty",
      dataIndex: "total_quantity",
      key: "total_quantity",
      render: (v) => parseFloat(v || 0).toFixed(3),
    },
    {
      title: "Total Amount",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v) => `₹${parseFloat(v || 0).toFixed(2)}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => <Tag color={s === "completed" ? "green" : s === "cancelled" ? "red" : "orange"}>{s}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/rawmaterial/inward/view/${record.id}`)} />
          <Popconfirm title="Delete this inward?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Raw Material Inwards"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/rawmaterial/inward/add")}>
          Add Inward
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Search placeholder="Search by inward no or supplier" onSearch={handleSearch} onChange={e => handleSearch(e.target.value)} allowClear style={{ width: 280 }} />
      </Space>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Total ${t} items` }}
        onChange={(pag) => { setPagination(pag); fetchData({ current: pag.current, pageSize: pag.pageSize }); }}
        scroll={{ x: 800 }}
      />
    </Card>
  );
};

export default RawMaterialInwardList;
