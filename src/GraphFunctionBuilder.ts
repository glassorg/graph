// import { GraphFunctions, GraphInputTypesOrOperations, GraphInputType, GraphOperation, Simplify, GraphFunction, CreateOperation, GraphOutputType } from "./GraphTypes";

// export class GraphFunctionBuilder<GFS extends GraphFunctions> {

//     constructor(private functions: GFS = {} as GFS) {
//     }

//     /**
//      * Returns a GraphOperation which represents a call to a previously defined GraphFunction.
//      */
//     private create<Type extends keyof GFS>(
//         type: Type,
//         ...inputs: GraphInputTypesOrOperations<GFS, GraphInputType<GFS, Type>> & any[]
//     ): GraphOperation<Simplify<Pick<Simplify<GFS>, Type>>, Type> {
//         return { type, inputs } as GraphOperation<Pick<GFS, Type>, Type>;
//     }

//     /**
//      * Defines a new simple GraphFunction.
//      */
//     private defineSimple<Type extends Exclude<string, keyof GFS>, Input extends any[], Output>(type: Type, func: GraphFunction<Input, Output>): GraphFunctionBuilder<Simplify<GFS & {
//         [keyof in Type]: GraphFunction<Input, Output>;
//     }>> {
//         this.functions[type as keyof GFS] = func as any;
//         return this as any;
//     }

//     /**
//      * Defines a higher order GraphFunction that relies on previously defined operations.
//      */
//     public define<Type extends Exclude<string, keyof GFS>, Input extends any[], Output>(
//         type: Type & (Type extends keyof GFS ? never : Type),
//         callback: (call: CreateOperation<GFS>) => GraphFunction<Input, Output>
//     ) {
//         return this.defineSimple(type, callback(this.create));
//     }

//     build(): GFS {
//         return this.functions;
//     }

// }
