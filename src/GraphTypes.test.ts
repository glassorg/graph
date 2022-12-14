import { GraphBuilder } from "./GraphBuilder";
import { defineGraphFunctions } from "./GraphTypes";

class Foo {    
}

const graphFunctions = defineGraphFunctions({
    add: async (left: number, right: number) => left + right,
    subtract: async (left: number, right: number) => left - right,
    negate: async (value: number) => - value,
    foo: async (left: number, right: number): Promise<Foo[]> => {
        return [];
    }
});

const builder = new GraphBuilder<typeof graphFunctions>({});
const builder2 = builder.append("a", "add", 1, 2);
const builder3 = builder2.append("b", "negate", { ref: "a" });
const builder4 = builder3.append("c", "subtract", { ref: "b" }, { ref: "a" });
const builder5 = builder4.append("d", "foo", 1, 2);
