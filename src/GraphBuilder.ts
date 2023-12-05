import { Graph, GraphFunctions, GraphNode, GraphNodeID, GraphNodeInput, GraphNodeOutput, isGraphReference, Simplify, StringKeyOf, ValuesOrReference } from "./GraphTypes";

export class CircularReferenceError extends Error {

    constructor(
        public readonly path: GraphNodeID[],
    ) {
        super(`Circular reference ${path.join(` => `)}`);
    }

}

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

    checkForCircularReferences(currentID: GraphNodeID, path: GraphNodeID[] = [], originalID = currentID) {
        path.push(currentID);
        const current = this.graph[currentID];
        for (const arg of current.input) {
            if (isGraphReference(arg)) {
                const { ref } = arg;
                if (ref === originalID) {
                    throw new CircularReferenceError([...path, ref]);
                }
                this.checkForCircularReferences(ref, path, originalID);
            }
        }
        path.pop();
    }

    build(): Graph<GFS> {
        // check for circular references
        for (const id of Object.keys(this.graph)) {
            this.checkForCircularReferences(id);
        }
        return { ...this.graph };
    }
}
