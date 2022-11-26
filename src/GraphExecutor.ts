import { GraphFunctions, GraphInputType, GraphNode, GraphNodeID, GraphNodeReference, GraphOutputType, isGraphNode, isGraphNodeReference } from "./GraphTypes";

export enum GraphExecutionState {
    NotStarted,
    Started,
    Finished,
    Error
}

export interface GraphNodeState<GFS extends GraphFunctions, Type extends keyof GFS = keyof GFS> {
    node: GraphNode<GFS,Type>;
    status: GraphExecutionState;
    output?: GraphOutputType<GFS[Type]>;
    error?: any;
}

export class GraphExecutor<GFS extends GraphFunctions> {

    private readonly nodes = new Map<GraphNodeID, GraphNodeState<GFS>>();

    constructor(private readonly functions: GFS) {
    }

    public getState(idOrNode: GraphNodeID | GraphNode<GFS>): GraphNodeState<GFS> {
        const id = typeof idOrNode === "string" ? idOrNode : JSON.stringify(idOrNode);
        let state = this.nodes.get(id);
        if (state === undefined) {
            const node = typeof idOrNode === "string" ? JSON.parse(idOrNode) as GraphNode<GFS> : idOrNode;
            if (!isGraphNode(node)) {
                throw new Error(`Expected valid GraphNode: ${id}`);
            }
            state = { node, status: GraphExecutionState.NotStarted };
            this.nodes.set(id, state);
        }
        return state;
    }

    public setState(node: GraphNode<GFS>, newState: Partial<GraphNodeState<GFS>>) {
        const oldState = this.getState(node);
        Object.assign(oldState, newState);
        const markSuccessorsDirty = JSON.stringify(newState.output) !== JSON.stringify(oldState.output);
        if (markSuccessorsDirty) {
            throw new Error("not yet implemented");
        }
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
        return [...this.getOperationsByState(GraphExecutionState.Finished)].length === this.nodes.size;
    }

    private *getOperationsByState(state: GraphExecutionState, opstates = this.nodes.values()) {
        for (let nodeState of opstates) {
            if (nodeState.status === state) {
                yield nodeState;
            }
        }
    }

    private getInputsIfFinished(node: GraphNode<GFS>) {
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

    /**
     * Returns a promise that will resolve when the entire graph is executed or reject if any node throws.
     */
    public async execute() {
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
        for (let nodeState of this.getOperationsByState(GraphExecutionState.NotStarted)) {
            const inputs = this.getInputsIfFinished(nodeState.node);
            if (inputs) {
                nodeState.status = GraphExecutionState.Started;
                const handler = this.functions[nodeState.node.type];
                handler(inputs)
                    .catch(e => {
                        nodeState.status = GraphExecutionState.Error;
                        nodeState.error = e;
                        error(e);
                    })
                    .then(result => {
                        nodeState.status = GraphExecutionState.Finished;
                        nodeState.output = result!;
                        this.executeFrame(finished, error);
                    })
            }
        }
    }

}