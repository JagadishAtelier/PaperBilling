import { useEffect, useState, useCallback } from "react";
import { Table, Input, Card, Tag, message, Space } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import rawMaterialService from "../service/rawMaterialService";
import { useBranch } from "../../context/BranchContext";
import debounce from "lodash.debounce";

const { Search } = Input;

const RawMaterialStock = () => {
  const { selectedBranch } = useBranch();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchText, setSearchText] = useState("");

  const fetchData = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await rawMaterialService.getStock({
        page: params.current || pagination.current,
        limit: params.pageSize || pagination.pageSize,
        search: params.search !== undefined ? params.search : searchText,
      });
      setData(res.data || []);
      setPagination(prev => ({ ...prev, current: res.page || 1, total: res.total || 0, pageSize: res.limit || 10 }));
    } catch {
      message.error("Failed to fetch stock");
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText]);

  useEffect(() => { fetchData(); }, [selectedBranch]);

  const handleSearch = debounce((value) => {
    setSearchText(value);
    fetchData({ current: 1, search: value });
  }, 500);

  const columns = [
    {
      title: "Material Code",
      dataIndex: ["rawMaterial", "material_code"],
      key: "material_code",
      width: 130,
    },
    {
      title: "Material Name",
      dataIndex: ["rawMaterial", "material_name"],
      key: "material_name",
    },
    {
      title: "Category",
      dataIndex: ["rawMaterial", "category"],
      key: "category",
    },
    {
      title: "Branch",
      dataIndex: ["branch", "branch_name"],
      key: "branch_name",
    },
    {
      title: "Current Stock",
      key: "quantity",
      render: (_, record) => {
        const qty = parseFloat(record.quantity || 0);
        const minStock = parseFloat(record.rawMaterial?.min_stock || 0);
        const isLow = qty <= minStock;
        return (
          <Space>
            <span style={{ color: isLow ? "#ff4d4f" : "inherit", fontWeight: isLow ? 600 : 400 }}>
              {qty.toFixed(3)} {record.unit}
            </span>
            {isLow && <WarningOutlined style={{ color: "#ff4d4f" }} title="Low stock" />}
          </Space>
        );
      },
    },
    {
      title: "Min Stock",
      key: "min_stock",
      render: (_, record) => `${parseFloat(record.rawMaterial?.min_stock || 0).toFixed(3)} ${record.unit}`,
    },
    {
      title: "Status",
      key: "stock_status",
      render: (_, record) => {
        const qty = parseFloat(record.quantity || 0);
        const minStock = parseFloat(record.rawMaterial?.min_stock || 0);
        if (qty === 0) return <Tag color="red">Out of Stock</Tag>;
        if (qty <= minStock) return <Tag color="orange">Low Stock</Tag>;
        return <Tag color="green">In Stock</Tag>;
      },
    },
  ];

  return (
    <Card title="Raw Material Stock">
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="Search by name or code"
          onSearch={handleSearch}
          onChange={e => handleSearch(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Total ${t} items` }}
        onChange={(pag) => { setPagination(pag); fetchData({ current: pag.current, pageSize: pag.pageSize }); }}
        scroll={{ x: 700 }}
        rowClassName={(record) => {
          const qty = parseFloat(record.quantity || 0);
          const minStock = parseFloat(record.rawMaterial?.min_stock || 0);
          return qty <= minStock ? "ant-table-row-warning" : "";
        }}
      />
    </Card>
  );
};

export default RawMaterialStock;
