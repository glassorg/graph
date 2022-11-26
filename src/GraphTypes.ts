
export type GraphFunction<Input extends { [name: string]: any } = {},Output extends any = any>
    = (input: Input) => Promise<Output>;
export type GraphFunctions = { [name: string]: GraphFunction<any,any> }
export type GraphNodeID = string;
export interface GraphNodeReference {
    reference: GraphNodeID;
}
export function isGraphNodeReference(value: unknown) : value is GraphNodeReference {
    const maybe = value as GraphNodeReference;
    return typeof maybe.reference === "string";
}

export type GraphInputType<F extends GraphFunction> = F extends (input: infer Input) => any ? Input : never;
export type GraphOutputType<F extends GraphFunction> = F extends (input: any) => Promise<infer Output> ? Output : never;
export interface GraphNode<GFS extends GraphFunctions = GraphFunctions, Type extends keyof GFS = keyof GFS> {
    type: Type;
    inputs: { [Name in keyof GraphInputType<GFS[Type]>]: GraphOutputType<GFS[Type]> | GraphNodeReference };
}

export function isGraphNode(value: unknown) : value is GraphNode {
    const maybe = value as GraphNode;
    return typeof maybe.type === "string" && typeof maybe.inputs === "object";
}
