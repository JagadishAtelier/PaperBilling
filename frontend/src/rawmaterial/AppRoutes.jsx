import { Routes, Route } from "react-router-dom";
import RawMaterialList from "./pages/RawMaterialList";
import RawMaterialForm from "./pages/RawMaterialForm";
import RawMaterialInwardList from "./pages/RawMaterialInwardList";
import RawMaterialInwardForm from "./pages/RawMaterialInwardForm";
import RawMaterialStock from "./pages/RawMaterialStock";
import RawMaterialBulkUpload from "./pages/RawMaterialBulkUpload";
import { List, PlusCircle, PackageOpen, PackagePlus, BarChart2, Upload } from "lucide-react";

export const rawmaterialMenuItems = [
  { key: "/rawmaterial/list", label: "Raw Materials", icon: <List size={18} /> },
  { key: "/rawmaterial/bulk-upload", label: "Bulk Upload", icon: <Upload size={18} /> },
  { key: "/rawmaterial/stock", label: "Stock", icon: <BarChart2 size={18} /> },
  { key: "/rawmaterial/inward/list", label: "Inward List", icon: <PackageOpen size={18} /> },
];

const RawMaterialRoutes = () => (
  <Routes>
    <Route path="list" element={<RawMaterialList />} />
    <Route path="add" element={<RawMaterialForm />} />
    <Route path="edit/:id" element={<RawMaterialForm />} />
    <Route path="bulk-upload" element={<RawMaterialBulkUpload />} />
    <Route path="stock" element={<RawMaterialStock />} />
    <Route path="inward/list" element={<RawMaterialInwardList />} />
    <Route path="inward/add" element={<RawMaterialInwardForm />} />
    <Route path="inward/view/:id" element={<RawMaterialInwardForm />} />
  </Routes>
);

export default RawMaterialRoutes;
