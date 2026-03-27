# Fungi Project Week 01 总结（进展与失败）

## 本周目标
- 完成 fungi demo 的最小可展示版本（MVP）。
- 明确课堂演示定位：从“完整对抗游戏”收敛到“感染阶段解说器”。
- 做出可运行、可截图、可讲解的前端页面。

## 本周进展
- 完成了 demo 主页面重构：
  - 重新设计了首屏信息架构（MVP、Prompt 建议、课堂验证、非必要功能）。
  - 统一了视觉风格（深色背景 + 金色强调 + 信息卡布局），更接近课堂展示稿。
- 保留并打通了原有核心交互：
  - `player-side`、`host-type`、`environment-type`、`fungus-type` 等输入项仍可用。
  - `startGame()` 与后续游戏区逻辑未破坏，脚本继续可运行。
- 解决了本地演示可访问问题：
  - 使用 `python3 -m http.server 5500` 启动本地服务。
  - 确认页面与静态资源均返回 `200`，可通过 `http://localhost:5500/` 访问。

## 本周失败 / 问题
- 路径管理失败：
  - 最初误在仓库目录中查找 `final/`，导致定位错误，耽误了时间。
  - 实际 demo 在 `/Users/zhongmeier/Documents/fungi/final`，与当前项目仓库分离。
- 启动认知偏差：
  - 一开始直接访问 `localhost`，未先确认本地服务是否启动，出现 `ERR_CONNECTION_REFUSED`。
- 协作链路不顺：
  - 需求与文件路径没有一次性说清，来回确认成本较高。

## 复盘
- 做得好的：
  - 需求落地速度快，页面改版和逻辑兼容同时完成。
  - 问题定位后执行果断，能在短时间恢复可演示状态。
- 需要改进的：
  - 任何改动前先确认“真实工作目录 + 启动方式 + 访问 URL”。
  - 把“演示环境检查清单”写成固定流程，减少低级错误。

## 下周计划
- 把“感染阶段解说器”做成明确输入输出链路：
  - 输入：`fungus_type`, `host_type`, `day`, `symptoms`
  - 输出：`stage_name`, `biology_explanation`, `host_behavior_change`, `teaching_point`, `safety_note`
- 新增 2-3 组 few-shot 示例，稳定输出结构与课堂语气。
- 准备课堂验证样本（早期/中期/异常输入）并记录评估结果。
