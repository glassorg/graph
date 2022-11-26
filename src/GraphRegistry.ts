import type { GraphExecutor } from "./GraphExecutor";
import { GraphOperationDescriptor, GraphOperationTypeID, GraphOperationTypeMap, GraphTypeMap } from "./GraphTypes";

type GraphOperationHandlerInput<GOD extends GraphOperationDescriptor> = { [Name in keyof GOD["inputs"]]: GraphTypeMap[GOD["inputs"][Name]] };
type GraphOperationHandlerOutput<GOD extends GraphOperationDescriptor> = GraphTypeMap[GOD["output"]];

type GraphOperationHandler<GOD extends GraphOperationDescriptor> = (input: GraphOperationHandlerInput<GOD>, executor: GraphExecutor) => Promise<GraphOperationHandlerOutput<GOD>>;

class GraphRegistry {

    operationDescriptors = new Map<GraphOperationTypeID, GraphOperationDescriptor>();
    operationHandlers = new Map<GraphOperationTypeID, GraphOperationHandler<GraphOperationDescriptor>>();

    registerOperationType<OpTypeID extends GraphOperationTypeID, GOD extends GraphOperationDescriptor>(type: OpTypeID, descriptor: GOD): GOD {
        this.operationDescriptors.set(type, descriptor);
        return descriptor;
    }

    getOperationType<OpTypeID extends GraphOperationTypeID>(type: OpTypeID): GraphOperationTypeMap[GraphOperationTypeID] {
        return this.operationDescriptors.get(type) as GraphOperationTypeMap[GraphOperationTypeID];
    }

    registerOperationHandler<OpTypeID extends GraphOperationTypeID>(type: OpTypeID, handler: GraphOperationHandler<GraphOperationTypeMap[OpTypeID]>) {
        this.operationHandlers.set(type, handler as unknown as GraphOperationHandler<GraphOperationDescriptor>);
    }

    getOperationHandler<OpTypeID extends GraphOperationTypeID>(type: OpTypeID): GraphOperationHandler<GraphOperationTypeMap[OpTypeID]> {
        return this.operationHandlers.get(type) as unknown as GraphOperationHandler<GraphOperationTypeMap[OpTypeID]>;
    }

}

export const graphRegistry = new GraphRegistry();
