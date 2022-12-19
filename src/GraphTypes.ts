
//  Immutable values which can be JSON.stringified into a structurally unique string.

export type Simplify<T> = T extends Object ? { [K in keyof T]: T[K] } : T;
export type StringKeyOf<T> = keyof T extends string ? keyof T : never;

export type FunctionType<P extends unknown[],R> = (...p: P) => R;
export type GraphFunctionID = string;
export type GraphFunction<
    Input extends any[] = any[],
    Output = any
> = FunctionType<Input, Promise<Output>>;
export type GraphFunctions = { [name: GraphFunctionID]: GraphFunction };

export type GraphNodeInput<T> = T extends GraphFunction<infer Input, infer Output> ? Input : never;
export type GraphNodeOutput<T> = T extends GraphFunction<infer Input, infer Output> ? Output : never;

export type GraphNodeID = string;
export type GraphReference<ID extends GraphNodeID = GraphNodeID> = { ref: ID };
export type GraphInput = any;

export function isGraphReference(value: unknown) : value is GraphReference {
    const maybe = value as GraphReference | undefined; 
    return typeof maybe?.ref === "string";
}

export type GraphNode<GFS extends GraphFunctions, Type extends StringKeyOf<GFS> = StringKeyOf<GFS>>
    = GraphNodeByTypeAndFunction<Type, GFS[Type]>;

export type GraphNodeByTypeAndFunction<Type extends string, GF extends GraphFunction> = {
    type: Type;
    input: GraphInput[] & { [Index in keyof GraphNodeInput<GF>]: GraphNodeInput<GF>[Index] | GraphReference };
}
export type Graph<GFS extends GraphFunctions> = { [id: GraphNodeID]: GraphNode<GFS, StringKeyOf<GFS>> };

export type StringKeysOfType<A,T> = ({ [Key in keyof A]: A[Key] extends T ? (Key extends string ? Key : never) : never })[keyof A];

export type ValuesOrReference<A extends unknown[],G extends { [name: GraphNodeID]: any }>
    = unknown[] & { [Key in keyof A]: A[Key] | GraphReference<StringKeysOfType<G,A[Key]>> }

export function defineGraphFunctions<GF extends GraphFunctions>(gf: GF): GF {
    return gf;
}
