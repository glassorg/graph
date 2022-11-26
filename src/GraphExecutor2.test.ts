import { strict as assert } from "assert";

import { GraphExecutor2 } from "./GraphExecutor2";

const mathFunctions = {
    async add({ left, right }: { left: number, right: number}) { return left + right; },
    async negate({ value }: { value: number }) { return - value; },
    async throwError({}: {}) { throw new Error("bad"); },
}

export async function testExecutor2() {
    const x = new GraphExecutor2(mathFunctions);
    const op = x.create("add", {
        left: x.create("negate", { value: 1 }),
        right: 2
    });

    const state = x.getState(op);
    await x.executeUntilFinished();
    assert.equal(state.output, 1);
}

export async function testError() {
    const x = new GraphExecutor2(mathFunctions);
    const op = x.create("throwError", {});
    const state = x.getState(op);
    await assert.rejects(x.executeUntilFinished());
    assert(state.error instanceof Error && state.error.message === "bad");
}
