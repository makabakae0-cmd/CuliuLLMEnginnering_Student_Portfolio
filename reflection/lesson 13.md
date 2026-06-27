统一项目：

学生个人项目设计团队 Student Project Design Team

统一测试请求：

我想做一个关于“AI 如何影响中学生学习效率”的两周学习项目。
最后要完成一份 800 字报告和 5 分钟展示。
请帮我设计研究问题、证据使用方式和两周行动计划。

学生 Baseline：

01_base_repo/Lesson13_student_project_team_demo/

本节核心问题：

多个 Agent 同时工作且结果存在依赖、缺失或冲突时，MainAgent 如何组织协作并证明最终决定可靠？

本节最小闭环：

MainAgent Intake
       |
      Fork
     /    \
Research  Planner Phase 1
     \    /
      Join
       |
Planner Phase 2 / Merge
       |
    Reviewer
       |
MainAgent Decision
  |       |        |
accept  revise  fallback / stop