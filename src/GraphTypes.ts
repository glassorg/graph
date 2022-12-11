
//  new typing system.
// type JSONValue = string | number | boolean | JSONValue[] | { [name: string]: JSONValue };

type FunctionType<P extends unknown[],R> = (...p: P) => R;
export type GraphFunction<Input extends unknown[], Output extends any = any> = FunctionType<Input,Promise<Output>>;

export type GraphFunctions = { [name: string]: GraphFunction<any,any> }
export type GraphNodeID = string;
export interface GraphReference {
    reference: GraphNodeID;
}
export function isGraphReference(value: unknown) : value is GraphReference {
    const maybe = value as GraphReference | undefined; 
    return typeof maybe?.reference === "string";
}

export type Simplify<T> = T extends Object ? { [K in keyof T]: T[K] } : T;

export type GraphInputType<GFS extends GraphFunctions, Type extends keyof GFS> = GFS[Type] extends (...input: infer Input) => any ? Input : never;
export type GraphOutputType<GFS extends GraphFunctions, Type extends keyof GFS> = GFS[Type] extends (...input: any) =>
    Promise<infer Output>
    ? (
        true extends IsAny<Output>  //  the isAny check is to short-circuit an recursive GraphOperation check.
        ? Output
        : Output extends GraphOperation<infer OutputGFS, infer OutputType> ? GraphOutputType<OutputGFS,OutputType> : Output
    )
    : never;

type IfAny<T, Y, N> = 0 extends (1 & T) ? Y : N; 
type IsAny<T> = IfAny<T, true, never>;

export interface GraphOperation<
    GFS extends GraphFunctions = GraphFunctions,
    Type extends keyof GFS = keyof GFS,
    OutputType = GraphOutputType<GFS,Type>
> {
    type: Type;
    inputs: GraphInputTypeOrReference<GraphInputType<GFS,Type>>
}

export type GraphFunctionsOfOutputType<GFS extends GraphFunctions, OutputType> = Pick<GFS, {
    [Key in keyof GFS]: GraphOutputType<GFS,Key> extends OutputType ? Key : never
}[keyof GFS]>;

export type GraphOperationOfOutputType<GFS extends GraphFunctions, OutputType> =
    GraphOperation<GraphFunctionsOfOutputType<GFS, OutputType>>;

export function isGraphOperation(value: unknown) : value is GraphOperation {
    const maybe = value as GraphOperation | undefined;
    return maybe != null && typeof maybe.type === "string" && typeof maybe.inputs === "object";
}

export type GraphInputTypesOrOperations<GFS extends GraphFunctions, InputType extends any[]> = {
    [Name in keyof InputType]: InputType[Name] | GraphOperationOfOutputType<GFS,InputType[Name]>
} & any[];

export type GraphOperationByTypeAndFunc<Type, Func> = Func extends GraphFunction<infer Input, infer Output> ? {
    type: Type,
    inputs: GraphInputTypeOrReference<Input>
} : never;

export type GraphInputTypeOrReference<InputType extends any[]> = {
    [Name in keyof InputType]: InputType[Name] | GraphReference
}

export type CreateOperation<GFS extends GraphFunctions> = 
    <Type extends keyof GFS>(
        type: Type,
        ...inputs: GraphInputTypesOrOperations<GFS,GraphInputType<GFS,Type>> & any[]
    ) => GraphOperation<Simplify<Pick<Simplify<GFS>,Type>>,Type>

export type GraphFunctionReturnType<GF> = GF extends GraphFunction<infer Input, infer Output> ? Output : never;

type Values<T> = T[keyof T];

type GraphOperations<GFS extends GraphFunctions> = Simplify<Values<{
    [Key in keyof GFS]: GraphOperationByTypeAndFunc<Key, GFS[Key]>
}>>

type ExtendReturn<Func,AddReturn> = Func extends GraphFunction<infer Input, infer Output> ? GraphFunction<Input, Output | AddReturn> : never;
type GraphFunctionImplementations<GFS extends GraphFunctions> = {
    [Key in keyof GFS]: ExtendReturn<
        GFS[Key],
        GraphOperations<GraphFunctionsOfOutputType<GFS, GraphFunctionReturnType<GFS[Key]>>>
    >
}

type ToPromiseFunctions<GFS> = {
    [Key in keyof GFS]: GFS[Key] extends FunctionType<infer I, infer O> ? FunctionType<I,Promise<O>> : never
}

export function createGraphFunctions<GFS extends { [name in keyof GFS]: FunctionType<any[],any> }>(callback: (op: CreateOperation<ToPromiseFunctions<GFS>>) => GraphFunctionImplementations<ToPromiseFunctions<GFS>>): ToPromiseFunctions<GFS> {
    return callback(
        <Type extends keyof GFS>(type: Type, ...inputs: GraphInputTypesOrOperations<ToPromiseFunctions<GFS>, GraphInputType<ToPromiseFunctions<GFS>, Type>>): any => {
            return { type, inputs } as GraphOperationByTypeAndFunc<Type, ToPromiseFunctions<GFS>[Type]>;
        }
    ) as unknown as ToPromiseFunctions<GFS>;
}

// test create graph functions
createGraphFunctions<{
    add(left: number, right: number): number,
    negate(value: number): number,
    subtract(left: number, right: number): number,
}>(op => ({
    add: async (left, right) => left + right,
    negate: async (value) => - value,
    subtract: async (left, right) => op("add", left, op("negate", right))
}));

