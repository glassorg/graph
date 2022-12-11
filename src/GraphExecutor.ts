import { GraphFunctions, GraphInputType, GraphOperation, GraphNodeID, GraphOperationOfOutputType, GraphReference, GraphOutputType, isGraphOperation, isGraphReference, GraphInputTypesOrOperations } from "./GraphTypes";

export enum GraphNodeState {
    NotStarted = "NotStarted",
    Started = "Started",
    Finished = "Finished",
    Error = "Error"
}

export interface GraphNode<GFS extends GraphFunctions, Type extends keyof GFS = keyof GFS> {
    operation: GraphOperation<GFS,Type>;
    state: GraphNodeState;
    output?: GraphOutputType<GFS,Type>;
    error?: any;
    // if there is a child, we defer to that.
    child?: GraphNode<GFS>;
    parent?: GraphNode<GFS>;
}


process.on("unhandledRejection", (reason, promise) => {
    console.log("!!!!!!!!!!!! unhandledRejection", {reason, promise});
});

export class GraphExecutor<GFS extends GraphFunctions> {

    private readonly nodes = new Map<GraphNodeID, GraphNode<GFS>>();

    constructor(private readonly functions: GFS) {
    }

    public getNode(idOrOp: GraphNodeID | GraphOperation<GFS>): GraphNode<GFS> {
        const id = typeof idOrOp === "string" ? idOrOp : JSON.stringify(idOrOp);
        let state = this.nodes.get(id);
        if (state === undefined) {
            const node = typeof idOrOp === "string" ? JSON.parse(idOrOp) as GraphOperation<GFS> : idOrOp;
            if (!isGraphOperation(node)) {
                throw new Error(`Expected valid GraphNode: ${id}`);
            }
            state = { operation: node, state: GraphNodeState.NotStarted };
            this.nodes.set(id, state);
        }
        return state;
    }

    public setNode(operation: GraphOperation<GFS>, newState: Partial<GraphNode<GFS>>) {
        const oldState = this.getNode(operation);
        Object.assign(oldState, newState);
        const markSuccessorsDirty = JSON.stringify(newState.output) !== JSON.stringify(oldState.output);
        if (markSuccessorsDirty) {
            throw new Error("not yet implemented");
        }
    }

    public create<Type extends keyof GFS>(
        type: Type,
        ...inputs: GraphInputTypesOrOperations<GFS,GraphInputType<GFS,Type>> & any[]
    ): GraphOperation<GFS,Type> {
        const node = ({
            type,
            inputs: (inputs as any).map((value: any) => {
                if (isGraphOperation(value)) {
                    let reference = JSON.stringify(this.create(value.type, ...value.inputs as any));
                    return { reference }
                }
                else {
                    return value;
                }
            })
        });
        this.getNode(node);
        return node;
    }

    private areAllFinished() {
        return this.getNodesByState(GraphNodeState.Finished).length === this.nodes.size;
    }

    public getNodesByState<State extends GraphNodeState>(state: State): GraphNode<GFS>[] {
        return [...this.nodes.values()].filter(node => node.state === state);
    }

    private getInputsIfFinished(node: GraphOperation<GFS>) {
        let inputs: any[] = [];
        for (let input of node.inputs as any[]) {
            if (isGraphReference(input)) {
                let state = this.getNode(input.reference);
                if (state.state === GraphNodeState.Finished) {
                    inputs.push(state.output!);
                }
                else {
                    return undefined;
                }
            }
            else {
                inputs.push(input);
            }
        }
        return inputs;
    }

    /**
     * Returns a promise that will resolve when the entire graph is executed or reject if any node throws.
     */
    public async execute() {
        return new Promise<boolean>((resolve, reject) => {
            this.executeFrame(resolve, reject);
        });
    }

    /**
     * start execution of all operations which are not awaiting other operations.
     */
    private async executeFrame(finished: (value: boolean) => void, error: (e: any) => void) {
        let DEBUG = true;
        if (this.areAllFinished()) {
            return finished(true);
        }
        for (let nodeState of this.getNodesByState(GraphNodeState.NotStarted)) {
            const inputs = this.getInputsIfFinished(nodeState.operation);
            if (inputs) {
                nodeState.state = GraphNodeState.Started;
                const handler = this.functions[nodeState.operation.type];
                if (DEBUG) {
                    console.log("Started  " + JSON.stringify(nodeState.operation.type));
                }
                handler(...inputs)
                    .then((result) => {
                        // console.log("====> RESULT: " + JSON.stringify(nodeState.operation), result);
                        // if we return a thing.
                        if (isGraphOperation(result)) {
                            // this becomes a child node.
                            let childOperation = this.create(result.type, ...result.inputs as any);
                            let childNode = this.getNode(childOperation);
                            // bond parent to child
                            childNode.parent = nodeState;
                            nodeState.child = childNode;
                        }
                        else {
                            // mark self and any ancestors finished
                            for (let selfOrAncestor: GraphNode<GFS> | undefined = nodeState; selfOrAncestor != null; selfOrAncestor = selfOrAncestor.parent) {
                                selfOrAncestor.state = GraphNodeState.Finished;
                                selfOrAncestor.output = result!;
                            }
                        }
                        if (DEBUG) {
                            console.log("STATE", [...this.nodes.values()].map(o => String(o.operation.type) + " -> " + o.state));
                            console.log("Finished " + JSON.stringify(nodeState.operation.type));
                        }
                        this.executeFrame(finished, error);
                    }, (e) => {
                        if (DEBUG) {
                            console.log("====> ERROR: " + JSON.stringify(nodeState.operation.type), e);
                        }
                        nodeState.state = GraphNodeState.Error;
                        nodeState.error = e;
                        error(e);
                    })
            }
        }
    }

}