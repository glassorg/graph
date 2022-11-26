
export interface GraphTypeMap {
}

export type GraphType = keyof GraphTypeMap;

export interface GraphOperationDescriptor {
    inputs: { [name: string]: GraphType };
    output: GraphType;
}

// can we do this... with just the type of an async function?

export interface GraphOperationTypeMap extends Record<string,GraphOperationDescriptor> {
}

export type GraphOperationTypeID = keyof GraphOperationTypeMap;

export type GraphOperationID = string;

export interface GraphOutputReference {
    reference: GraphOperationID;
}

export function isGraphReference(value: unknown) : value is GraphOutputReference {
    const maybe = value as GraphOutputReference;
    return typeof maybe.reference === "string";
}

export interface GraphOperation<GOD extends GraphOperationDescriptor = GraphOperationDescriptor> {
    type: GraphOperationTypeID;
    inputs: { [Name in keyof GOD["inputs"]]: GraphTypeMap[GOD["inputs"][Name]] | GraphOutputReference };
}

export function isGraphOperation(value: unknown) : value is GraphOperation<GraphOperationDescriptor> {
    const maybe = value as GraphOperation<GraphOperationDescriptor>;
    return typeof maybe.type === "string" && typeof maybe.inputs === "object";
}

type FilterByValueType<Base,ValueType> = Pick<Base, {
    [Key in keyof Base]: ValueType extends Base[Key] ? Key : never
}[keyof Base]>;

type KeysWithValueType<Base,ValueType> = keyof FilterByValueType<Base,ValueType>;

export type GraphOperationTypeOfOutputType<OutputType extends GraphType> = KeysWithValueType<GraphOperationTypeMap, OutputType>; 

export type GraphOperationDescriptorOfOutputType<OutputType extends GraphType> = GraphOperationTypeMap[GraphOperationTypeOfOutputType<OutputType>];

//  new typing system.
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
