const fs = require('fs');
const path = require('path');

const feature = {
    name: 'site-navigation',
    keyFiles: ['index.html', 'static/script.js', 'static/style.css'],
    domIds: ['home-section', 'setup-section', 'rag-qa-section', 'game-section', 'nav-toggle', 'nav-mobile-panel', 'nav-scroll-top'],
    dataTargets: ['home-section', 'setup-section', 'rag-qa-section', 'game-section'],
    functions: ['initSiteNavigation', 'navigateToSection', 'closeMobileNav', 'setActiveNavLink', 'updateActiveNavLink'],
    constants: ['NAV_SECTION_IDS'],
    styleClasses: ['site-nav', 'nav-mobile-panel', 'home-section', 'setup-section', 'rag-qa-section', 'game-section'],
    pipeline: [
        { id: 'bind', reads: ['nav links', 'data-nav-target'], writes: ['click handlers'], requires: ['initSiteNavigation'], produces: ['interactive nav'] },
        { id: 'resolve-target', reads: ['click target', 'hash'], writes: ['section id'], requires: ['NAV_SECTION_IDS'], produces: ['valid section target'] },
        { id: 'navigate', reads: ['section id'], writes: ['scroll position', 'visible section'], requires: ['navigateToSection'], produces: ['target section visible'] },
        { id: 'active-state', reads: ['scroll position', 'section ids'], writes: ['active nav link'], requires: ['setActiveNavLink', 'updateActiveNavLink'], produces: ['correct active state'] }
    ],
    minimalState: ['NAV_SECTION_IDS', 'nav link elements', 'target section ids', 'mobile panel open state', 'active nav link'],
    inputs: ['click target', 'hash target', 'section DOM'],
    outputs: ['active section', 'scroll position', 'mobile panel state', 'scroll top visibility'],
    validations: [
        { id: 'symbols-exist', category: 'existence', checks: ['keyFiles', 'domIds', 'dataTargets', 'functions', 'constants', 'styleClasses'] },
        { id: 'nav-io', category: 'io', checks: ['data-nav-target to section id'] },
        { id: 'section-boundary', category: 'boundary', checks: ['hidden game redirects to setup', 'targets exist'] },
        { id: 'mobile-fallback', category: 'fallback', checks: ['mobile nav closes after selection'] },
        { id: 'active-result', category: 'result', checks: ['NAV_SECTION_IDS page order'] }
    ],
    fallbacks: ['redirect hidden game-section to setup-section', 'close mobile nav after selection'],
    invariants: [
        'Every data-nav-target should point to a real top-level section.',
        'Hidden game-section should redirect to setup-section.',
        'Desktop and mobile nav should share section ids.',
        'Mobile navigation should close after selecting a section.',
        'NAV_SECTION_IDS should match page-flow order.'
    ]
};

function readProjectFile(root, filePath) {
    const absolutePath = path.join(root, filePath);
    return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;
}

function pushMissing(missing, file, anchor, type) {
    missing.push({ file, anchor, type });
}

function validateProject(root = process.cwd()) {
    const missing = [];
    const files = {};

    feature.keyFiles.forEach((file) => {
        const content = readProjectFile(root, file);
        if (content === null) {
            pushMissing(missing, file, file, 'file');
        } else {
            files[file] = content;
        }
    });

    feature.domIds.forEach((id) => {
        if (!files['index.html'] || !files['index.html'].includes(`id="${id}"`)) {
            pushMissing(missing, 'index.html', id, 'domId');
        }
    });

    feature.dataTargets.forEach((target) => {
        if (!files['index.html'] || !files['index.html'].includes(`data-nav-target="${target}"`)) {
            pushMissing(missing, 'index.html', target, 'dataNavTarget');
        }
    });

    feature.functions.forEach((name) => {
        const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
        if (!files['static/script.js'] || !pattern.test(files['static/script.js'])) {
            pushMissing(missing, 'static/script.js', name, 'function');
        }
    });

    feature.constants.forEach((name) => {
        if (!files['static/script.js'] || !files['static/script.js'].includes(name)) {
            pushMissing(missing, 'static/script.js', name, 'constant');
        }
    });

    feature.styleClasses.forEach((className) => {
        if (!files['static/style.css'] || !files['static/style.css'].includes(`.${className}`)) {
            pushMissing(missing, 'static/style.css', className, 'styleClass');
        }
    });

    return {
        ok: missing.length === 0,
        feature: feature.name,
        missing
    };
}

if (require.main === module) {
    const result = validateProject(process.cwd());
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
}

module.exports = { feature, validateProject };
