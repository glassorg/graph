import { Graph, GraphFunctions, GraphNodeID, GraphNodeInput, GraphNodeOutput, Simplify, StringKeyOf, ValuesOrReference } from "./GraphTypes";

export class GraphBuilder<GFS extends GraphFunctions, G extends { [name: GraphNodeID]: any; } = {}> {
    constructor(private readonly graph: Graph<GFS>) {
    }

    append<Type extends StringKeyOf<GFS>, ID extends GraphNodeID>(
        id: ID,
        type: Type,
        ...input: ValuesOrReference<GraphNodeInput<GFS[Type]>, G>
    ): GraphBuilder<GFS, Simplify<G & {
        [I in ID]: GraphNodeOutput<GFS[Type]>;
    }>> {
        if (this.graph[id]) {
            throw new Error(`Graph node already exists: ${id}`);
        }
        (this.graph as any)[id] = { type, input };
        return this as unknown as GraphBuilder<GFS, Simplify<G & {
            [I in ID]: GraphNodeOutput<GFS[Type]>;
        }>>;
    }

    build(): Graph<GFS> {
        //  TODO: Check for circular graph dependencies and throw error if found.
        return { ...this.graph };
    }
}
