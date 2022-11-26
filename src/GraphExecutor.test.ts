// import { strict as assert } from "assert";

// import { GraphCoreTypes } from "./GraphCoreTypes";
// import { GraphExecutor } from "./GraphExecutor";
// import { graphOperation } from "./graphFunctions";
// import { graphRegistry } from "./GraphRegistry";

// enum MathOperationTypes {
//     Add = "Add",
//     Negate = "Negate",
//     ThrowError = "ThrowError",
// }

// const add = graphRegistry.registerOperationType(MathOperationTypes.Add, {
//     inputs: { left: GraphCoreTypes.Number, right: GraphCoreTypes.Number },
//     output: GraphCoreTypes.Number
// })

// const negate = graphRegistry.registerOperationType(MathOperationTypes.Negate, {
//     inputs: { value: GraphCoreTypes.Number },
//     output: GraphCoreTypes.Number
// })

// const throwError = graphRegistry.registerOperationType(MathOperationTypes.ThrowError, {
//     inputs: { },
//     output: GraphCoreTypes.Number
// })

// graphRegistry.registerOperationHandler(MathOperationTypes.Add, async ({ left, right }) => {
//     return left + right;
// })

// graphRegistry.registerOperationHandler(MathOperationTypes.Negate, async ({ value }) => {
//     return - value;
// })

// graphRegistry.registerOperationHandler(MathOperationTypes.ThrowError, async ({}) => {
//     throw new Error("bad");
// })

// declare module "./GraphTypes" {
//     export interface GraphOperationTypeMap {
//         [MathOperationTypes.Add]: typeof add;
//         [MathOperationTypes.Negate]: typeof negate;
//         [MathOperationTypes.ThrowError]: typeof throwError;
//     }
// }

// export async function testExecutor() {
//     const op = graphOperation(MathOperationTypes.Add, {
//         left: graphOperation(MathOperationTypes.Negate, { value: 1 }),
//         right: 2
//     });

//     const executor = new GraphExecutor();
//     const state = executor.add(op);
//     await executor.executeUntilFinished();
//     assert.equal(state.output, 1);
// }

// export async function testError() {
//     const op = graphOperation(MathOperationTypes.ThrowError, {});

//     const executor = new GraphExecutor();
//     const state = executor.add(op);
//     await assert.rejects(executor.executeUntilFinished());
//     assert(state.error instanceof Error && state.error.message === "bad");
// }
