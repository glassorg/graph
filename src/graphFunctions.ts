import { GraphFunctions, GraphOperation, GraphOperationDescriptorOfOutputType, GraphOperationTypeID, GraphOperationTypeMap, GraphOutputReference, GraphTypeMap, isGraphOperation } from "./GraphTypes";

export function graphOperation<GOTID extends GraphOperationTypeID>(
    type: GOTID,
    inputs: {
        [Name in keyof GraphOperationTypeMap[GOTID]["inputs"]]:
            GraphTypeMap[GraphOperationTypeMap[GOTID]["inputs"][Name]] |
            // GraphOutputReference |
            GraphOperation<GraphOperationDescriptorOfOutputType<GraphOperationTypeMap[GOTID]["inputs"][Name]>>
    }
): GraphOperation<GraphOperationTypeMap[GOTID]> {
    return ({
        type,
        inputs: Object.fromEntries(Object.entries(inputs).map(([key,value]) => [key, isGraphOperation(value) ? { reference: JSON.stringify(value) } : value] ))
    }) as GraphOperation<GraphOperationTypeMap[GOTID]>;
}

// export function graphNode<GFS extends GraphFunctions, >(
//     type: GOTID,
//     inputs: {
//         [Name in keyof GraphOperationTypeMap[GOTID]["inputs"]]:
//             GraphTypeMap[GraphOperationTypeMap[GOTID]["inputs"][Name]] |
//             // GraphOutputReference |
//             GraphOperation<GraphOperationDescriptorOfOutputType<GraphOperationTypeMap[GOTID]["inputs"][Name]>>
//     }
// ): GraphOperation<GraphOperationTypeMap[GOTID]> {
//     return ({
//         type,
//         inputs: Object.fromEntries(Object.entries(inputs).map(([key,value]) => [key, isGraphOperation(value) ? { reference: JSON.stringify(value) } : value] ))
//     }) as GraphOperation<GraphOperationTypeMap[GOTID]>;
// }