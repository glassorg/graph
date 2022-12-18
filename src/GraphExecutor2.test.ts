import { strict as assert } from "assert";
import { GraphBuilder } from "./GraphBuilder";
import { GraphExecutionNodeState, GraphExecutor } from "./GraphExecutor2";
import { defineGraphFunctions } from "./GraphTypes2";

const mathFunctions = defineGraphFunctions({
    add: async (left, right) => left + right,
    addBooleans: async (left, right) => Number(left) + Number(right),
    negate: async (value) => - value,
    min: async (...values) => Math.min(...values),
    throwError: async () => { throw new Error("bad") },
    getString: async () => "string",
    subtract: async (left, right) => left - right
});

export async function testExecutor() {
    const graph = new GraphBuilder<typeof mathFunctions>({})
        .append("a", "negate", 1)
        .append("b", "min", 2, 4, 8, 4, 12)
        .append("c", "add", { ref: "a" }, { ref: "b" })
        .build();
    
    const x = new GraphExecutor(mathFunctions, graph);
    await x.execute();
    const state = x.getNode("c");
    assert.equal(state.output, 1);
}

export async function testError() {
    const graph = new GraphBuilder<typeof mathFunctions>({})
        .append("a", "throwError")
        .build();

    const x = new GraphExecutor(mathFunctions, graph);
    await assert.rejects(x.execute());
    const node = x.getNode("a");
    assert.equal(node.state, GraphExecutionNodeState.Error);
    assert(node.error instanceof Error && node.error.message === "bad");
}
