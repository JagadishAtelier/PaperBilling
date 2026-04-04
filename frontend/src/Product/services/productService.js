import api from "../../api/api";

const productService = {
  getAll: (params = {}) => api.get("/product/product", { params }),
  getById: (id) => api.get(`/product/product/${id}`),
  getByCode: (code) => api.get(`/product/product/code/${code}`),
  create: (data) => api.post("/product/product", data),
  update: (id, data) => api.put(`/product/product/${id}`, data),
  remove: (id) => api.delete(`/product/product/${id}`),
  bulkUpload: (data) => api.post("/product/product/bulk-upload", data),

  // BOM
  getBOM: (productId) => api.get(`/product/product/${productId}/bom`),
  saveBOM: (productId, data) => api.post(`/product/product/${productId}/bom`, data),
  deleteBOMItem: (bomId) => api.delete(`/product/product/bom/${bomId}`),
};

export default productService;
