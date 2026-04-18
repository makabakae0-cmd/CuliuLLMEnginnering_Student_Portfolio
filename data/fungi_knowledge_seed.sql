PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS myth_clarifications;
DROP TABLE IF EXISTS teaching_stage_guides;
DROP TABLE IF EXISTS science_facts;
DROP TABLE IF EXISTS sources;

CREATE TABLE sources (
  id INTEGER PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_file TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE science_facts (
  id INTEGER PRIMARY KEY,
  fact_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  teaching_level TEXT DEFAULT 'middle_school',
  confidence_level TEXT DEFAULT 'high',
  source_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(source_id) REFERENCES sources(id)
);

CREATE TABLE teaching_stage_guides (
  id INTEGER PRIMARY KEY,
  fungus_type TEXT NOT NULL,
  host_type TEXT NOT NULL,
  stage_no INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  biology_explanation TEXT NOT NULL,
  host_behavior_change TEXT NOT NULL,
  teaching_point TEXT NOT NULL,
  safety_note TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fungus_type, host_type, stage_no),
  FOREIGN KEY(source_id) REFERENCES sources(id)
);

CREATE TABLE myth_clarifications (
  id INTEGER PRIMARY KEY,
  myth TEXT NOT NULL,
  correction TEXT NOT NULL,
  teaching_tip TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(source_id) REFERENCES sources(id)
);

INSERT INTO sources (id, source_name, source_file, notes) VALUES
(1, 'Ophiocordyceps unilateralis reference', 'fungi_refrence.md', '科普讲解基础资料，含生命周期、生态位、术语边界与药用潜力信息');

INSERT INTO science_facts (fact_key, title, content, category, source_id) VALUES
('taxonomy_2007_split', '分类学更新', '2007年分子系统学研究后，相关类群从传统Cordyceps框架中重分，Ophiocordyceps成为独立谱系。', 'taxonomy', 1),
('host_specificity_camponotini', '宿主特异性', 'O. unilateralis复合群主要感染Camponotini蚂蚁，具有明显宿主特异性。', 'host_range', 1),
('microclimate_requirement', '微环境需求', '感染后蚂蚁常移动到更适合真菌生长和传播的温湿环境。', 'ecology', 1),
('death_grip_behavior', '死亡咬附行为', '典型表现是蚂蚁咬附叶脉或枝条固定，常被称为death grip。', 'behavior', 1),
('leaf_bite_height', '咬附高度特征', '在部分热带观测中，感染蚂蚁常固定在离地约25厘米上下的位置。', 'field_observation', 1),
('optimal_humidity_temp', '传播环境范围', '报道中常见传播相关环境约为20-30摄氏度和较高湿度（约94%-95%）。', 'ecology', 1),
('graveyard_pattern', '蚂蚁墓地现象', '局部区域可出现较高密度感染死亡个体，形成“graveyard”分布。', 'population_pattern', 1),
('rainy_season_signal', '季节性变化', '雨季前后常观察到感染个体密度上升，提示降雨与传播窗口相关。', 'seasonality', 1),
('life_cycle_4_10_days', '感染到繁殖时间窗', '从感染行为操控到死亡并形成可释放孢子的结构，文献常见约4-10天量级。', 'lifecycle', 1),
('temperate_exception', '温带例外', '该类群主要见于热带，但部分暖温带森林也有记录。', 'distribution', 1),
('human_infection_boundary', '人类感染边界', 'O. unilateralis是昆虫病原真菌，当前科普教学不应将其描述为现实中的“人类僵尸真菌”。', 'safety_boundary', 1),
('pharma_potential', '药用潜力', '相关昆虫病原真菌的次级代谢物具有免疫调节、抗肿瘤等研究潜力，但不等于可直接临床使用。', 'application', 1);

INSERT INTO teaching_stage_guides (fungus_type, host_type, stage_no, stage_name, biology_explanation, host_behavior_change, teaching_point, safety_note, source_id) VALUES
('unilateralis', 'camponotus', 1, '孢子接触与附着', '孢子先附着于外骨骼，随后通过酶与机械作用突破表层。', '宿主外观通常无明显异常。', '强调“接触-附着-侵入”是感染起点。', '避免渲染恐怖效果，使用“病原-宿主互作”术语。', 1),
('unilateralis', 'camponotus', 2, '体内扩增', '真菌细胞在体内扩增并与多组织发生互作。', '可能出现活动节律变乱或短时抽动。', '说明行为变化来自生理过程改变，不是“意志被瞬间控制”。', '避免绝对化表述，如“100%会这样”。', 1),
('unilateralis', 'camponotus', 3, '离巢与下移', '宿主偏离原有高处路径，向更利于真菌发育的微环境移动。', '离开常规觅食路线，向地表及低位植被移动。', '把“生态位选择”讲清楚：对真菌传播更有利。', '提醒这是特定宿主-真菌组合，不可泛化到所有蚂蚁。', 1),
('unilateralis', 'camponotus', 4, '攀附定位', '宿主被诱导攀附到叶脉/枝条等位置。', '动作模式变得固定，趋向特定附着点。', '联系“行为操控是适应性策略”的概念。', '不使用“完全脑控”这类夸张词。', 1),
('unilateralis', 'camponotus', 5, '死亡咬附（death grip）', '下颚肌肉功能崩解并维持强咬附，固定尸体位置。', '宿主失去自主运动并保持倒挂/固定。', '解释“固定位置”对后续子实体形成的重要性。', '讲“现象+机制假说”，不要把假说当定论。', 1),
('unilateralis', 'camponotus', 6, '宿主死亡后菌丝扩展', '宿主死亡后，菌丝继续侵入组织并加固外骨骼。', '行为终止，形态转入“真菌繁殖平台”。', '强调“寄主死亡后仍是生命周期关键阶段”。', '避免道德化语言，保持科学描述。', 1),
('unilateralis', 'camponotus', 7, '子实体形成', '子实体从特定部位生长并逐步成熟。', '无行为变化（宿主已死亡）。', '讲清“结构形成”与“传播能力”之间关系。', '补充自然界中也有高寄生菌抑制其繁殖。', 1),
('unilateralis', 'camponotus', 8, '孢子释放与循环再启动', '成熟结构释放孢子，传播到新宿主路径区域。', '种群层面出现局部聚集感染模式。', '把个体故事上升到“种群与生态过程”。', '提醒学生区分科幻叙事与现实证据。', 1),

('sinensis', 'ghost_moth', 1, '幼虫感染起始', '冬虫夏草相关类群主要感染鳞翅目幼虫而非蚂蚁。', '宿主为地下或近地活动幼虫。', '先立“宿主边界”：不是所有虫都感染。', '避免把O. sinensis与僵尸蚂蚁机制混同。', 1),
('sinensis', 'ghost_moth', 2, '体内定殖', '真菌在幼虫体内定殖并逐步占据营养资源。', '幼虫活性下降，发育受影响。', '讲解“寄生资源竞争”概念。', '避免直接套用蚂蚁行为操控描述。', 1),
('sinensis', 'ghost_moth', 3, '宿主死亡与僵化', '宿主死亡后形成真菌-虫体复合体。', '不表现叶脉咬附行为。', '突出不同宿主导致不同表型。', '注明该阶段受环境因子强影响。', 1),
('sinensis', 'ghost_moth', 4, '子座形成', '在适宜季节和土壤条件下形成可见子座。', '无行为变化。', '将“冬虫夏草”与其生态周期对应讲解。', '不要宣称固定时间必然出现。', 1),
('sinensis', 'ghost_moth', 5, '孢子传播', '成熟后进行繁殖传播，完成生命周期闭环。', '群体层面受地理与气候显著约束。', '强调高海拔生态约束与资源保护议题。', '药用讨论须加“研究证据分级”说明。', 1);

INSERT INTO myth_clarifications (myth, correction, teaching_tip, source_id) VALUES
('“僵尸真菌会自然感染人类并控制人类行为”', '当前课堂语境下应明确：O. unilateralis为昆虫病原，核心证据围绕蚂蚁等节肢动物。', '讲解时先给“证据边界”，再讲科幻作品借鉴。', 1),
('“所有蚂蚁都会被同一种真菌以同样方式操控”', '研究显示存在宿主特异性与物种复合群，不同宿主行为表型不同。', '用“特异性”替代“一刀切”叙述。', 1),
('“死亡咬附是随机现象”', '死亡咬附与微环境传播效率相关，属于适应性行为操控的一部分。', '结合温湿度和高度数据讲生态意义。', 1),
('“冬虫夏草就是僵尸蚂蚁真菌”', '两者在宿主与生态位上存在关键差异，不能混为一谈。', '在课堂中设置“相同点/不同点”对照表。', 1),
('“有药用潜力就等于可直接治病”', '次级代谢物研究不等于临床结论，需要区分体外实验、动物实验和临床证据。', '引导学生理解“科研发现到临床应用”的长路径。', 1);
