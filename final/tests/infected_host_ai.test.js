const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'static', 'script.js');
const source = fs.readFileSync(sourcePath, 'utf8');

const classList = {
    add() {},
    remove() {},
    toggle() {},
    contains() { return true; }
};

const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    AbortController,
    URLSearchParams,
    fetch: async () => { throw new Error('network disabled in regression test'); },
    alert() {},
    document: {
        addEventListener() {},
        getElementById() { return null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        body: { classList }
    },
    window: {
        addEventListener() {},
        confirm() { return false; },
        location: { hostname: '127.0.0.1' }
    }
});

vm.runInContext(source, context, { filename: sourcePath });

async function run() {
    const survivalModel = vm.runInContext(`(() => {
        gameState.hostPosition = { x: 10, y: 10, layer: 0 };
        gameState.foodItems = [{ id: 'food-bonus-test', x: 10, y: 10, layer: 0 }];
        gameState.foodCollected = 0;
        updateHostStatusUI = () => {};
        createFoodItem = () => null;
        const collected = checkForFoodAtPosition();
        return {
            collected,
            afterOneFood: getInfectionOutcome(),
            sevenFoods: getInfectionOutcome(7),
            eightFoods: getInfectionOutcome(8)
        };
    })()`, context);

    assert.equal(survivalModel.collected, true);
    assert.equal(survivalModel.afterOneFood.hostSurvivalDays, 15.2);
    assert.equal(survivalModel.afterOneFood.infectionDays, 15);
    assert.equal(survivalModel.sevenFoods.survivalMarginDays, 1.4);
    assert.equal(survivalModel.sevenFoods.hostWins, false);
    assert.equal(survivalModel.eightFoods.survivalMarginDays, 1.6);
    assert.equal(survivalModel.eightFoods.hostWins, true);

    const resolvedResults = vm.runInContext(`(() => {
        const resultTypes = [];
        showResult = (resultType) => resultTypes.push(resultType);
        gameState.foodCollected = 7;
        resolveCompletedInfection();
        gameState.foodCollected = 8;
        resolveCompletedInfection();
        return resultTypes;
    })()`, context);

    assert.equal(resolvedResults[0], 'fungus_victory');
    assert.equal(resolvedResults[1], 'host_victory');

    const movement = vm.runInContext(`(() => {
        Object.assign(gameState, {
            currentPhase: 'infection',
            isInfectionMode: true,
            isHostControllable: true,
            isPaused: false,
            hostPosition: { x: 10, y: 10, layer: 0 },
            foodItems: [{ id: 'food-test', x: 30, y: 10, layer: 0 }],
            foodCollected: 0
        });
        updateHostIndicator = () => {};
        updateHostStatusUI = () => {};
        checkForFoodAtPosition = () => false;
        recordInfectedHostAction = () => {};

        const before = { ...gameState.hostPosition };
        const plan = planInfectedRouteToNearestFood(1);
        applyInfectedHostDemoAction(plan[0], buildInfectedHostAISnapshot());
        return { before, after: { ...gameState.hostPosition }, action: plan[0] };
    })()`, context);

    assert.equal(movement.action.action, 'move');
    assert.equal(movement.action.direction, 'right');
    assert.equal(movement.after.x, movement.before.x + 5);
    assert.equal(movement.after.y, movement.before.y);

    const integration = await vm.runInContext(`(async () => {
        autoDemo.active = true;
        autoDemo.token = 7;
        Object.assign(gameState, {
            isInfectionMode: true,
            currentPhase: 'infection',
            isPaused: false,
            simulationTimer: null
        });

        let movementLoopCalls = 0;
        demoSleep = async () => {};
        generateAICommentary = async () => {};
        showAutoDemoCommentaryPlaceholder = () => {};
        setDemoStatus = () => {};
        startInfectionLoop = () => {};
        runInfectedHostAIDemoLoop = async () => {
            movementLoopCalls += 1;
            return 'actions_completed';
        };
        waitForDemoResult = async () => 'finished';

        await runInfectionDemoPhase(7);
        return { movementLoopCalls };
    })()`, context);

    assert.equal(integration.movementLoopCalls, 1);
    console.log('infected host AI regression: passed');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
