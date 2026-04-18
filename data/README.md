# Fungi Knowledge DB

## Files
- `fungi_knowledge.db`: SQLite knowledge database
- `fungi_knowledge_seed.sql`: schema + seed script
- `science_facts.json`: science facts export
- `teaching_stage_guides.json`: stage teaching guide export
- `myth_clarifications.json`: myth/correction export

## Tables
- `science_facts`: 科普事实库（12条）
- `teaching_stage_guides`: 结构化讲解阶段库（13条）
- `myth_clarifications`: 课堂误区澄清库（5条）

## Quick check
```bash
sqlite3 data/fungi_knowledge.db ".tables"
sqlite3 data/fungi_knowledge.db "SELECT COUNT(*) FROM science_facts;"
```
