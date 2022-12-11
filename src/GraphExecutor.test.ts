import { strict as assert } from "assert";

import { GraphNodeState, GraphExecutor } from "./GraphExecutor";
import { createGraphFunctions } from "./GraphTypes";

const mathFunctions = createGraphFunctions<{
    add(left: number, right: number): number,
    addBooleans(left: boolean, right: boolean): number,
    negate(value: number): number,
    min(...values: number[]): number,
    minNegate(...values: number[]): number,
    throwError(): number,
    getString(): string,
    subtract(left: number, right: number): number,
}>(op => ({
    add: async (left, right) => left + right,
    addBooleans: async (left, right) => Number(left) + Number(right),
    negate: async (value) => - value,
    min: async (...values) => Math.min(...values),
    minNegate: async (...values) => op("min", ...values.map(value => op("negate", value))),
    throwError: async () => { throw new Error("bad") },
    getString: async () => "string",
    subtract: async (left, right) => op("add", left, op("negate", right))
}));

export async function testExecutor() {
    const x = new GraphExecutor(mathFunctions);
    const op = x.create("add",
        x.create("negate", 1),
        x.create("min", 2, 4, 8, 4, 12)
    );
    const state = x.getNode(op);
    await x.execute();
    assert.equal(state.output, 1);
}

export async function testChildGraph() {
    const x = new GraphExecutor(mathFunctions);
    const op = x.create("subtract", 10, 2);
    const state = x.getNode(op);
    await x.execute();
    assert.equal(state.output, 8);
}

export async function testAddBooleans() {
    const x = new GraphExecutor(mathFunctions);
    const op = x.create("addBooleans", true, false);
    const state = x.getNode(op);
    await x.execute();
    assert.equal(state.output, 1);
}

export async function testError() {
    const x = new GraphExecutor(mathFunctions);
    const op = x.create("throwError");
    const state = x.getNode(op);
    await assert.rejects(x.execute());
    assert.equal(state.state, GraphNodeState.Error);
    assert(state.error instanceof Error && state.error.message === "bad");
}
