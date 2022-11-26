import { graphRegistry } from "./GraphRegistry";
import { GraphFunctions, GraphInputType, GraphNode, GraphNodeID, GraphNodeReference, GraphOperation, GraphOutputType, isGraphNode, isGraphNodeReference } from "./GraphTypes";

export enum GraphExecutionState {
    NotStarted,
    Started,
    Finished,
    Error
}

interface GraphNodeState<GFS extends GraphFunctions, Type extends keyof GFS = keyof GFS> {
    node: GraphNode<GFS,Type>;
    status: GraphExecutionState;
    output?: GraphOutputType<GFS[Type]>;
    error?: any;
}

export class GraphExecutor2<GFS extends GraphFunctions> {

    private readonly operations = new Map<GraphNodeID, GraphNodeState<GFS>>();

    constructor(private readonly functions: GFS) {
    }

    public getState(idOrNode: GraphNodeID | GraphNode<GFS>): GraphNodeState<GFS> {
        const id = typeof idOrNode === "string" ? idOrNode : JSON.stringify(idOrNode);
        let state = this.operations.get(id);
        if (state === undefined) {
            const node = typeof idOrNode === "string" ? JSON.parse(idOrNode) as GraphNode<GFS> : idOrNode;
            if (!isGraphNode(node)) {
                throw new Error(`Expected valid GraphNode: ${id}`);
            }
            state = { node, status: GraphExecutionState.NotStarted };
            this.operations.set(id, state);
        }
        return state;
    }

    public create<Type extends keyof GFS>(
        type: Type,
        inputs: {
            [Name in keyof GraphInputType<GFS[Type]>]: GraphOutputType<GFS[Type]> | GraphNode<GFS>
        }
    ): GraphNode<GFS,Type> {
        const node = ({
            type,
            inputs: Object.fromEntries(Object.entries(inputs).map(([key,value]) => [key, isGraphNode(value) ? { reference: JSON.stringify(value) } as GraphNodeReference : value] )) as any
        });
        this.getState(node);
        return node;
    }

    private areAllFinished() {
        return [...this.getOperationsByState(GraphExecutionState.Finished)].length === this.operations.size;
    }

    private *getOperationsByState(state: GraphExecutionState, opstates = this.operations.values()) {
        for (let opstate of opstates) {
            if (opstate.status === state) {
                yield opstate;
            }
        }
    }

    getInputsIfFinished(node: GraphNode<GFS>) {
        let inputs: { [name: string]: any } = {};
        for (let name in node.inputs) {
            let input = node.inputs[name];
            if (isGraphNodeReference(input)) {
                let state = this.getState(input.reference);
                if (state.status === GraphExecutionState.Finished) {
                    inputs[name] = state.output!;
                }
                else {
                    return undefined;
                }
            }
            else {
                inputs[name] = input;
            }
        }
        return inputs;
    }

    public async executeUntilFinished() {
        return new Promise((resolve, reject) => {
            this.executeFrame(resolve, reject);
        });
    }

    /**
     * start execution of all operations which are not awaiting other operations.
     */
    private executeFrame(finished: (value: void) => void, error: (e: any) => void) {
        if (this.areAllFinished()) {
            return finished(undefined);
        }
        for (let opstate of this.getOperationsByState(GraphExecutionState.NotStarted)) {
            const inputs = this.getInputsIfFinished(opstate.node);
            if (inputs) {
                opstate.status = GraphExecutionState.Started;
                console.log("22222Starting: ", { id: JSON.stringify(opstate.node) });
                const handler = this.functions[opstate.node.type];
                handler(inputs)
                    .catch(e => {
                        opstate.status = GraphExecutionState.Error;
                        opstate.error = e;
                        error(e);
                    })
                    .then(result => {
                        console.log("22222Finished: ", { id: JSON.stringify(opstate.node), result });
                        opstate.status = GraphExecutionState.Finished;
                        opstate.output = result!;
                        this.executeFrame(finished, error);
                    })
            }
        }
    }

}