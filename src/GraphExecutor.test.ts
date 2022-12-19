import { strict as assert } from "assert";
import { GraphBuilder } from "./GraphBuilder";
import { GraphExecutionNodeState, GraphExecutor } from "./GraphExecutor";
import { defineGraphFunctions } from "./GraphTypes";

let count = 0;
function inc(value: number) {
    count += value;
    return true;
}

const mathFunctions = defineGraphFunctions({
    add: async (left, right) => (inc(1), left + right),
    negate: async (value) => (inc(10), - value),
    min: async (...values) => (inc(100), Math.min(...values)),
    throwError: async () => { throw new Error("bad") },
});

export async function testExecutor() {
    count = 0;
    const x = new GraphExecutor(mathFunctions, new GraphBuilder<typeof mathFunctions>({})
        .append("a", "negate", 1)
        .append("b", "min", 2, 4, 8, 4, 12)
        .append("c", "add", { ref: "a" }, { ref: "b" })
        .build()
    );
    await x.execute();
    assert.equal(count, 111);
    const state = x.getNode("c");
    assert.equal(state.output, 1);
    // test re-execution
    x.update(new GraphBuilder<typeof mathFunctions>({})
        .append("a", "negate", 1)
        .append("b", "min", 2, 4, 8, 4, 100)
        .append("c", "add", { ref: "a" }, { ref: "b" })
        .build()
    );
    assert.equal(x.getNode("a").state, GraphExecutionNodeState.NotStarted);
    assert.equal(x.getNode("b").state, GraphExecutionNodeState.NotStarted);
    assert.equal(x.getNode("c").state, GraphExecutionNodeState.NotStarted);
    assert(x.getNode("a").input != null);
    assert(x.getNode("b").input == null);
    assert(x.getNode("c").input != null);
    count = 0;
    await x.execute();
    assert.equal(count, 100);
    // do it again with actual changes
    x.update(new GraphBuilder<typeof mathFunctions>({})
        .append("a", "negate", 1)
        .append("b", "min", 2, -1)
        .append("c", "add", { ref: "a" }, { ref: "b" })
        .build()
    );
    count = 0;
    await x.execute();
    assert.equal(count, 101);
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
