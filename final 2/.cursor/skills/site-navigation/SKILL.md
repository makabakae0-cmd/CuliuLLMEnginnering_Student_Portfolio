---
name: site-navigation
description: Explains and helps maintain the Fungi Simulator site navigation and page-section module. Use when discussing, testing, or modifying the home, setup, RAG QA, or game sections, nav links, mobile navigation, scroll behavior, or active section highlighting.
---

# Site Navigation

## When To Use

Use this skill when the user mentions:

- 页面板块, navigation, navbar, mobile menu, or section switching.
- 首页, 游戏配置, RAG 问答, 游戏面板.
- `NAV_SECTION_IDS`, `navigateToSection()`, or active nav highlighting.
- Adding, hiding, or reordering top-level sections.

## Core Concept

Site navigation maps nav triggers to page sections and keeps the active link aligned with scroll position.

Flow:

1. `initSiteNavigation()` binds desktop/mobile nav triggers.
2. `navigateToSection()` scrolls to the target section and guards hidden game sections.
3. `setActiveNavLink()` marks links matching the current section.
4. `updateActiveNavLink()` tracks visible sections during scroll and resize.
5. `closeMobileNav()` resets the mobile panel after navigation.

## Key Files

- `index.html`: nav links, mobile panel, top-level sections.
- `static/script.js`: navigation section ids and navigation helpers.
- `static/style.css`: nav, mobile menu, and section layout styles.
- `handler.js`: machine-readable anchors and validation for this module.

## Work Rules

Before changing this feature, read `handler.js` and validate its anchors after editing.

Keep these invariants:

- Every `data-nav-target` should point to a real top-level section.
- Hidden `game-section` should redirect users back to setup instead of scrolling to an empty panel.
- Desktop and mobile links should share the same target ids.
- Mobile navigation should close after selecting a section.
- `NAV_SECTION_IDS` should stay in the same order as the page flow.
