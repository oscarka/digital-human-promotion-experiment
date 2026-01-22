// 产品推荐数据 - 从 Excel 自动生成
// 共 254 条产品数据

export type ProductCategory = '快速检测' | '推荐药品' | '商城保健品' | '保健品(方案)' | '其他产品';

export type DiseaseType = 
  | '呼吸道感染'
  | '消化系统疾病'
  | '妇科炎症'
  | '高血压及心血管问题'
  | '皮肤问题'
  | '其他';

export interface RealProduct {
  id: string;
  diseaseType: string;      // 疾病类型：常见病/慢性病
  disease: string;          // 高频疾病名称
  category: ProductCategory; // 推荐类别
  name: string;             // 产品名称
  content: string;          // 推荐产品内容（完整描述）
  matchRule: string;        // 详细匹配规则与决策依据
}

// 产品类别图标映射
export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  '快速检测': '🧪',
  '推荐药品': '💊',
  '商城保健品': '🌿',
  '保健品(方案)': '⚡',
  '其他产品': '✨'
};

// 产品类别颜色映射
export const CATEGORY_COLORS: Record<ProductCategory, { border: string; bg: string; text: string }> = {
  '快速检测': { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  '推荐药品': { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  '商城保健品': { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  '保健品(方案)': { border: 'border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  '其他产品': { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-400' }
};

// 疾病类型简化映射
export function simplifyDisease(disease: string): DiseaseType {
  if (disease.includes('呼吸道')) return '呼吸道感染';
  if (disease.includes('消化') || disease.includes('肠胃') || disease.includes('胃')) return '消化系统疾病';
  if (disease.includes('妇科') || disease.includes('女性')) return '妇科炎症';
  if (disease.includes('高血压') || disease.includes('心血管') || disease.includes('心脏')) return '高血压及心血管问题';
  if (disease.includes('皮肤') || disease.includes('湿疹') || disease.includes('过敏')) return '皮肤问题';
  return '其他';
}

// 从产品名称中提取简短名称
function extractProductName(content: string): string {
  // 处理多产品列表（取第一个）
  const firstProduct = content.split(/\n/)[0];
  
  // 匹配 【品牌】产品名 格式
  const brandMatch = firstProduct.match(/【([^】]+)】([^\n（(]+)/);
  if (brandMatch) return brandMatch[2].trim();
  
  // 匹配 产品名 (品牌: xxx) 格式
  const parenMatch = firstProduct.match(/^([^(（]+)/);
  if (parenMatch) return parenMatch[1].trim();
  
  return firstProduct.substring(0, 30).trim();
}

// 从产品内容中提取品牌列表
export function extractBrands(content: string): string[] {
  // 匹配 (品牌: ...) 格式
  const brandMatch = content.match(/\(品牌:\s*([^)]+)\)/);
  if (!brandMatch) return [];
  
  const brandText = brandMatch[1];
  // 按 | 分割多个品牌
  const brands = brandText.split('|').map(b => {
    // 提取 (品牌名) 格式中的品牌名
    const brandNameMatch = b.match(/\(([^)]+)\)/);
    if (brandNameMatch) {
      // 如果有斜杠，取第一个（如 "白云山/陈李济" -> "白云山"）
      return brandNameMatch[1].split('/')[0].trim();
    }
    // 如果没有括号，直接返回（去除前后空格）
    return b.trim();
  }).filter(b => b.length > 0);
  
  return brands;
}

// 产品数据列表
export const REAL_PRODUCTS: RealProduct[] = [
  {
    id: 'prod-001',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '快速检测' as ProductCategory,
    name: '菲佑宁',
    content: '菲佑宁',
    matchRule: '【临床价值】: 呼吸道感染初期（48小时内）使用。用于快速筛查流感/甲流病毒，辅助医生判断是否需使用奥司他韦等抗病毒药物，避免抗生素滥用。'
  },
  {
    id: 'prod-002',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '保健品(方案)' as ProductCategory,
    name: '高氢片',
    content: '高氢片',
    matchRule: '【应用场景】: 辅助抗炎。利用氢分子的选择性抗氧化作用，减轻呼吸道慢性炎症及氧化应激损伤，适合慢病康复期调理。'
  },
  {
    id: 'prod-003',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '其他产品' as ProductCategory,
    name: '外泌体',
    content: '外泌体',
    matchRule: '【前沿应用】: 细胞级修复。含有多种生长因子和信号分子，促进受损呼吸道黏膜修复，适合重症感冒后的肺部养护。'
  },
  {
    id: 'prod-004',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '商城保健品' as ProductCategory,
    name: '维生素C片',
    content: '1、【汤臣倍健】维生素C片（甜橙味）系列\n[标准]: 产品含有直接有助于增强免疫屏障（如维生素C、益生菌）或缓解呼吸道症状（如润喉、舒缓鼻部）的成分。\n[作用]: 维生素C是维持免疫系统正常功能的重要营养素。',
    matchRule: '【推荐逻辑】: 免疫支持。VC可促进淋巴细胞增殖，增强中性粒细胞的趋化性。适合感冒频发、压力大、蔬菜摄入不足人群。'
  },
  {
    id: 'prod-005',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '一清胶囊',
    content: '一清胶囊 (品牌: (康弘)一清胶囊)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-006',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '三金片',
    content: '三金片 (品牌: (三金)三金片)',
    matchRule: '【功效】: 清热解毒，利湿通淋，益肾。【适应症】: 用于下焦湿热所致的热淋、小便短赤、淋沥涩痛；急慢性肾盂肾炎、膀胱炎、尿路感染。'
  },
  {
    id: 'prod-007',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '三黄片',
    content: '三黄片 (品牌: (仁悦)三黄片 | (亚宝)三黄片)',
    matchRule: '【功效】: 清热解毒，泻火通便。【适应症】: 用于三焦热盛、目赤肿痛、口鼻生疮、咽喉肿痛、牙龈出血、心烦口渴、尿黄便秘。'
  },
  {
    id: 'prod-008',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '上清丸',
    content: '上清丸 (品牌: (白云山)上清丸 | (白云山/陈李济)上清丸)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-009',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '乙酰半胱氨酸片',
    content: '乙酰半胱氨酸片 (品牌: (富露施)乙酰半胱氨酸片)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-010',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '乙酰半胱氨酸颗粒',
    content: '乙酰半胱氨酸颗粒 (品牌: (富露施)乙酰半胱氨酸颗粒)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-011',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '二天油',
    content: '二天油 (品牌: (白云山星群)二天油)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-012',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '二陈丸',
    content: '二陈丸 (品牌: (同仁堂)二陈丸)',
    matchRule: '【功效】: 燥湿化痰，理气和胃。【适应症】: 用于咳嗽痰多、胸脘胀闷、恶心呕吐。中医化痰基础方。'
  },
  {
    id: 'prod-013',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '十五味龙胆花丸',
    content: '十五味龙胆花丸 (品牌: (卓玛丹)十五味龙胆花丸)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-014',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '午时茶颗粒',
    content: '午时茶颗粒 (品牌: 午时茶颗粒)',
    matchRule: '【功效】: 解表和中。【适应症】: 用于外感风寒、内伤食积证，症见恶寒发热、头痛身楚、胸脘满闷、恶心呕吐、腹痛泄泻。'
  },
  {
    id: 'prod-015',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '双料喉风散',
    content: '双料喉风散 (品牌: (嘉应)双料喉风散)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-016',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '双黄连口服液',
    content: '双黄连口服液 (品牌: (君泰)双黄连口服液 | (三精)双黄连口服液 | (太龙)双黄连口服液)',
    matchRule: '【功效】: 疏风解表，清热解毒。【适应症】: 用于外感风热所致的感冒，症见发热、咳嗽、咽痛。针对病毒性呼吸道感染。'
  },
  {
    id: 'prod-017',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '口炎清颗粒',
    content: '口炎清颗粒 (品牌: (白云山/大神)口炎清颗粒)',
    matchRule: '【功效】: 滋阴清热，解毒消肿。【适应症】: 用于阴虚火旺所致的口腔炎症。针对反复发作的口腔溃疡。'
  },
  {
    id: 'prod-018',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '咳喘顺丸',
    content: '咳喘顺丸 (品牌: 咳喘顺丸)',
    matchRule: '针对110303:哮喘。请参考说明书适应症。'
  },
  {
    id: 'prod-019',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '咳特灵片',
    content: '咳特灵片 (品牌: (罗浮山国药)咳特灵片)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-020',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '咳特灵胶囊',
    content: '咳特灵胶囊 (品牌: (诺金)咳特灵胶囊 | (一片天)咳特灵胶囊 | (白云山)咳特灵胶囊)',
    matchRule: '针对110303:哮喘。请参考说明书适应症。'
  },
  {
    id: 'prod-021',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '喉舒宁片',
    content: '喉舒宁片 (品牌: (中国药材)喉舒宁片)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-022',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '地榆槐角丸',
    content: '地榆槐角丸 (品牌: (同仁堂)地榆槐角丸)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-023',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方仙鹤草肠炎胶囊',
    content: '复方仙鹤草肠炎胶囊 (品牌: (慈元金碧)复方仙鹤草肠炎胶囊)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-024',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方板蓝根颗粒',
    content: '复方板蓝根颗粒 (品牌: (白云山)复方板蓝根颗粒 | (蜀中/依科)复方板蓝根颗粒)',
    matchRule: '【功效】: 清热解毒，凉血。【适应症】: 用于风热感冒、咽喉肿痛。比普通板蓝根增加了大青叶，药力更强。'
  },
  {
    id: 'prod-025',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方氨酚烷胺片',
    content: '复方氨酚烷胺片 (品牌: (感康)复方氨酚烷胺片)',
    matchRule: '针对110104:普通感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-026',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方氨酚烷胺胶囊',
    content: '复方氨酚烷胺胶囊 (品牌: (快克)复方氨酚烷胺胶囊)',
    matchRule: '【功效】: 抗感冒药。【适应症】: 缓解感冒引起的发热、头痛、鼻塞、咽痛等。含金刚烷胺，具有抗病毒作用。'
  },
  {
    id: 'prod-027',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方氨酚肾素片',
    content: '复方氨酚肾素片 (品牌: (幸福/科达琳)复方氨酚肾素片)',
    matchRule: '针对110104:普通感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-028',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方氨酚那敏颗粒',
    content: '复方氨酚那敏颗粒 (品牌: (万岁)复方氨酚那敏颗粒)',
    matchRule: '针对110104:普通感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-029',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方穿心莲片',
    content: '复方穿心莲片 (品牌: (罗浮山)复方穿心莲片 | 复方穿心莲片)',
    matchRule: '【功效】: 清热解毒，利湿。【适应症】: 用于喉痹、痄腮、湿热泄泻等。针对上呼吸道感染和肠道湿热。'
  },
  {
    id: 'prod-030',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方薄荷脑鼻用吸入剂',
    content: '复方薄荷脑鼻用吸入剂 (品牌: (曼秀雷敦)复方薄荷脑鼻用吸入剂)',
    matchRule: '针对110104:普通感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-031',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方金银花颗粒',
    content: '复方金银花颗粒 (品牌: (诺金)复方金银花颗粒 | (国金)复方金银花颗粒)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-032',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方鱼腥草合剂',
    content: '复方鱼腥草合剂 (品牌: 复方鱼腥草合剂)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-033',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方鱼腥草片',
    content: '复方鱼腥草片 (品牌: (南海)复方鱼腥草片)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-034',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方鲜竹沥液',
    content: '复方鲜竹沥液 (品牌: (天施康)复方鲜竹沥液)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-035',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '复方黄芩片',
    content: '复方黄芩片 (品牌: 复方黄芩片)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-036',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '夏桑菊颗粒',
    content: '夏桑菊颗粒 (品牌: (白云山星群)夏桑菊颗粒 | 夏桑菊颗粒)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-037',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '姜枣祛寒颗粒',
    content: '姜枣祛寒颗粒 (品牌: (侨星)姜枣祛寒颗粒)',
    matchRule: '针对110103:风寒感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-038',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '对乙酰氨基酚缓释片',
    content: '对乙酰氨基酚缓释片 (品牌: (倍乐信)对乙酰氨基酚缓释片)',
    matchRule: '针对110105:流行性感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-039',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '小柴胡颗粒',
    content: '小柴胡颗粒 (品牌: (白云山)小柴胡颗粒 | (999)小柴胡颗粒)',
    matchRule: '针对110101:预防感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-040',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '小青龙颗粒',
    content: '小青龙颗粒 (品牌: (全泰)小青龙颗粒)',
    matchRule: '针对110103:风寒感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-041',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '川贝枇杷糖浆',
    content: '川贝枇杷糖浆 (品牌: (三清山)川贝枇杷糖浆)',
    matchRule: '【功效】: 止咳祛痰。【适应症】: 用于风热咳嗽、痰多、气喘、咽喉干痒。川贝润肺，枇杷叶化痰。'
  },
  {
    id: 'prod-042',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '川贝清肺糖浆',
    content: '川贝清肺糖浆 (品牌: (安药)川贝清肺糖浆)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-043',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '布洛芬缓释胶囊',
    content: '布洛芬缓释胶囊 (品牌: (芬必得)布洛芬缓释胶囊 | (今来芬布得)布洛芬缓释胶囊)',
    matchRule: '【功效】: 非甾体抗炎药（解热镇痛）。【适应症】: 缓解轻至中度疼痛（头痛、关节痛、牙痛、痛经等），也用于感冒引起的发热。缓释剂型药效更持久。'
  },
  {
    id: 'prod-044',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '广东凉茶颗粒',
    content: '广东凉茶颗粒 (品牌: (观鹤)广东凉茶颗粒 | (王老吉)广东凉茶颗粒)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-045',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '强力枇杷露',
    content: '强力枇杷露 (品牌: (神奇)强力枇杷露 | (999)强力枇杷露)',
    matchRule: '【功效】: 养阴敛肺，止咳祛痰。【适应症】: 用于久咳劳嗽、支气管炎等。针对干咳、久咳不愈。'
  },
  {
    id: 'prod-046',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '恒制咳喘胶囊',
    content: '恒制咳喘胶囊 (品牌: (盈医生)恒制咳喘胶囊 | 恒制咳喘胶囊)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-047',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '感冒止咳颗粒',
    content: '感冒止咳颗粒 (品牌: (恒诚制药)感冒止咳颗粒)',
    matchRule: '针对110105:流行性感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-048',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '感冒清热颗粒',
    content: '感冒清热颗粒 (品牌: (万岁)感冒清热颗粒 | (白云山)感冒清热颗粒)',
    matchRule: '【功效】: 疏风散寒，解表清热。【适应症】: 用于风寒感冒，头痛发热，恶寒身痛，鼻流清涕，咳嗽咽干。感冒初期的常用药。'
  },
  {
    id: 'prod-049',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '感冒灵颗粒',
    content: '感冒灵颗粒 (品牌: (新峰)感冒灵颗粒 | (济民)感冒灵颗粒 | (白云山)感冒灵颗粒 | (999)感冒灵颗粒)',
    matchRule: '【功效】: 解热镇痛。【适应症】: 用于感冒引起的头痛、发热、鼻塞、流涕、咽痛。中西药复方制剂（如999感冒灵）。'
  },
  {
    id: 'prod-050',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '感冒软胶囊',
    content: '感冒软胶囊 (品牌: (博祥)感冒软胶囊)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-051',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '抗病毒口服液',
    content: '抗病毒口服液 (品牌: 抗病毒口服液 | (香雪)抗病毒口服液 | (远大飞云)抗病毒口服液)',
    matchRule: '【功效】: 清热祛湿，凉血解毒。【适应症】: 用于风热感冒、流感。针对病毒感染引起的发热、咽痛等。'
  },
  {
    id: 'prod-052',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '板蓝根颗粒',
    content: '板蓝根颗粒 (品牌: (999)板蓝根颗粒 | (白云山)板蓝根颗粒)',
    matchRule: '【功效】: 清热解毒，凉血利咽。【适应症】: 用于肺胃热盛所致的咽喉肿痛、口咽干燥；腮腺炎。常用于感冒初期的清热预防。'
  },
  {
    id: 'prod-053',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '枇杷止咳胶囊',
    content: '枇杷止咳胶囊 (品牌: (神奇)枇杷止咳胶囊)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-054',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '栀子金花丸',
    content: '栀子金花丸 (品牌: (同仁堂)栀子金花丸 | 栀子金花丸)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-055',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '桂龙咳喘宁片',
    content: '桂龙咳喘宁片 (品牌: (美福临)桂龙咳喘宁片)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-056',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '桑菊感冒片',
    content: '桑菊感冒片 (品牌: (同仁堂)桑菊感冒片)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-057',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '桔贝合剂',
    content: '桔贝合剂 (品牌: (可迅停)桔贝合剂)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-058',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '椰露止咳合剂',
    content: '椰露止咳合剂 (品牌: (海底)椰露止咳合剂)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-059',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '橘红丸',
    content: '橘红丸 (品牌: 橘红丸)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-060',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '气管炎丸',
    content: '气管炎丸 (品牌: (同仁堂)气管炎丸)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-061',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '氨咖黄敏胶囊',
    content: '氨咖黄敏胶囊 (品牌: (白云山/禾穗速校)氨咖黄敏胶囊)',
    matchRule: '【功效】: 解热镇痛、抗过敏。【适应症】: 缓解普通感冒及流行性感冒引起的发热、头痛、四肢酸痛、流鼻涕、鼻塞、咽痛。俗称“速效感冒胶囊”。'
  },
  {
    id: 'prod-062',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '氨酚咖那敏片',
    content: '氨酚咖那敏片 (品牌: (新康泰克)氨酚咖那敏片)',
    matchRule: '【功效】: 复方感冒药。【适应症】: 缓解感冒引起的鼻塞、流涕、打喷嚏、发热、头痛、咽痛等。含咖啡因可减轻抗组胺药引起的嗜睡感。'
  },
  {
    id: 'prod-063',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '清开灵口服液',
    content: '清开灵口服液 (品牌: 清开灵口服液)',
    matchRule: '【功效】: 清热解毒，镇静安神。【适应症】: 用于外感风热时毒、火毒内盛所致的高热不退、烦躁不安、咽喉肿痛；上呼吸道感染、病毒性感冒。'
  },
  {
    id: 'prod-064',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '清开灵胶囊',
    content: '清开灵胶囊 (品牌: (白云山/明兴)清开灵胶囊)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-065',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '清火栀麦片',
    content: '清火栀麦片 (品牌: (冰叶)清火栀麦片)',
    matchRule: '【功效】: 清热解毒，凉血消肿。【适应症】: 用于肺胃热盛所致的咽喉肿痛、发热、口渴、目赤。针对轻度上火。'
  },
  {
    id: 'prod-066',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '清火片',
    content: '清火片 (品牌: (冰叶)清火片)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-067',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '清热消炎宁胶囊',
    content: '清热消炎宁胶囊 (品牌: (白云山/敬修堂)清热消炎宁胶囊)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-068',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '清热祛湿颗粒',
    content: '清热祛湿颗粒 (品牌: (众生)清热祛湿颗粒)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-069',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '清肺抑火片',
    content: '清肺抑火片 (品牌: (镇南王)清肺抑火片)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-070',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '牛黄上清丸',
    content: '牛黄上清丸 (品牌: (同仁堂)牛黄上清丸)',
    matchRule: '【功效】: 清热泻火，散风止痛。【适应症】: 用于热毒内盛、风火上攻所致的头痛眩晕、目赤耳鸣、咽喉肿痛、口舌生疮、牙龈肿痛、大便燥结。'
  },
  {
    id: 'prod-071',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '玄麦甘桔颗粒',
    content: '玄麦甘桔颗粒 (品牌: (蜀中/依科)玄麦甘桔颗粒)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-072',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '珍珠层粉',
    content: '珍珠层粉 (品牌: (澳珍)珍珠层粉)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-073',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '甘桔冰梅片',
    content: '甘桔冰梅片 (品牌: (华森)甘桔冰梅片)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-074',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '甘草片',
    content: '甘草片 (品牌: (常济堂)甘草片)',
    matchRule: '针对130210:清热解毒、降火。请参考说明书适应症。'
  },
  {
    id: 'prod-075',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '盐酸氨溴索口服溶液',
    content: '盐酸氨溴索口服溶液 (品牌: (坦静)盐酸氨溴索口服溶液 | (双倡)盐酸氨溴索口服溶液 | (润/易坦静berry)盐酸氨溴索口服溶液 | (汉立瑞)盐酸氨溴索口服溶液)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-076',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '盐酸氨溴索片',
    content: '盐酸氨溴索片 (品牌: (润津)盐酸氨溴索片)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-077',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '石岐外感茶',
    content: '石岐外感茶 (品牌: (六棉牌)石岐外感茶)',
    matchRule: '针对110101:预防感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-078',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '穿心莲片',
    content: '穿心莲片 (品牌: (白云山)穿心莲片)',
    matchRule: '【功效】: 清热解毒，凉血消肿。【适应症】: 用于邪毒内盛、感冒发热、咽喉肿痛、口舌生疮。天然抗生素类中成药。'
  },
  {
    id: 'prod-079',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '维C银翘片',
    content: '维C银翘片 (品牌: (德众)维C银翘片)',
    matchRule: '【功效】: 疏风解表，清热解毒。【适应症】: 用于外感风热所致的感冒，症见发热、头痛、咳嗽、咽喉肿痛。含VC和西药成分。'
  },
  {
    id: 'prod-080',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '羚羊感冒片',
    content: '羚羊感冒片 (品牌: (德众)羚羊感冒片)',
    matchRule: '针对110105:流行性感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-081',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '羧甲司坦片',
    content: '羧甲司坦片 (品牌: (南国)羧甲司坦片)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-082',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '荆防颗粒',
    content: '荆防颗粒 (品牌: (九寨沟)荆防颗粒)',
    matchRule: '【功效】: 解表散寒，祛风止痛。【适应症】: 用于风寒感冒，头痛身痛，恶寒无汗，鼻塞清涕。被誉为“四时感冒之神剂”。'
  },
  {
    id: 'prod-083',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '菊花',
    content: '菊花 (品牌: (常济堂)菊花)',
    matchRule: '针对130306:清热降火花草茶。请参考说明书适应症。'
  },
  {
    id: 'prod-084',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '蒲公英颗粒',
    content: '蒲公英颗粒 (品牌: (心诚)蒲公英颗粒)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-085',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '蒲地蓝消炎片',
    content: '蒲地蓝消炎片 (品牌: (蓝素)蒲地蓝消炎片)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-086',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '藿香正气口服液',
    content: '藿香正气口服液 (品牌: (太极)藿香正气口服液)',
    matchRule: '针对110103:风寒感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-087',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '藿香正气水',
    content: '藿香正气水 (品牌: (蜀中/依科)藿香正气水)',
    matchRule: '【功效】: 解表化湿，理气和中。【适应症】: 用于外感风寒、内伤湿滞或夏伤暑湿所致的感冒，症见头痛昏重、胸膈痞闷、脘腹胀痛、呕吐泄泻。'
  },
  {
    id: 'prod-088',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '蛇胆川贝液',
    content: '蛇胆川贝液 (品牌: (金太子)蛇胆川贝液 | 蛇胆川贝液 | (横峰)蛇胆川贝液)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-089',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '蛇胆陈皮散',
    content: '蛇胆陈皮散 (品牌: 蛇胆陈皮散)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-090',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '蛤蚧定喘丸',
    content: '蛤蚧定喘丸 (品牌: (普林松)蛤蚧定喘丸)',
    matchRule: '针对110303:哮喘。请参考说明书适应症。'
  },
  {
    id: 'prod-091',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '补肺丸',
    content: '补肺丸 (品牌: (养无极)补肺丸)',
    matchRule: '【功效】: 补肺益气，止咳平喘。【适应症】: 用于肺气不足、气短喘咳、咳声低弱、干咳少痰。适合慢性支气管炎、肺气肿等肺部调理。'
  },
  {
    id: 'prod-092',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '连翘败毒丸',
    content: '连翘败毒丸 (品牌: (同仁堂)连翘败毒丸)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-093',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '连花清瘟胶囊',
    content: '连花清瘟胶囊 (品牌: (连花)连花清瘟胶囊)',
    matchRule: '针对110105:流行性感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-094',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '通宣理肺丸',
    content: '通宣理肺丸 (品牌: (冯了性)通宣理肺丸)',
    matchRule: '【功效】: 解表散寒，宣肺止咳。【适应症】: 用于风寒束肺所致的咳嗽、咯痰不畅、发热恶寒、鼻塞流涕。针对“寒咳”。'
  },
  {
    id: 'prod-095',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '金喉健喷雾剂',
    content: '金喉健喷雾剂 (品牌: 金喉健喷雾剂)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-096',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '金振口服液',
    content: '金振口服液 (品牌: (康缘)金振口服液)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-097',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '金莲花颗粒',
    content: '金莲花颗粒 (品牌: (坝上)金莲花颗粒)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-098',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '银翘解毒丸',
    content: '银翘解毒丸 (品牌: (冯了性)银翘解毒丸)',
    matchRule: '【功效】: 疏风解表，清热解毒。【适应症】: 用于风热感冒，症见发热头痛、咳嗽口干、咽喉疼痛。中医治风热感冒代表方。'
  },
  {
    id: 'prod-099',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '银翘解毒颗粒',
    content: '银翘解毒颗粒 (品牌: (六棉牌)银翘解毒颗粒)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-100',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '银胡感冒散',
    content: '银胡感冒散 (品牌: (源安堂)银胡感冒散)',
    matchRule: '针对110102:风热感冒。请参考说明书适应症。'
  },
  {
    id: 'prod-101',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '防风通圣丸',
    content: '防风通圣丸 (品牌: (同仁堂)防风通圣丸 | (白云山中一)防风通圣丸)',
    matchRule: '【功效】: 解表通里，清热解毒。【适应症】: 用于外寒内热、表里俱实、恶寒壮热、头痛咽干、小便短赤、大便秘结。针对“表里双解”。'
  },
  {
    id: 'prod-102',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '阿咖酚散',
    content: '阿咖酚散 (品牌: (何济公)阿咖酚散)',
    matchRule: '【功效】: 解热镇痛。【适应症】: 用于普通感冒或流行性感冒引起的发热，也用于缓解轻至中度疼痛（如头痛、关节痛、牙痛、肌肉痛、神经痛、痛经）。'
  },
  {
    id: 'prod-103',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '雪梨膏',
    content: '雪梨膏 (品牌: (纽兰)雪梨膏 | (金桃)雪梨膏)',
    matchRule: '针对110301:咳嗽。请参考说明书适应症。'
  },
  {
    id: 'prod-104',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '风寒感冒颗粒',
    content: '风寒感冒颗粒 (品牌: (恒诚制药)风寒感冒颗粒)',
    matchRule: '【功效】: 解表散寒，宣肺止咳。【适应症】: 用于风寒感冒，症见恶寒重、发热轻、无汗、头痛、鼻塞、流清涕、咳嗽、痰白稀。'
  },
  {
    id: 'prod-105',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '麻杏止咳糖浆',
    content: '麻杏止咳糖浆 (品牌: (贵中堂)麻杏止咳糖浆)',
    matchRule: '针对110302:支气管炎。请参考说明书适应症。'
  },
  {
    id: 'prod-106',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '黄连上清片',
    content: '黄连上清片 (品牌: (贵州百灵)黄连上清片)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-107',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '黄连双清丸',
    content: '黄连双清丸 (品牌: (立效)黄连双清丸)',
    matchRule: '针对110201:清热类。请参考说明书适应症。'
  },
  {
    id: 'prod-108',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '推荐药品' as ProductCategory,
    name: '龙胆泻肝丸',
    content: '龙胆泻肝丸 (品牌: (佛慈)龙胆泻肝丸(浓缩丸) | (孔孟)龙胆泻肝丸(水丸) | (同仁堂)龙胆泻肝丸 | (仲景)龙胆泻肝丸)',
    matchRule: '【功效】: 清肝胆，利湿热。【适应症】: 用于肝胆湿热、头晕目赤、耳鸣耳聋、胁痛口苦、尿赤涩痛、湿热带下。针对“肝火旺”。'
  },
  {
    id: 'prod-109',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '商城保健品' as ProductCategory,
    name: 'lifespace益生菌粉系列',
    content: '2、【汤臣倍健】lifespace益生菌粉系列\n[标准]: 见规则描述\n[作用]: 特定益生菌株有助于调节肠道免疫，间接支持全身免疫。',
    matchRule: '【推荐逻辑】: 菌群调节。需区分菌株，如乳杆菌针对阴道炎症预防，双歧杆菌针对肠道便秘/腹泻调节。'
  },
  {
    id: 'prod-110',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '商城保健品' as ProductCategory,
    name: '德上牌维生素C咀嚼片',
    content: '3、【北京同仁堂】德上牌维生素C咀嚼片\n[标准]: 见规则描述\n[作用]: 维生素C补充，支持免疫。',
    matchRule: '【推荐逻辑】: 免疫支持。VC可促进淋巴细胞增殖，增强中性粒细胞的趋化性。适合感冒频发、压力大、蔬菜摄入不足人群。'
  },
  {
    id: 'prod-111',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '商城保健品' as ProductCategory,
    name: '臻牛牌维生素C含片',
    content: '4、【北京同仁堂】臻牛牌维生素C含片（蓝莓味）\n[标准]: 见规则描述\n[作用]: 维生素C补充，支持免疫。',
    matchRule: '【推荐逻辑】: 免疫支持。VC可促进淋巴细胞增殖，增强中性粒细胞的趋化性。适合感冒频发、压力大、蔬菜摄入不足人群。'
  },
  {
    id: 'prod-112',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '商城保健品' as ProductCategory,
    name: '苍耳子油10ml/盒',
    content: '5、【葵花】苍耳子油10ml/盒\n[标准]: 见规则描述\n[作用]: 传统用于鼻塞、鼻炎',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-113',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '商城保健品' as ProductCategory,
    name: '苍耳子鼻舒贴6贴/盒',
    content: '6、【国药世家】苍耳子鼻舒贴6贴/盒\n[标准]: 见规则描述\n[作用]: 外用，缓解鼻部不适',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-114',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '商城保健品' as ProductCategory,
    name: '罗汉果胖大海雪梨茶72g',
    content: '7、【药济天下】罗汉果胖大海雪梨茶72g\n[标准]: 见规则描述\n[作用]: 罗汉果、胖大海、雪梨均为传统用于润肺利咽、缓解咳嗽的成分。',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-115',
    diseaseType: '常见病（50%）',
    disease: '呼吸道感染（28%）',
    category: '商城保健品' as ProductCategory,
    name: '竹蔗小吊梨汤90g',
    content: '8、【药须堂】竹蔗小吊梨汤90g\n[标准]: 见规则描述\n[作用]: 梨、竹蔗等为传统润肺生津、缓解秋燥咳嗽的食补成分。',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-116',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '保健品(方案)' as ProductCategory,
    name: '高氢片',
    content: '高氢片',
    matchRule: '【应用场景】: 辅助抗炎。利用氢分子的选择性抗氧化作用，减轻呼吸道慢性炎症及氧化应激损伤，适合慢病康复期调理。'
  },
  {
    id: 'prod-117',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '商城保健品' as ProductCategory,
    name: '珈蓓锦乳酸菌发酵胞溶产物蔓越莓复合粉',
    content: '1、【新菘福】珈蓓锦乳酸菌发酵胞溶产物蔓越莓复合粉\n[标准]: 产品成分在现代医学或传统应用中，被认可对泌尿生殖道菌群平衡或感染预防有辅助作用。\n[作用]: 蔓越莓中的原花青素（PACs）有助于抑制细菌在尿道附着，对泌尿系统健康有益。',
    matchRule: '【推荐逻辑】: 泌尿防护。富含A型原花青素，防止大肠杆菌黏附于尿道壁。适合反复尿路感染、白带异常女性。'
  },
  {
    id: 'prod-118',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '丹栀逍遥丸',
    content: '丹栀逍遥丸 (品牌: (天泰)丹栀逍遥丸 | (颜阳春)丹栀逍遥丸)',
    matchRule: '针对111002:综合治疗。请参考说明书适应症。'
  },
  {
    id: 'prod-119',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '乌鸡白凤丸',
    content: '乌鸡白凤丸 (品牌: (半边天)乌鸡白凤丸 | (月月舒)乌鸡白凤丸)',
    matchRule: '【功效】: 补气养血，调经止带。【适应症】: 用于气血两虚、身体虚弱、腰膝酸软、月经不调、崩漏带下。女性进补名药。'
  },
  {
    id: 'prod-120',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '二妙丸',
    content: '二妙丸 (品牌: (同仁堂)二妙丸)',
    matchRule: '针对111002:综合治疗。请参考说明书适应症。'
  },
  {
    id: 'prod-121',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '人参归脾丸',
    content: '人参归脾丸 (品牌: (同仁堂)人参归脾丸)',
    matchRule: '针对111003:月经不调。请参考说明书适应症。'
  },
  {
    id: 'prod-122',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '保妇康栓',
    content: '保妇康栓 (品牌: (碧凯)保妇康栓)',
    matchRule: '【功效】: 行气破瘀，生肌止痛。【适应症】: 用于湿热瘀滞所致的带下病，如霉菌性阴道炎、老年性阴道炎、宫颈糜烂。外用栓剂，直接作用于病灶。'
  },
  {
    id: 'prod-123',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '克霉唑栓',
    content: '克霉唑栓 (品牌: (白云山)克霉唑栓 | (妍婷)克霉唑栓)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-124',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '克霉唑阴道片',
    content: '克霉唑阴道片 (品牌: (福利先)克霉唑阴道片 | (碧晴)克霉唑阴道片 | (一孚汀)克霉唑阴道片 | (双鹤药业/福利先)克霉唑阴道片 | (凯妮汀)克霉唑阴道片 | (宝丽婷)克霉唑阴道片 | (康缘)克霉唑阴道片)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-125',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '八珍益母丸',
    content: '八珍益母丸 (品牌: (同仁堂)八珍益母丸)',
    matchRule: '【功效】: 补气血，调月经。【适应症】: 用于气血两虚、体质虚弱所致的月经不调、量少、色淡、经期后错。适合面色苍白、神疲乏力的女性。'
  },
  {
    id: 'prod-126',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '加味逍遥丸',
    content: '加味逍遥丸 (品牌: (万岁)加味逍遥丸 | (北京同仁堂)加味逍遥丸)',
    matchRule: '【功效】: 舒肝清热，健脾养血。【适应症】: 用于肝郁血虚、肝脾不和、两胁胀痛、头晕目眩、倦怠食少、月经不调、脐腹胀痛。'
  },
  {
    id: 'prod-127',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '十二乌鸡白凤丸',
    content: '十二乌鸡白凤丸 (品牌: (半边天)十二乌鸡白凤丸)',
    matchRule: '针对111003:月经不调。请参考说明书适应症。'
  },
  {
    id: 'prod-128',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '双唑泰栓',
    content: '双唑泰栓 (品牌: (九泰)双唑泰栓 | (天洋)双唑泰栓)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-129',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '双唑泰软膏',
    content: '双唑泰软膏 (品牌: (山庆)双唑泰软膏)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-130',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '同仁乌鸡白凤丸',
    content: '同仁乌鸡白凤丸 (品牌: (同仁堂)同仁乌鸡白凤丸)',
    matchRule: '针对111003:月经不调。请参考说明书适应症。'
  },
  {
    id: 'prod-131',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '复方乌鸡口服液',
    content: '复方乌鸡口服液 (品牌: (半边天)复方乌鸡口服液)',
    matchRule: '针对111003:月经不调。请参考说明书适应症。'
  },
  {
    id: 'prod-132',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '复方黄松洗液',
    content: '复方黄松洗液 (品牌: (肤阴洁)复方黄松洗液 | (源安堂)复方黄松洗液)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-133',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '复方黄松湿巾',
    content: '复方黄松湿巾 (品牌: (肤阴洁)复方黄松湿巾)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-134',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '妇炎康片',
    content: '妇炎康片 (品牌: (鑫字牌)妇炎康片)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-135',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '妇科千金片',
    content: '妇科千金片 (品牌: (千金)妇科千金片)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-136',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '妇科调经颗粒',
    content: '妇科调经颗粒 (品牌: 妇科调经颗粒)',
    matchRule: '针对111003:月经不调。请参考说明书适应症。'
  },
  {
    id: 'prod-137',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '少腹逐瘀丸',
    content: '少腹逐瘀丸 (品牌: (松鹿)少腹逐瘀丸)',
    matchRule: '针对111004:痛经。请参考说明书适应症。'
  },
  {
    id: 'prod-138',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '替硝唑栓',
    content: '替硝唑栓 (品牌: (春萌)替硝唑栓)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-139',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '洁尔阴洗液',
    content: '洁尔阴洗液 (品牌: (恩威)洁尔阴洗液)',
    matchRule: '针对111002:综合治疗。请参考说明书适应症。'
  },
  {
    id: 'prod-140',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '浓缩当归丸',
    content: '浓缩当归丸 (品牌: (仲景)浓缩当归丸)',
    matchRule: '针对111003:月经不调。请参考说明书适应症。'
  },
  {
    id: 'prod-141',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '温经止痛膏',
    content: '温经止痛膏 (品牌: (蓝素/联盟)温经止痛膏)',
    matchRule: '针对111004:痛经。请参考说明书适应症。'
  },
  {
    id: 'prod-142',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '甘霖洗剂',
    content: '甘霖洗剂 (品牌: (易舒特)甘霖洗剂 | 甘霖洗剂)',
    matchRule: '针对111002:综合治疗。请参考说明书适应症。'
  },
  {
    id: 'prod-143',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '田七痛经胶囊',
    content: '田七痛经胶囊 (品牌: (白云山)田七痛经胶囊)',
    matchRule: '针对111004:痛经。请参考说明书适应症。'
  },
  {
    id: 'prod-144',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '甲硝唑氯己定洗剂',
    content: '甲硝唑氯己定洗剂 (品牌: (皇隆/奇卫)甲硝唑氯己定洗剂 | (佳泰药业)甲硝唑氯己定洗剂 | (伊人)甲硝唑氯己定洗剂 | (碧洁)甲硝唑氯己定洗剂 | 甲硝唑氯己定洗剂)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-145',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '甲硝唑阴道凝胶',
    content: '甲硝唑阴道凝胶 (品牌: (尼美欣)甲硝唑阴道凝胶)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-146',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '甲硝唑阴道泡腾片',
    content: '甲硝唑阴道泡腾片 (品牌: (爱弥尔)甲硝唑阴道泡腾片 | (敖东)甲硝唑阴道泡腾片)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-147',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '痛经宝颗粒',
    content: '痛经宝颗粒 (品牌: (月月舒)痛经宝颗粒)',
    matchRule: '针对111003:月经不调。请参考说明书适应症。'
  },
  {
    id: 'prod-148',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '白带丸',
    content: '白带丸 (品牌: (万岁)白带丸)',
    matchRule: '【功效】: 清热除湿，止带。【适应症】: 用于湿热下注所致的带下量多、色黄、味臭。针对妇科炎症引起的白带异常。'
  },
  {
    id: 'prod-149',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '益母草膏',
    content: '益母草膏 (品牌: (金太子)益母草膏)',
    matchRule: '针对111003:月经不调。请参考说明书适应症。'
  },
  {
    id: 'prod-150',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '益母草颗粒',
    content: '益母草颗粒 (品牌: (润达君)益母草颗粒 | (同仁堂)益母草颗粒)',
    matchRule: '【功效】: 活血调经。【适应症】: 用于血瘀所致的月经不调，症见经水量少、淋漓不净、产后腹痛。针对“瘀血”引起的妇科问题。'
  },
  {
    id: 'prod-151',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '硝呋太尔制霉素阴道软胶囊',
    content: '硝呋太尔制霉素阴道软胶囊 (品牌: (朗依)硝呋太尔制霉素阴道软胶囊 | (MOL)硝呋太尔制霉素阴道软胶囊 | (康妇特/水青)硝呋太尔制霉素阴道软胶囊)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-152',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '硝酸咪康唑栓',
    content: '硝酸咪康唑栓 (品牌: (达克宁)硝酸咪康唑栓)',
    matchRule: '针对111001:妇科炎症。请参考说明书适应症。'
  },
  {
    id: 'prod-153',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '艾附暖宫丸',
    content: '艾附暖宫丸 (品牌: (同仁堂)艾附暖宫丸 | (立效)艾附暖宫丸)',
    matchRule: '【功效】: 理气养血，暖宫调经。【适应症】: 用于血虚气滞、下焦虚寒所致的月经不调、痛经、小腹冷痛。适合体质虚寒、经期不准的女性。'
  },
  {
    id: 'prod-154',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '逍遥丸',
    content: '逍遥丸 (品牌: (九芝堂)逍遥丸 | 逍遥丸 | (仲景)逍遥丸 | (九芝堂)逍遥丸(浓缩丸) | (白云山)逍遥丸)',
    matchRule: '【功效】: 疏肝健脾，养血调经。【适应症】: 用于肝郁脾虚所致的郁闷不舒、胸胁胀痛、头晕目眩、食欲减退、月经不调。针对“肝郁”。'
  },
  {
    id: 'prod-155',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '推荐药品' as ProductCategory,
    name: '黄苦洗液',
    content: '黄苦洗液 (品牌: (我爱你)黄苦洗液)',
    matchRule: '针对111002:综合治疗。请参考说明书适应症。'
  },
  {
    id: 'prod-156',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '商城保健品' as ProductCategory,
    name: '珈蓓美三红角豆多莓粉',
    content: '2、【新菘福】珈蓓美三红角豆多莓粉\n[标准]: 见规则描述\n[作用]: 通常含蔓越莓等莓果成分，可能对泌尿系统健康有类似辅助作用。',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-157',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '商城保健品' as ProductCategory,
    name: 'lifespace益生菌粉系列',
    content: '3、【汤臣倍健】lifespace益生菌粉系列\n[标准]: 见规则描述\n[作用]: 部分益生菌菌株（如乳杆菌属）的研究表明其可能有助于维持阴道微生态平衡。',
    matchRule: '【推荐逻辑】: 菌群调节。需区分菌株，如乳杆菌针对阴道炎症预防，双歧杆菌针对肠道便秘/腹泻调节。'
  },
  {
    id: 'prod-158',
    diseaseType: '常见病（50%）',
    disease: '妇科炎症（15%）',
    category: '商城保健品' as ProductCategory,
    name: '益母草红花三七覆盆子贴8贴/盒',
    content: '4、【国药世家】益母草红花三七覆盆子贴8贴/盒\n[标准]: 见规则描述\n[作用]: 成分均为传统调经、活血、益肾之品',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-159',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '快速检测' as ProductCategory,
    name: '幽门螺旋杆菌，便隐血/转铁蛋白（FOB/TRF）检测',
    content: '幽门螺旋杆菌，便隐血/转铁蛋白（FOB/TRF）检测',
    matchRule: '【临床价值】: 针对胃痛、口臭、反酸人群。明确HP感染是根除治疗的第一步，有助于预防胃溃疡及胃癌。'
  },
  {
    id: 'prod-160',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '商城保健品' as ProductCategory,
    name: 'lifespace益生菌粉系列',
    content: '1、【汤臣倍健】lifespace益生菌粉系列\n[标准]: 产品直接含有调节肠道菌群、促进消化或传统用于健胃消食的成分\n[作用]: 益生菌可直接调节肠道菌群，改善腹泻、腹胀等消化不良症状。',
    matchRule: '【推荐逻辑】: 菌群调节。需区分菌株，如乳杆菌针对阴道炎症预防，双歧杆菌针对肠道便秘/腹泻调节。'
  },
  {
    id: 'prod-161',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '乳果糖口服溶液',
    content: '乳果糖口服溶液 (品牌: (利动)乳果糖口服溶液)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-162',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '乳酸菌素片',
    content: '乳酸菌素片 (品牌: (江中/利活)乳酸菌素片)',
    matchRule: '【功效】: 助消化、调节肠道菌群。【适应症】: 用于肠内异常发酵、消化不良、腹胀及小儿腹泻。能在肠道形成保护层，抑制致病菌。'
  },
  {
    id: 'prod-163',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '人参健脾丸',
    content: '人参健脾丸 (品牌: (同仁堂)人参健脾丸)',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-164',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '便乃通茶',
    content: '便乃通茶 (品牌: 便乃通茶)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-165',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '保和丸',
    content: '保和丸 (品牌: (佛慈)保和丸(浓缩丸) | (仲景)保和丸(浓缩丸) | (同仁堂)保和丸 | (冯了性)保和丸)',
    matchRule: '【功效】: 消食导滞，和胃。【适应症】: 用于食积停滞、脘腹胀满、嗳腐吞酸、不欲饮食。针对饮食过度导致的消化不良。'
  },
  {
    id: 'prod-166',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '保和颗粒',
    content: '保和颗粒 (品牌: (九方)保和颗粒)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-167',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '健胃消食片',
    content: '健胃消食片 (品牌: (葵花)健胃消食片 | (江中)健胃消食片 | (叶开泰)健胃消食片)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-168',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '健脾丸',
    content: '健脾丸 (品牌: 健脾丸)',
    matchRule: '【功效】: 健脾开胃。【适应症】: 用于脾胃虚弱、脘腹胀满、食少便溏。比保和丸更侧重于“补脾”。'
  },
  {
    id: 'prod-169',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '加味保和丸',
    content: '加味保和丸 (品牌: (同仁堂)加味保和丸)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-170',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '加味藿香正气丸',
    content: '加味藿香正气丸 (品牌: (白云山/中一牌)加味藿香正气丸 | (观鹤)加味藿香正气丸)',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-171',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '十滴水',
    content: '十滴水 (品牌: (育林)十滴水 | (慧宝源)十滴水)',
    matchRule: '【功效】: 健胃，驱风。【适应症】: 用于中暑引起的头晕、恶心、腹痛、胃肠不适。针对“暑湿”引起的急症。'
  },
  {
    id: 'prod-172',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '参苓白术丸',
    content: '参苓白术丸 (品牌: (孔孟)参苓白术丸)',
    matchRule: '【功效】: 健脾、益气。【适应症】: 同参苓白术散，丸剂药力较缓，适合长期调理脾胃虚弱、便溏腹泻。'
  },
  {
    id: 'prod-173',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '参苓白术散',
    content: '参苓白术散 (品牌: (博祥)参苓白术散 | (立效)参苓白术散)',
    matchRule: '【功效】: 健脾、益气。【适应症】: 用于体倦乏力、食少便溏。针对脾胃虚弱导致的消化不良和慢性腹泻，有“补脾气、渗湿气”的作用。'
  },
  {
    id: 'prod-174',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '口服补液盐散',
    content: '口服补液盐散 (品牌: (乐宁)口服补液盐散(Ⅱ))',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-175',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '启脾丸',
    content: '启脾丸 (品牌: (同仁堂)启脾丸)',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-176',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '和胃整肠丸',
    content: '和胃整肠丸 (品牌: (丹南泰)和胃整肠丸)',
    matchRule: '针对110806:慢性结肠炎。请参考说明书适应症。'
  },
  {
    id: 'prod-177',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '固本益肠片',
    content: '固本益肠片 (品牌: (新乐)固本益肠片)',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-178',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '地衣芽孢杆菌活菌胶囊',
    content: '地衣芽孢杆菌活菌胶囊 (品牌: (整肠生)地衣芽孢杆菌活菌胶囊)',
    matchRule: '【功效】: 调节肠道菌群。【适应症】: 用于细菌性肠道感染、腹泻、消化不良。能消耗肠道内氧气，促进厌氧益生菌生长。'
  },
  {
    id: 'prod-179',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '复方消化酶胶囊(Ⅱ)',
    content: '复方消化酶胶囊(Ⅱ) (品牌: (达喜)复方消化酶胶囊(Ⅱ))',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-180',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '复方维生素U片',
    content: '复方维生素U片 (品牌: (维仙优)复方维生素U片)',
    matchRule: '针对110803:消化性溃疡。请参考说明书适应症。'
  },
  {
    id: 'prod-181',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '多潘立酮片',
    content: '多潘立酮片 (品牌: (吗丁啉)多潘立酮片 | (诺捷康)多潘立酮片 | (宝泰理通)多潘立酮片)',
    matchRule: '【功效】: 胃动力药。【适应症】: 用于消化不良、腹胀、嗳气、恶心、呕吐。能增强胃蠕动，促进胃排空（如吗丁啉）。'
  },
  {
    id: 'prod-182',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '大山楂丸',
    content: '大山楂丸 (品牌: (同仁堂)大山楂丸 | (立效)大山楂丸)',
    matchRule: '【功效】: 开胃消食。【适应症】: 用于食积内停、脘腹胀满、不思饮食。山楂、六神曲、麦芽三味药组成，老少皆宜。'
  },
  {
    id: 'prod-183',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '大黄通便颗粒',
    content: '大黄通便颗粒 (品牌: (索通)大黄通便颗粒)',
    matchRule: '【功效】: 清热通便。【适应症】: 用于实热便秘、便结不通、脘腹胀满。药力较强，适合实热型便秘。'
  },
  {
    id: 'prod-184',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '奥美拉唑镁肠溶片',
    content: '奥美拉唑镁肠溶片 (品牌: (洛赛克)奥美拉唑镁肠溶片)',
    matchRule: '【功效】: 质子泵抑制剂（抑酸药）。【适应症】: 用于胃溃疡、十二指肠溃疡、应激性溃疡、反流性食管炎。能显著抑制胃酸分泌，促进溃疡愈合。'
  },
  {
    id: 'prod-185',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '导赤丸',
    content: '导赤丸 (品牌: (同仁堂)导赤丸)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-186',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '山楂麦曲颗粒',
    content: '山楂麦曲颗粒 (品牌: (南海/恒诚制药)山楂麦曲颗粒)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-187',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '左金丸',
    content: '左金丸 (品牌: (黄连之乡)左金丸)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-188',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '布拉氏酵母菌散',
    content: '布拉氏酵母菌散 (品牌: (亿活)布拉氏酵母菌散)',
    matchRule: '【功效】: 益生菌制剂。【适应症】: 用于治疗成人和儿童腹泻，及肠道菌群失调引起的腹泻。能抑制致病菌生长，促进肠道黏膜修复。'
  },
  {
    id: 'prod-189',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '开塞露',
    content: '开塞露 (品牌: 开塞露(含甘油) | (恒健)开塞露(含甘油) | (麦迪海)开塞露)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-190',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '开塞露(含甘油)',
    content: '开塞露(含甘油) (品牌: (白云山/敬修堂)开塞露(含甘油) | (信龙)开塞露(含甘油))',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-191',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '归脾丸',
    content: '归脾丸 (品牌: (仲景)归脾丸)',
    matchRule: '【功效】: 益气健脾，养血安神。【适应症】: 用于心脾两虚、气血不足所致的心悸、失眠、食少体倦、面色萎黄。针对“思虑过度”损伤心脾。'
  },
  {
    id: 'prod-192',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '排毒养颜胶囊',
    content: '排毒养颜胶囊 (品牌: (盘龙云海)排毒养颜胶囊)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-193',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '摩罗丹',
    content: '摩罗丹 (品牌: (华山牌)摩罗丹)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-194',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '新复方芦荟胶囊',
    content: '新复方芦荟胶囊 (品牌: (可伊)新复方芦荟胶囊)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-195',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '木香顺气丸',
    content: '木香顺气丸 (品牌: (同仁堂)木香顺气丸 | (白云山/中一)木香顺气丸)',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-196',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '枯草杆菌二联活菌颗粒',
    content: '枯草杆菌二联活菌颗粒 (品牌: (妈咪爱)枯草杆菌二联活菌颗粒)',
    matchRule: '针对110808:肠道菌群失调。请参考说明书适应症。'
  },
  {
    id: 'prod-197',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '枸橼酸铋钾胶囊',
    content: '枸橼酸铋钾胶囊 (品牌: (丽珠得乐)枸橼酸铋钾胶囊)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-198',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '槟榔四消丸',
    content: '槟榔四消丸 (品牌: (同仁堂)槟榔四消丸)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-199',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '比沙可啶肠溶片',
    content: '比沙可啶肠溶片 (品牌: (泰必通)比沙可啶肠溶片)',
    matchRule: '【功效】: 刺激性泻药。【适应症】: 用于急、慢性便秘及习惯性便秘。通过刺激大肠黏膜引起排便反射。'
  },
  {
    id: 'prod-200',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '气滞胃痛颗粒',
    content: '气滞胃痛颗粒 (品牌: (999)气滞胃痛颗粒)',
    matchRule: '【功效】: 舒肝理气，和胃止痛。【适应症】: 用于肝郁气滞、胸痞胀满、胃脘疼痛。针对“生气”或压力大导致的胃痛。'
  },
  {
    id: 'prod-201',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '沉香化气丸',
    content: '沉香化气丸 (品牌: (白云山/敬修堂/仁智祥)沉香化气丸)',
    matchRule: '【功效】: 理气疏肝，消积和胃。【适应症】: 用于肝郁气滞、脘腹胀痛、不思饮食、嗳气泛酸。针对情绪不佳导致的胃肠功能紊乱。'
  },
  {
    id: 'prod-202',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '法莫替丁片',
    content: '法莫替丁片 (品牌: 法莫替丁片)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-203',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '活胃散',
    content: '活胃散 (品牌: (同仁堂)活胃散)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-204',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '盐酸小檗碱片',
    content: '盐酸小檗碱片 (品牌: 盐酸小檗碱片 | (华南牌)盐酸小檗碱片)',
    matchRule: '针对110806:慢性结肠炎。请参考说明书适应症。'
  },
  {
    id: 'prod-205',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '盐酸雷尼替丁胶囊',
    content: '盐酸雷尼替丁胶囊 (品牌: (雷立雅)盐酸雷尼替丁胶囊 | (雷金雅/金雷立雅)盐酸雷尼替丁胶囊)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-206',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '碳酸氢钠片',
    content: '碳酸氢钠片 (品牌: (致和)碳酸氢钠片 | (力生)碳酸氢钠片 | (玉威)碳酸氢钠片)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-207',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '羔羊胃提取物维B12胶囊',
    content: '羔羊胃提取物维B12胶囊 (品牌: (羔羊胃)羔羊胃提取物维B12胶囊)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-208',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '肚痛丸',
    content: '肚痛丸 (品牌: (中联)肚痛丸)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-209',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '肠炎宁片',
    content: '肠炎宁片 (品牌: (康恩贝)肠炎宁片)',
    matchRule: '【功效】: 清热利湿，行气。【适应症】: 用于急、慢性胃肠炎、腹泻、细菌性痢疾、小儿消化不良。针对肠道炎症引起的腹痛腹泻。'
  },
  {
    id: 'prod-210',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '胃康灵胶囊',
    content: '胃康灵胶囊 (品牌: (葵花)胃康灵胶囊 | (德济)胃康灵胶囊)',
    matchRule: '【功效】: 柔肝和胃，散瘀止痛。【适应症】: 用于肝胃不和、瘀血阻络所致的胃脘疼痛、连及两胁、嗳气泛酸；慢性胃炎。'
  },
  {
    id: 'prod-211',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '胃欣舒胶囊',
    content: '胃欣舒胶囊 (品牌: (方大)胃欣舒胶囊)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-212',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '胃灵颗粒',
    content: '胃灵颗粒 (品牌: (德济)胃灵颗粒)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-213',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '胃苏颗粒',
    content: '胃苏颗粒 (品牌: 胃苏颗粒 | (卫苏/护佑)胃苏颗粒)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-214',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '胰酶肠溶胶囊',
    content: '胰酶肠溶胶囊 (品牌: (得每通)胰酶肠溶胶囊)',
    matchRule: '针对110807:胃肠调理。请参考说明书适应症。'
  },
  {
    id: 'prod-215',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '腹可安片',
    content: '腹可安片 (品牌: 腹可安片)',
    matchRule: '【功效】: 清热利湿，收敛止痛。【适应症】: 用于消化不良、急慢性肠炎、细菌性痢疾。针对腹痛、腹泻症状。'
  },
  {
    id: 'prod-216',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '舒肝健胃丸',
    content: '舒肝健胃丸 (品牌: (立效)舒肝健胃丸)',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-217',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '舒肝和胃丸',
    content: '舒肝和胃丸 (品牌: (同仁堂)舒肝和胃丸)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-218',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '舒腹贴膏',
    content: '舒腹贴膏 (品牌: (小明仁)舒腹贴膏)',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-219',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '蒙脱石散',
    content: '蒙脱石散 (品牌: (思密达)蒙脱石散 | (鑫烨)蒙脱石散)',
    matchRule: '【功效】: 肠黏膜保护剂、止泻药。【适应症】: 用于急、慢性腹泻。能覆盖肠黏膜，吸附病原体和毒素（如思密达）。'
  },
  {
    id: 'prod-220',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '藿香正气丸',
    content: '藿香正气丸 (品牌: 藿香正气丸 | (仲景)藿香正气丸)',
    matchRule: '针对110805:腹泻。请参考说明书适应症。'
  },
  {
    id: 'prod-221',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '藿香清胃胶囊',
    content: '藿香清胃胶囊 (品牌: 藿香清胃胶囊)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-222',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '补脾益肠丸',
    content: '补脾益肠丸 (品牌: (白云山/陈李济)补脾益肠丸 | (白云山)补脾益肠丸)',
    matchRule: '【功效】: 补中益气，健脾和胃，涩肠止泻。【适应症】: 用于脾虚泄泻、症见腹痛腹胀、肠鸣泄泻、黏液便。针对慢性结肠炎、溃疡性结肠炎。'
  },
  {
    id: 'prod-223',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '西咪替丁片',
    content: '西咪替丁片 (品牌: (恒健)西咪替丁片)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-224',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '越鞠保和丸',
    content: '越鞠保和丸 (品牌: (名草)越鞠保和丸)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-225',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '通便灵胶囊',
    content: '通便灵胶囊 (品牌: (以岭)通便灵胶囊)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-226',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '金佛止痛丸',
    content: '金佛止痛丸 (品牌: (白云山/中一牌)金佛止痛丸)',
    matchRule: '针对110802:慢性胃炎。请参考说明书适应症。'
  },
  {
    id: 'prod-227',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '铝碳酸镁咀嚼片',
    content: '铝碳酸镁咀嚼片 (品牌: (鑫烨)铝碳酸镁咀嚼片 | (达喜)铝碳酸镁咀嚼片 | (鑫齐)铝碳酸镁咀嚼片)',
    matchRule: '【功效】: 抗酸、保护胃黏膜。【适应症】: 用于胃及十二指肠溃疡、急慢性胃炎、反流性食管炎。能迅速中和胃酸并结合胆汁酸（如达喜）。'
  },
  {
    id: 'prod-228',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '阿苯达唑片',
    content: '阿苯达唑片 (品牌: (史克肠虫清)阿苯达唑片)',
    matchRule: '【功效】: 广谱驱虫药。【适应症】: 用于治疗蛔虫、蛲虫、钩虫、鞭虫等肠道寄生虫感染。通过抑制寄生虫对葡萄糖的吸收，导致虫体能量耗竭而死亡。'
  },
  {
    id: 'prod-229',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '附子理中丸',
    content: '附子理中丸 (品牌: (佛慈)附子理中丸 | (仲景)附子理中丸 | (同仁堂)附子理中丸)',
    matchRule: '针对110807:胃肠调理。请参考说明书适应症。'
  },
  {
    id: 'prod-230',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '陈夏六君子丸',
    content: '陈夏六君子丸 (品牌: (嘉应)陈夏六君子丸)',
    matchRule: '【功效】: 补脾健胃，理气化痰。【适应症】: 用于脾胃虚弱、痰饮内阻、脘腹胀满、食少便溏。适合脾虚伴有痰湿的人群。'
  },
  {
    id: 'prod-231',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '陈香露白露片',
    content: '陈香露白露片 (品牌: (邦琪集团)陈香露白露片 | (慧宝源)陈香露白露片)',
    matchRule: '【功效】: 健胃和中，制酸止痛。【适应症】: 用于胃酸过多、胃痛、腹胀、慢性胃炎。含铋剂和制酸成分，能保护胃黏膜。'
  },
  {
    id: 'prod-232',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '食母生片',
    content: '食母生片 (品牌: 食母生片)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-233',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '香砂六君丸',
    content: '香砂六君丸 (品牌: (仲景)香砂六君丸 | (冯了性)香砂六君丸)',
    matchRule: '针对110801:消化不良。请参考说明书适应症。'
  },
  {
    id: 'prod-234',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '香砂养胃丸',
    content: '香砂养胃丸 (品牌: (天福康)香砂养胃丸 | 香砂养胃丸 | (九芝堂)香砂养胃丸(浓缩丸) | (仲景)香砂养胃丸(浓缩丸) | (仲景)香砂养胃丸)',
    matchRule: '针对110807:胃肠调理。请参考说明书适应症。'
  },
  {
    id: 'prod-235',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '麻仁丸',
    content: '麻仁丸 (品牌: (诺得胜)麻仁丸 | (太福)麻仁丸)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-236',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '推荐药品' as ProductCategory,
    name: '麻仁软胶囊',
    content: '麻仁软胶囊 (品牌: (中央)麻仁软胶囊)',
    matchRule: '针对110804:便秘。请参考说明书适应症。'
  },
  {
    id: 'prod-237',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '商城保健品' as ProductCategory,
    name: '十一联活性益生菌特膳粉',
    content: '2、【华北制药】十一联活性益生菌特膳粉\n[标准]: 见规则描述\n[作用]: 复合益生菌，针对性调节肠道。',
    matchRule: '【推荐逻辑】: 菌群调节。需区分菌株，如乳杆菌针对阴道炎症预防，双歧杆菌针对肠道便秘/腹泻调节。'
  },
  {
    id: 'prod-238',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '商城保健品' as ProductCategory,
    name: '山楂鸡内金多肽特膳饮',
    content: '3、【华北制药】山楂鸡内金多肽特膳饮\n[标准]: 见规则描述\n[作用]: 山楂、鸡内金是传统医学中经典的消食化积、健胃成分。',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-239',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '商城保健品' as ProductCategory,
    name: '健脾/消食贴6贴/盒',
    content: '4、【葵花】健脾/消食贴6贴/盒\n[标准]: 见规则描述\n[作用]: 外用贴剂，传统用于辅助治疗小儿脾虚、食积等消化不良。',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-240',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '商城保健品' as ProductCategory,
    name: '益生菌铁棍山药猴头菇粉500g',
    content: '5、【药济天下】益生菌铁棍山药猴头菇粉500g\n[标准]: 见规则描述\n[作用]: 益生菌调节肠道，山药、猴头菇传统用于健脾养胃。',
    matchRule: '【推荐逻辑】: 菌群调节。需区分菌株，如乳杆菌针对阴道炎症预防，双歧杆菌针对肠道便秘/腹泻调节。'
  },
  {
    id: 'prod-241',
    diseaseType: '常见病（50%）',
    disease: '消化系统疾病（15%）',
    category: '商城保健品' as ProductCategory,
    name: '铁棍山药粉500g',
    content: '6、【食方扁鹊】铁棍山药粉500g\n[标准]: 见规则描述\n[作用]: 山药是药食同源之品，传统用于补脾养胃。',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-242',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '快速检测' as ProductCategory,
    name: '心梗早筛',
    content: '心梗早筛',
    matchRule: '【临床价值】: 针对高危人群（高血压、高血脂）。在出现胸痛、胸闷时快速检测心肌肌钙蛋白，争取黄金救治时间。'
  },
  {
    id: 'prod-243',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '保健品(方案)' as ProductCategory,
    name: '高氧片，高氢片',
    content: '高氧片，高氢片',
    matchRule: '【应用场景】: 辅助抗炎。利用氢分子的选择性抗氧化作用，减轻呼吸道慢性炎症及氧化应激损伤，适合慢病康复期调理。'
  },
  {
    id: 'prod-244',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '商城保健品' as ProductCategory,
    name: '鱼油软胶囊升级版',
    content: '1、【汤臣倍健】鱼油软胶囊升级版\n[标准]: 产品成分有较为明确的辅助调节血脂、血压、改善血液循环或保护心脏的科学研究支持。\n[作用]: 富含EPA和DHA（Omega-3），有助于降低甘油三酯、辅助调节血脂。',
    matchRule: '【推荐逻辑】: 血脂管理。高纯度EPA/DHA可降低甘油三酯，抑制血小板聚集。适合高血脂、动脉硬化风险人群。'
  },
  {
    id: 'prod-245',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '推荐药品' as ProductCategory,
    name: '天麻素片',
    content: '天麻素片 (品牌: (昆药集团/天眩清)天麻素片)',
    matchRule: '针对112108:心脑血管综合用药。请参考说明书适应症。'
  },
  {
    id: 'prod-246',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '推荐药品' as ProductCategory,
    name: '电子血压计',
    content: '电子血压计 (品牌: (欧姆龙)电子血压计)',
    matchRule: '针对140101:血压计。请参考说明书适应症。'
  },
  {
    id: 'prod-247',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '推荐药品' as ProductCategory,
    name: '绞股蓝总甙片',
    content: '绞股蓝总甙片 (品牌: (白云山/百世康)绞股蓝总甙片)',
    matchRule: '针对112103:高血脂。请参考说明书适应症。'
  },
  {
    id: 'prod-248',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '推荐药品' as ProductCategory,
    name: '臂式电子血压计',
    content: '臂式电子血压计 (品牌: 臂式电子血压计)',
    matchRule: '针对140101:血压计。请参考说明书适应症。'
  },
  {
    id: 'prod-249',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '商城保健品' as ProductCategory,
    name: '大豆磷脂软胶囊升级版',
    content: '2、【汤臣倍健】大豆磷脂软胶囊升级版\n[标准]: 见规则描述\n[作用]: 磷脂是细胞膜成分，对脂质代谢有辅助作用。',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-250',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '商城保健品' as ProductCategory,
    name: '辅酶Q10维生素E软胶囊',
    content: '3、【汤臣倍健】辅酶Q10维生素E软胶囊\n[标准]: 见规则描述\n[作用]: 辅酶Q10是细胞能量代谢剂，对心肌功能有营养支持作用。',
    matchRule: '【推荐逻辑】: 心肌营养。作为细胞线粒体能量转换的关键酶，增强心肌收缩力。适合心慌、心悸及长期服用他汀类药物者。'
  },
  {
    id: 'prod-251',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '商城保健品' as ProductCategory,
    name: '健安适水飞蓟葛根丹参片',
    content: '4、【汤臣倍健】健安适水飞蓟葛根丹参片\n[标准]: 见规则描述\n[作用]: 丹参是传统活血化瘀要药，现代研究显示其对心血管有积极影响。',
    matchRule: '原始方案提供'
  },
  {
    id: 'prod-252',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '商城保健品' as ProductCategory,
    name: '定制纳豆红曲地龙蛋白片',
    content: '5、【华北制药】定制纳豆红曲地龙蛋白片\n[标准]: 见规则描述\n[作用]: 纳豆激酶、红曲（含天然洛伐他汀类似物）对辅助调节血脂有较多研究。',
    matchRule: '【推荐逻辑】: 辅助降脂。纳豆激酶辅助溶栓，红曲含天然洛伐他汀。适合轻度血脂异常、不愿服用西药他汀者。'
  },
  {
    id: 'prod-253',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '商城保健品' as ProductCategory,
    name: '黄精地龙蛋白特膳饮',
    content: '6、【充满】黄精地龙蛋白特膳饮\n[标准]: 见规则描述\n[作用]: 地龙蛋白（蚯蚓蛋白）在传统和现代研究中被认为具有活血、改善微循环的潜力。',
    matchRule: '【推荐逻辑】: 改善微循环。具有纤溶活性，降低血液粘稠度。适合肢体麻木、微循环障碍人群。'
  },
  {
    id: 'prod-254',
    diseaseType: '慢性病（23%）',
    disease: '高血压及相关心血管问题（20%）',
    category: '商城保健品' as ProductCategory,
    name: '杜仲雄花黄精牡蛎肽饮',
    content: '7、【畅元素】杜仲雄花黄精牡蛎肽饮\n[标准]: 见规则描述\n[作用]: 杜仲是传统用于辅助降压的药材。',
    matchRule: '【推荐逻辑】: 辅助稳压。含木脂素类成分，具有扩张血管、平稳血压的作用，适合高血压前期或波动者。'
  },
];

// 按疾病类型分组的产品索引（用于快速筛选）
export const PRODUCTS_BY_DISEASE: Record<string, RealProduct[]> = {};
REAL_PRODUCTS.forEach(p => {
  const simplified = simplifyDisease(p.disease);
  if (!PRODUCTS_BY_DISEASE[simplified]) {
    PRODUCTS_BY_DISEASE[simplified] = [];
  }
  PRODUCTS_BY_DISEASE[simplified].push(p);
});

// 获取产品统计信息
export function getProductStats() {
  const stats = {
    total: REAL_PRODUCTS.length,
    byCategory: {} as Record<string, number>,
    byDisease: {} as Record<string, number>
  };
  
  REAL_PRODUCTS.forEach(p => {
    stats.byCategory[p.category] = (stats.byCategory[p.category] || 0) + 1;
    const simplified = simplifyDisease(p.disease);
    stats.byDisease[simplified] = (stats.byDisease[simplified] || 0) + 1;
  });
  
  return stats;
}
