import RawMaterial from './rawmaterial.model.js';
import RawMaterialInward from './rawmaterialinward.model.js';
import RawMaterialInwardItem from './rawmaterialinwarditem.model.js';
import RawMaterialStock from './rawmaterialstock.model.js';
import Branch from '../../user/models/branch.model.js';

RawMaterialInward.belongsTo(Branch, { foreignKey: "branch_id", as: "branch" });
Branch.hasMany(RawMaterialInward, { foreignKey: "branch_id", as: "rawMaterialInwards" });

RawMaterialStock.belongsTo(Branch, { foreignKey: "branch_id", as: "branch" });

export { RawMaterial, RawMaterialInward, RawMaterialInwardItem, RawMaterialStock, Branch };
