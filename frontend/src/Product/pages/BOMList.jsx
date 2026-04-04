import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Input, Button, Tag, Space, Card, message, Badge } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import productService from "../services/productService";
import debounce from "lodash.debounce";

const { Search } = Input;

const BOMList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchText, setSearchText] = useState("");

  const fetchProducts = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await productService.getAll({
        page: params.current || pagination.current,
        limit: params.pageSize || pagination.pageSize,
        search: params.search !== undefined ? params.search : searchText,
      });
      const result = res.data;

      // For each product, fetch BOM count
      const productsWithBOM = await Promise.all(
        (result.data || []).map(async (p) => {
          try {
            const bomRes = await productService.getBOM(p.id);
            return { ...p, bomCount: bomRes.data?.items?.length || 0 };
          } catch {
            return { ...p, bomCount: 0 };
          }
        })
      );

      setProducts(productsWithBOM);
      setPagination(prev => ({
        ...prev,
        current: result.page || 1,
        total: result.total || 0,
        pageSize: result.limit || 10,
      }));
    } catch {
      message.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText]);

  useEffect(() => { fetchProducts(); }, []);

  const handleSearch = debounce((value) => {
    setSearchText(value);
    fetchProducts({ current: 1, search: value });
  }, 500);

  const columns = [
    { title: "Product Code", dataIndex: "product_code", key: "product_code", width: 130 },
    { title: "Product Name", dataIndex: "product_name", key: "product_name" },
    { title: "Category", dataIndex: "category_name", key: "category_name" },
    {
      title: "BOM Status",
      key: "bom_status",
      width: 150,
      render: (_, record) =>
        record.bomCount > 0 ? (
          <Badge count={record.bomCount} color="green">
            <Tag color="green">Configured</Tag>
          </Badge>
        ) : (
          <Tag color="orange">Not Set</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Button
          type={record.bomCount > 0 ? "default" : "primary"}
          icon={record.bomCount > 0 ? <EditOutlined /> : <PlusOutlined />}
          onClick={() => navigate(`/Product/bom/${record.id}`)}
        >
          {record.bomCount > 0 ? "Edit BOM" : "Set BOM"}
        </Button>
      ),
    },
  ];

  return (
    <Card title="Bill of Materials (BOM)">
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="Search products..."
          onSearch={handleSearch}
          onChange={e => handleSearch(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (t) => `Total ${t} products`,
        }}
        onChange={(pag) => { setPagination(pag); fetchProducts({ current: pag.current, pageSize: pag.pageSize }); }}
        scroll={{ x: 700 }}
      />
    </Card>
  );
};

export default BOMList;
