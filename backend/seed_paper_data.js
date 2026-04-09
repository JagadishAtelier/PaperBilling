import dotenv from 'dotenv';
import { sequelize } from './src/db/index.js';
import Category from './src/product/models/category.model.js';
import Subcategory from './src/product/models/subcategory.models.js';
import Product from './src/product/models/product.model.js';
import RawMaterial from './src/rawmaterial/models/rawmaterial.model.js';

dotenv.config();

const seedData = async () => {
    try {
        console.log('--- Starting Paper Manufacturing Data Seed ---');
        
        // 1. Categories
        const categories = [
            { name: 'Packaging Paper', desc: 'Corrugated boards, Kraft papers, and industrial wrap' },
            { name: 'Specialty Paper', desc: 'Art paper, Coated boards, and Texture paper' },
            { name: 'Writing & Printing', desc: 'Office paper, Bond paper, and Maplitho' },
            { name: 'Tissue & Hygiene', desc: 'Soft tissue, Towels, and Napkin stock' }
        ];

        const createdCategories = {};
        for (const cat of categories) {
            const [record] = await Category.findOrCreate({
                where: { category_name: cat.name },
                defaults: { description: cat.desc }
            });
            createdCategories[cat.name] = record;
            console.log(`- Category: ${cat.name}`);
        }

        // 2. Subcategories
        const subcategories = [
            { name: 'Kraft Paper', parent: 'Packaging Paper' },
            { name: 'Duplex Board', parent: 'Packaging Paper' },
            { name: 'Art Board', parent: 'Specialty Paper' },
            { name: 'Chromo Paper', parent: 'Specialty Paper' },
            { name: 'Photocopy Paper', parent: 'Writing & Printing' },
            { name: 'Bond Paper', parent: 'Writing & Printing' }
        ];

        const createdSubcategories = {};
        for (const sub of subcategories) {
            const parentId = createdCategories[sub.parent]?.id;
            if (parentId) {
                const [record] = await Subcategory.findOrCreate({
                    where: { subcategory_name: sub.name, category_id: parentId },
                    defaults: { description: `${sub.name} under ${sub.parent}` }
                });
                createdSubcategories[sub.name] = record;
                console.log(`- Subcategory: ${sub.name} (${sub.parent})`);
            }
        }

        // 3. Products (Paper Specific)
        const products = [
            {
                name: 'High Strength Kraft Roll 120 GSM',
                code: 'KFT-120-001',
                category: 'Packaging Paper',
                subcategory: 'Kraft Paper',
                gsm: 120.0,
                paper_type: 'Kraft Paper',
                finish: 'Uncoated',
                size: 'Roll (42 inch)',
                color: 'Brown',
                pp: 45.0,
                sp: 58.0,
                tax: 12,
                unit: 'kg',
                hsn: '4804'
            },
            {
                name: 'Art Board Glossy 250 GSM',
                code: 'ART-250-002',
                category: 'Specialty Paper',
                subcategory: 'Art Board',
                gsm: 250.0,
                paper_type: 'Art Board',
                finish: 'Glossy',
                size: '23x36 inch',
                color: 'White',
                pp: 85.0,
                sp: 110.0,
                tax: 12,
                unit: 'sheet',
                hsn: '4810'
            },
            {
                name: 'Super White Bond 80 GSM A4',
                code: 'BND-80-003',
                category: 'Writing & Printing',
                subcategory: 'Bond Paper',
                gsm: 80.0,
                paper_type: 'Bond Paper',
                finish: 'Matte',
                size: 'A4 (210x297mm)',
                color: 'Ultra White',
                pp: 450.0, // per ream
                sp: 580.0,
                tax: 12,
                unit: 'ream',
                hsn: '4802',
                brightness: 95.0
            },
            {
                name: 'Grey Back Duplex 300 GSM',
                code: 'DPX-300-004',
                category: 'Packaging Paper',
                subcategory: 'Duplex Board',
                gsm: 300.0,
                paper_type: 'Duplex Board',
                finish: 'Coated',
                size: '30x40 inch',
                color: 'Grey Back',
                pp: 38.0,
                sp: 48.0,
                tax: 12,
                unit: 'kg',
                hsn: '4810'
            }
        ];

        for (const p of products) {
            await Product.findOrCreate({
                where: { product_code: p.code },
                defaults: {
                    product_name: p.name,
                    category_id: createdCategories[p.category]?.id,
                    sub_category_id: createdSubcategories[p.subcategory]?.id,
                    gsm: p.gsm,
                    paper_type: p.paper_type,
                    finish: p.finish,
                    size: p.size,
                    color: p.color,
                    unit: p.unit,
                    purchase_price: p.pp,
                    selling_price: p.sp,
                    mrp: p.sp * 1.2,
                    tax_percentage: p.tax,
                    hsn_code: p.hsn,
                    brightness: p.brightness || null,
                    opacity: 90.0,
                    status: 'active'
                }
            });
            console.log(`- Product: ${p.name}`);
        }

        // 4. Raw Materials
        const rawMaterials = [
            { name: 'Bleached Wood Pulp', code: 'RM-PLP-001', cat: 'Fibre', unit: 'metric_ton', price: 65000.0 },
            { name: 'Recycled Waste Paper (Grade A)', code: 'RM-WST-001', cat: 'Fibre', unit: 'metric_ton', price: 18000.0 },
            { name: 'Caustic Soda (Lye)', code: 'RM-CHM-001', cat: 'Chemicals', unit: 'kg', price: 45.0 },
            { name: 'PCC (Precipitated Calcium Carbonate)', code: 'RM-FIL-001', cat: 'Filler', unit: 'kg', price: 12.0 },
            { name: 'Optical Brightening Agent (OBA)', code: 'RM-ADD-001', cat: 'Additives', unit: 'litre', price: 320.0 }
        ];

        for (const rm of rawMaterials) {
            await RawMaterial.findOrCreate({
                where: { material_code: rm.code },
                defaults: {
                    material_name: rm.name,
                    category: rm.cat,
                    unit: rm.unit,
                    purchase_price: rm.price,
                    min_stock: 100.0,
                    status: 'active'
                }
            });
            console.log(`- Raw Material: ${rm.name}`);
        }

        console.log('--- Seed Completed Successfully ---');
    } catch (error) {
        console.error('!!! Seed Failed:', error);
    } finally {
        await sequelize.close();
        process.exit();
    }
};

seedData();
