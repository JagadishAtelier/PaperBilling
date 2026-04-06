// ProductForm.jsx - Paper Manufacture Product Form
import React, { useEffect, useState } from "react";
import {
  Steps,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
  Spin,
  Card,
  Row,
  Col,
  Divider,
  Grid,
  Tooltip,
} from "antd";
import { LeftOutlined, RightOutlined, CheckCircleTwoTone, InfoCircleOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import productService from "../services/productService";
import categoryService from "../services/categoryService";
import subcategoryService from "../services/subcategoryService";

const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;
const { useBreakpoint } = Grid;

const STEP_COLORS = ["#6B9BD3", "#7BD389", "#FFB86B", "#FF7A7A"];

const isUUID = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const ProductForm = () => {
  const screens = useBreakpoint();
  const { id: routeId } = useParams() || {};
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await categoryService.getAll();
      const result = res.data;
      const categoriesArray = result.data || [];
      setCategories(Array.isArray(categoriesArray) ? categoriesArray : []);
    } catch (err) {
      console.error("Category fetch error:", err);
      message.error("Failed to fetch categories");
    }
  };

  // Fetch subcategories for category
  const handleCategoryChange = async (categoryId) => {
    form.setFieldsValue({ sub_category_id: undefined });
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const res = await subcategoryService.getByCategory(categoryId);
      const result = res.data;
      const subcategoriesArray = result.data || [];
      setSubcategories(Array.isArray(subcategoriesArray) ? subcategoriesArray : []);
    } catch (err) {
      console.error("Subcategory fetch error:", err);
      message.error("Failed to fetch subcategories");
    }
  };

  // Fetch existing product when editing
  const fetchProduct = async (productId) => {
    if (!productId) return;
    setLoading(true);
    try {
      const response = await productService.getById(productId);
      const data = response.data || response;

      if (data?.category_id) await handleCategoryChange(data.category_id);

      form.setFieldsValue({
        product_name: data.product_name,
        category_id: data.category_id,
        sub_category_id: data.sub_category_id,
        gsm: data.gsm,
        paper_type: data.paper_type,
        finish: data.finish,
        size: data.size,
        color: data.color,
        grain_direction: data.grain_direction,
        opacity: data.opacity,
        brightness: data.brightness,
        unit: data.unit,
        purchase_price: data.purchase_price,
        selling_price: data.selling_price,
        mrp: data.mrp,
        discount_percentage: data.discount_percentage,
        tax_percentage: data.tax_percentage,
        description: data.description,
        barcode: data.barcode,
        sku: data.sku,
        hsn_code: data.hsn_code,
        image_url: data.image_url,
        min_stock: data.min_stock,
        status: data.status || "active",
      });
    } catch (err) {
      console.error("Product fetch error:", err);
      message.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (routeId) fetchProduct(routeId);
  }, [routeId]);

  // Validation groups for steps
  const stepFieldMap = [
    ["category_id", "product_name"],
    ["gsm", "paper_type"],
    ["purchase_price", "selling_price"],
    ["description", "status"],
  ];

  const next = async () => {
    try {
      const fields = stepFieldMap[current] || [];
      if (fields.length) await form.validateFields(fields);
      setCurrent((c) => Math.min(c + 1, STEP_COLORS.length - 1));
    } catch (err) {
      console.log("Validation failed for step", current, err);
    }
  };

  const prev = () => setCurrent((c) => Math.max(c - 1, 0));

  // Build payload from form
  const buildPayloadFromForm = () => {
    const values = form.getFieldsValue(true);
    const trim = (v) => (typeof v === "string" ? v.trim() : v);
    const toNumber = (v) => {
      if (v === null || v === undefined || v === "") return undefined;
      const num = Number(v);
      return isNaN(num) ? undefined : num;
    };

    const payload = {
      product_name: trim(values.product_name ?? ""),
      category_id: values.category_id != null ? String(values.category_id) : "",
      sub_category_id: values.sub_category_id != null ? String(values.sub_category_id) : undefined,
      // Paper manufacture attributes
      gsm: toNumber(values.gsm),
      paper_type: trim(values.paper_type ?? "") || undefined,
      finish: trim(values.finish ?? "") || undefined,
      size: trim(values.size ?? "") || undefined,
      color: trim(values.color ?? "") || undefined,
      grain_direction: trim(values.grain_direction ?? "") || undefined,
      opacity: toNumber(values.opacity),
      brightness: toNumber(values.brightness),
      // Common fields
      unit: trim(values.unit ?? "kg"),
      purchase_price: toNumber(values.purchase_price) ?? 0,
      selling_price: toNumber(values.selling_price) ?? 0,
      mrp: toNumber(values.mrp),
      discount_percentage: toNumber(values.discount_percentage) ?? 0,
      tax_percentage: toNumber(values.tax_percentage) ?? 0,
      description: trim(values.description ?? "") || undefined,
      barcode: trim(values.barcode ?? "") || undefined,
      sku: trim(values.sku ?? "") || undefined,
      hsn_code: trim(values.hsn_code ?? "") || undefined,
      image_url: trim(values.image_url ?? "") || undefined,
      min_stock: toNumber(values.min_stock) ?? 10,
      status: trim(values.status ?? "active"),
    };

    return payload;
  };

  // Map backend validation to form fields
  const applyServerValidationToForm = (errorArray) => {
    if (!Array.isArray(errorArray)) return;
    const fieldErrors = errorArray
      .map((e) => {
        const name = Array.isArray(e.path) ? e.path : (e.path ? [e.path] : [""]);
        return { name, errors: [e.message || "Invalid value"] };
      })
      .filter(Boolean);
    if (fieldErrors.length) form.setFields(fieldErrors);
  };

  // Final submit
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await form.validateFields();
      const payload = buildPayloadFromForm();

      const clientFieldErrors = [];
      if (!payload.product_name || payload.product_name.length === 0) {
        clientFieldErrors.push({ name: ["product_name"], errors: ["Product name is required"] });
      }
      if (!payload.category_id || payload.category_id.length === 0) {
        clientFieldErrors.push({ name: ["category_id"], errors: ["Please select category"] });
      }

      if (clientFieldErrors.length) {
        form.setFields(clientFieldErrors);
        setLoading(false);
        setCurrent(0);
        return;
      }

      if (routeId) {
        await productService.update(routeId, payload);
        messageApi.success("Product updated successfully");
      } else {
        await productService.create(payload);
        messageApi.success("Product created successfully");
      }

      navigate("/Product/list");
    } catch (err) {
      console.error("Save error:", err);
      const resp = err?.response?.data;
      if (resp?.error && Array.isArray(resp.error)) {
        applyServerValidationToForm(resp.error);
        resp.error.forEach((e) => messageApi.error(e.message || JSON.stringify(e)));
      } else if (err?.message) {
        messageApi.error(err.message);
      } else {
        messageApi.error("Failed to save product");
      }
    } finally {
      setLoading(false);
    }
  };

  const optionValue = (cat) => {
    if (!cat) return "";
    return String(cat.uuid ?? cat._id ?? cat.id ?? "");
  };

  const StepIcon = ({ index, title }) => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: STEP_COLORS[index],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
        }}
      >
        {index + 1}
      </div>
      <div style={{ fontWeight: 700 }}>{title}</div>
    </div>
  );

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        // Step 1: Basic Info
        return (
          <Card title="Basic Information" bordered={false}>
            <Form.Item
              label="Product Name"
              name="product_name"
              rules={[{ required: true, message: "Please enter product name" }]}
            >
              <Input placeholder="e.g., A4 White Glossy Paper 80 GSM" size="large" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Category"
                  name="category_id"
                  rules={[{ required: true, message: "Please select category" }]}
                >
                  <Select
                    placeholder="Select category"
                    onChange={handleCategoryChange}
                    allowClear
                    showSearch
                    size="large"
                    optionFilterProp="children"
                  >
                    {categories.map((cat) => (
                      <Option key={optionValue(cat)} value={optionValue(cat)}>
                        {cat.category_name || cat.name || "Unnamed"}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item label="Subcategory" name="sub_category_id">
                  <Select
                    placeholder="Select subcategory (optional)"
                    allowClear
                    showSearch
                    size="large"
                    optionFilterProp="children"
                  >
                    {subcategories.map((sub) => (
                      <Option key={optionValue(sub)} value={optionValue(sub)}>
                        {sub.subcategory_name || sub.name || "Unnamed"}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={
                    <span>
                      Unit&nbsp;
                      <Tooltip title="e.g., kg, ream, sheet, roll, box, bundle">
                        <InfoCircleOutlined style={{ color: "#aaa" }} />
                      </Tooltip>
                    </span>
                  }
                  name="unit"
                >
                  <Input placeholder="e.g., kg, ream, sheet, roll" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={
                    <span>
                      Min. Stock Alert&nbsp;
                      <Tooltip title="Get alerted when stock falls below this quantity">
                        <InfoCircleOutlined style={{ color: "#aaa" }} />
                      </Tooltip>
                    </span>
                  }
                  name="min_stock"
                >
                  <InputNumber style={{ width: "100%" }} placeholder="10" min={0} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case 1:
        // Step 2: Paper Attributes
        return (
          <Card title="Paper Attributes" bordered={false}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label={
                    <span>
                      GSM&nbsp;
                      <Tooltip title="Grams per Square Meter — the weight/thickness of the paper">
                        <InfoCircleOutlined style={{ color: "#aaa" }} />
                      </Tooltip>
                    </span>
                  }
                  name="gsm"
                >
                  <Select placeholder="Select GSM" allowClear showSearch>
                    {[40, 50, 55, 60, 70, 75, 80, 90, 100, 110, 120, 130, 150, 160, 180, 200, 210, 230, 250, 270, 300, 350, 400].map(g => (
                      <Option key={g} value={g}>{g} GSM</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Paper Type" name="paper_type">
                  <Select placeholder="Select paper type" allowClear showSearch>
                    <Option value="Art Paper">Art Paper</Option>
                    <Option value="Art Board">Art Board</Option>
                    <Option value="Duplex Board">Duplex Board</Option>
                    <Option value="Kraft Paper">Kraft Paper</Option>
                    <Option value="Chromo Paper">Chromo Paper</Option>
                    <Option value="Maplitho Paper">Maplitho Paper</Option>
                    <Option value="Newsprint">Newsprint</Option>
                    <Option value="Poster Paper">Poster Paper</Option>
                    <Option value="Coated Paper">Coated Paper</Option>
                    <Option value="Uncoated Paper">Uncoated Paper</Option>
                    <Option value="Tracing Paper">Tracing Paper</Option>
                    <Option value="Bond Paper">Bond Paper</Option>
                    <Option value="Thermal Paper">Thermal Paper</Option>
                    <Option value="NCR Paper">NCR Paper</Option>
                    <Option value="Corrugated Board">Corrugated Board</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Finish" name="finish">
                  <Select placeholder="Select finish" allowClear>
                    <Option value="Glossy">Glossy</Option>
                    <Option value="Matte">Matte</Option>
                    <Option value="Semi-Gloss">Semi-Gloss</Option>
                    <Option value="Uncoated">Uncoated</Option>
                    <Option value="UV Coated">UV Coated</Option>
                    <Option value="Laminated">Laminated</Option>
                    <Option value="Satin">Satin</Option>
                    <Option value="Silk">Silk</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Sheet Size" name="size">
                  <Select placeholder="Select size" allowClear showSearch>
                    <Option value="A4 (210x297mm)">A4 (210×297 mm)</Option>
                    <Option value="A3 (297x420mm)">A3 (297×420 mm)</Option>
                    <Option value="A2 (420x594mm)">A2 (420×594 mm)</Option>
                    <Option value="A1 (594x841mm)">A1 (594×841 mm)</Option>
                    <Option value="Legal (216x356mm)">Legal (216×356 mm)</Option>
                    <Option value="Letter (216x279mm)">Letter (216×279 mm)</Option>
                    <Option value="20x30 inch">20×30 inch</Option>
                    <Option value="23x36 inch">23×36 inch</Option>
                    <Option value="25x36 inch">25×36 inch</Option>
                    <Option value="30x40 inch">30×40 inch</Option>
                    <Option value="Roll">Roll (specify in description)</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Color" name="color">
                  <Select placeholder="Select color" allowClear>
                    <Option value="White">White</Option>
                    <Option value="Natural White">Natural White</Option>
                    <Option value="Cream">Cream</Option>
                    <Option value="Ivory">Ivory</Option>
                    <Option value="Yellow">Yellow</Option>
                    <Option value="Pink">Pink</Option>
                    <Option value="Blue">Blue</Option>
                    <Option value="Green">Green</Option>
                    <Option value="Red">Red</Option>
                    <Option value="Orange">Orange</Option>
                    <Option value="Grey">Grey</Option>
                    <Option value="Brown (Kraft)">Brown (Kraft)</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label={
                    <span>
                      Grain Direction&nbsp;
                      <Tooltip title="Long grain runs parallel to the long side; short grain runs parallel to the short side">
                        <InfoCircleOutlined style={{ color: "#aaa" }} />
                      </Tooltip>
                    </span>
                  }
                  name="grain_direction"
                >
                  <Select placeholder="Select grain direction" allowClear>
                    <Option value="Long Grain">Long Grain (LG)</Option>
                    <Option value="Short Grain">Short Grain (SG)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={
                    <span>
                      Opacity (%)&nbsp;
                      <Tooltip title="Higher opacity means less show-through from the other side (0–100)">
                        <InfoCircleOutlined style={{ color: "#aaa" }} />
                      </Tooltip>
                    </span>
                  }
                  name="opacity"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="e.g., 90"
                    min={0}
                    max={100}
                    precision={1}
                    suffix="%"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  label={
                    <span>
                      Brightness&nbsp;
                      <Tooltip title="Paper brightness measured on a scale of 0–100 (ISO standard)">
                        <InfoCircleOutlined style={{ color: "#aaa" }} />
                      </Tooltip>
                    </span>
                  }
                  name="brightness"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="e.g., 92"
                    min={0}
                    max={100}
                    precision={1}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case 2:
        // Step 3: Pricing
        return (
          <Card title="Pricing Information" bordered={false}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Purchase Price"
                  name="purchase_price"
                  rules={[{ required: true, message: "Please enter purchase price" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="0.00"
                    min={0}
                    precision={2}
                    prefix="₹"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Selling Price"
                  name="selling_price"
                  rules={[{ required: true, message: "Please enter selling price" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="0.00"
                    min={0}
                    precision={2}
                    prefix="₹"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="MRP" name="mrp">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="0.00"
                    min={0}
                    precision={2}
                    prefix="₹"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Discount %" name="discount_percentage">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="0"
                    min={0}
                    max={100}
                    precision={2}
                    suffix="%"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  label={
                    <span>
                      GST %&nbsp;
                      <Tooltip title="Paper GST is usually 12% or 18%">
                        <InfoCircleOutlined style={{ color: "#aaa" }} />
                      </Tooltip>
                    </span>
                  }
                  name="tax_percentage"
                >
                  <Select placeholder="Select GST rate" allowClear>
                    <Option value={0}>0% (Exempt)</Option>
                    <Option value={5}>5%</Option>
                    <Option value={12}>12%</Option>
                    <Option value={18}>18%</Option>
                    <Option value={28}>28%</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={
                    <span>
                      HSN Code&nbsp;
                      <Tooltip title="e.g., 4802 for uncoated paper, 4810 for coated paper">
                        <InfoCircleOutlined style={{ color: "#aaa" }} />
                      </Tooltip>
                    </span>
                  }
                  name="hsn_code"
                >
                  <Input placeholder="e.g., 4802, 4810" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8}>
                <Form.Item label="Barcode" name="barcode">
                  <Input placeholder="Enter barcode" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8}>
                <Form.Item label="SKU" name="sku">
                  <Input placeholder="Enter SKU" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Image URL" name="image_url">
              <Input placeholder="Enter image URL (optional)" />
            </Form.Item>
          </Card>
        );

      case 3:
        // Step 4: Additional Details
        return (
          <Card title="Additional Details" bordered={false}>
            <Form.Item label="Description" name="description">
              <TextArea rows={4} placeholder="Enter product description, specifications, or any additional notes" />
            </Form.Item>

            <Form.Item label="Status" name="status">
              <Select>
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
                <Option value="out_of_stock">Out of Stock</Option>
              </Select>
            </Form.Item>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: 12, background: "#f0f2f5", minHeight: "100vh" }}>
      {contextHolder}
      <Spin spinning={loading}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Card>
            <Row gutter={24}>
              <Col xs={24} md={6}>
                <Steps direction={screens.md ? "vertical" : "horizontal"} current={current} onChange={(idx) => setCurrent(idx)} className="mb-6 md:mb-0">
                  <Step title={<StepIcon index={0} title="Basic" />} description={screens.md ? "Product info" : ""} />
                  <Step title={<StepIcon index={1} title="Paper Specs" />} description={screens.md ? "GSM, Type, Finish" : ""} />
                  <Step title={<StepIcon index={2} title="Pricing" />} description={screens.md ? "Price & codes" : ""} />
                  <Step title={<StepIcon index={3} title="Details" />} description={screens.md ? "Description" : ""} />
                </Steps>
              </Col>

              <Col xs={24} md={18}>
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ margin: 0 }}>{routeId ? "Edit Product" : "Add Product"}</h2>
                  <div style={{ color: "#666", fontSize: 13 }}>
                    Step {current + 1} of {STEP_COLORS.length}
                  </div>
                </div>

                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{
                    status: "active",
                    purchase_price: 0,
                    selling_price: 0,
                    discount_percentage: 0,
                    tax_percentage: 12,
                    unit: "kg",
                    min_stock: 10,
                  }}
                >
                  {renderStepContent(current)}
                </Form>

                <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    {current > 0 && (
                      <Button icon={<LeftOutlined />} onClick={prev}>
                        Back
                      </Button>
                    )}
                  </div>

                  <div>
                    {current < STEP_COLORS.length - 1 && (
                      <Button type="primary" onClick={next} icon={<RightOutlined />}>
                        Next
                      </Button>
                    )}

                    {current === STEP_COLORS.length - 1 && (
                      <Button
                        type="primary"
                        onClick={handleSubmit}
                        icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
                        loading={loading}
                      >
                        {routeId ? "Update Product" : "Create Product"}
                      </Button>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </Spin>
    </div>
  );
};

export default ProductForm;
