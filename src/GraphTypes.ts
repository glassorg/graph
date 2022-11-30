
//  new typing system.
export type FunctionType<P extends any[],R> = (...p: P) => R;
export type GraphFunction<Input extends any[] = [], Output extends any = any>
    = FunctionType<Input,Promise<Output>>;

export type GraphFunctions = { [name: string]: GraphFunction<any,any> }
export type GraphNodeID = string;
export interface GraphReference {
    reference: GraphNodeID;
}
export function isGraphReference(value: unknown) : value is GraphReference {
    const maybe = value as GraphReference;
    return typeof maybe.reference === "string";
}

export type GraphInputType<GFS extends GraphFunctions, Type extends keyof GFS> = GFS[Type] extends (...input: infer Input) => any ? Input : never;
export type GraphOutputType<GFS extends GraphFunctions, Type extends keyof GFS> = GFS[Type] extends (...input: any) =>
    Promise<infer Output>
    ? (
        Output
        // true extends IsAny<Output>  //  the isAny check is to short-circuit an recursive GraphOperation check.
        // ? Output
        // : Output extends GraphOperation<infer OutputGFS, infer OutputType> ? GraphOutputType<OutputGFS,OutputType> : Output
    )
    : never;

type IfAny<T, Y, N> = 0 extends (1 & T) ? Y : N; 
type IsAny<T> = IfAny<T, true, never>;

export interface GraphOperation<GFS extends GraphFunctions = GraphFunctions, Type extends keyof GFS = keyof GFS> {
    type: Type;
    inputs: GraphInputTypeOrReference<GFS,GraphInputType<GFS,Type>>
}

export type GraphFunctionsOfOutputType<GFS extends GraphFunctions, OutputType> = Pick<GFS, {
    [Key in keyof GFS]: GraphOutputType<GFS,Key> extends OutputType ? Key : never
}[keyof GFS]>;

export type GraphNodeOfOutputType<GFS extends GraphFunctions, OutputType> =
    GraphOperation<GraphFunctionsOfOutputType<GFS, OutputType>>;

export function isGraphOperation(value: unknown) : value is GraphOperation {
    const maybe = value as GraphOperation;
    return typeof maybe.type === "string" && typeof maybe.inputs === "object";
}

export type GraphInputTypeOrNode<GFS extends GraphFunctions, InputType extends any[]> = {
    [Name in keyof InputType]: InputType[Name] | GraphNodeOfOutputType<GFS,InputType[Name]>
}

export type GraphInputTypeOrReference<GFS extends GraphFunctions, InputType extends any[]> = {
    [Name in keyof InputType]: InputType[Name] | GraphReference
}

export function createGraphOperation<GFS extends GraphFunctions, Type extends keyof GFS>(
    type: Type,
    ...inputs: GraphInputTypeOrNode<GFS,GraphInputType<GFS,Type>> & any[]
): GraphOperation<GFS,Type> {
    return { type, inputs };
}

const testTypes1 = {
    parse: async (filename: string, source: string): Promise<string> => {
        return "foo";
    },
    parse_two: async (filename: string, source: string): Promise<string> => {
        return "foo";
    }
}

const testTypes2 = {
    higherOrder: async (filename: string) => {
        return createGraphOperation<typeof testTypes1, "parse">("parse", "foo", "bar");
    }
}

// this should be type string
type ParseOutputType = GraphOutputType<typeof testTypes1, "parse">;
//  this should also be type string
type HigherOrderOutputType = GraphOutputType<typeof testTypes2, "higherOrder">;

