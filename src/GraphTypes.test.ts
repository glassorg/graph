import { GraphBuilder } from "./GraphBuilder";
import { defineGraphFunctions, GraphFunctions } from "./GraphTypes";

const graphFunctions = {
    add: async (left: number, right: number) => left + right,
    subtract: async (left: number, right: number) => left - right,
    negate: async (value: number) => - value
} satisfies GraphFunctions;

const builder = new GraphBuilder<typeof graphFunctions>({});
const builder2 = builder.append("a", "add", 1, 2);
const builder3 = builder2.append("b", "negate", { ref: "a" });
const builder4 = builder3.append("c", "subtract", { ref: "b" }, { ref: "a" });
