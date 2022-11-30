// import { strict as assert } from "assert";

// import { GraphNodeState, GraphExecutor } from "./GraphExecutor";
// import { createGraphOperation, GraphOutputType } from "./GraphTypes";

// const mathFunctions = {
//     async add(left: number, right: number) { return left + right; },
//     async addBooleans(left: boolean, right: boolean): Promise<number> { return Number(left) + Number(right); },
//     async negate(value: number) { return - value; },
//     async subtract(this, left: number, right: number) {
//         //  operations can create child operations that it delegates it's result to.
//         //  we don't get type checking when creating internal operations.
//         //  I'm OK with that since not sure there's a way to do it which avoids circular dependencies.
//         return createGraphOperation("add", left, createGraphOperation("negate", right));
//     },
//     async throwError(): Promise<string> { throw new Error("bad"); },
// }

// // type CoreType = GraphOutputType<

// export async function testExecutor() {
//     const x = new GraphExecutor(mathFunctions);
//     const op = x.create("add",
//         x.create("negate", 1),
//         2
//     );
//     const state = x.getNode(op);
//     await x.execute();
//     assert.equal(state.output, 1);
// }

// export async function testChildGraph() {
//     const x = new GraphExecutor(mathFunctions);
//     const op = x.create("subtract", 10, 2);
//     const state = x.getNode(op);
//     await x.execute();
//     assert.equal(state.output, 8);
// }

// export async function testAddBooleans() {
//     const x = new GraphExecutor(mathFunctions);
//     const op = x.create("addBooleans", true, false);
//     const state = x.getNode(op);
//     await x.execute();
//     assert.equal(state.output, 1);
// }

// export async function testError() {
//     const x = new GraphExecutor(mathFunctions);
//     const op = x.create("throwError");
//     const state = x.getNode(op);
//     await assert.rejects(x.execute());
//     assert.equal(state.state, GraphNodeState.Error);
//     assert(state.error instanceof Error && state.error.message === "bad");
// }
