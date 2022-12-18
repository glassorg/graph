import { Graph, GraphFunctions, GraphNode, GraphNodeID, GraphNodeInput, GraphNodeOutput, isGraphReference, StringKeyOf } from "./GraphTypes2";

export enum GraphExecutionNodeState {
    NotStarted = "NotStarted",
    Started = "Started",
    Finished = "Finished",
    Error = "Error"
}

export class GraphExecutionNode<GFS extends GraphFunctions, Type extends StringKeyOf<GFS> = StringKeyOf<GFS>> {
    public readonly node: GraphNode<GFS, Type>;
    public input?: GraphNodeInput<GFS[Type]>;
    public output?: GraphNodeOutput<GFS[Type]>;
    public error?: Error;

    constructor(node: GraphNode<GFS, Type>) {
        this.node = node;
    }

    get state() {
        if (this.output) {
            return GraphExecutionNodeState.Finished;
        }
        if (this.error) {
            return GraphExecutionNodeState.Error;
        }
        if (this.input) {
            return GraphExecutionNodeState.Started;
        }
        return GraphExecutionNodeState.NotStarted;
    }
}

export class GraphExecutor<GFS extends GraphFunctions> {

    private readonly nodes = new Map<GraphNodeID, GraphExecutionNode<GFS>>();

    constructor(private readonly functions: GFS, graph: Graph<GFS>) {
        // convert each element in the graph into an execution node
        for (const [id, node] of Object.entries(graph)) {
            this.nodes.set(id, new GraphExecutionNode(node));
        }
    }

    public getNode(id: GraphNodeID) {
        return this.nodes.get(id)!;
    }

    private areAllFinished() {
        return this.getNodesByState(GraphExecutionNodeState.Finished).length === this.nodes.size;
    }

    public getNodesByState(state: GraphExecutionNodeState): GraphExecutionNode<GFS>[] {
        return [...this.nodes.values()].filter(node => node.state === state);
    }

    private getInputsIfFinished<Type extends StringKeyOf<GFS>>(node: GraphNode<GFS,Type>): GraphNodeInput<GFS[Type]> | undefined {
        let inputs: any[] = [];
        for (let input of node.input as any[]) {
            if (isGraphReference(input)) {
                let node = this.nodes.get(input.ref)!;
                if (node.state === GraphExecutionNodeState.Finished) {
                    inputs.push(node.output!);
                }
                else {
                    return undefined;
                }
            }
            else {
                inputs.push(input);
            }
        }
        return inputs as GraphNodeInput<GFS[Type]>;
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
        for (let nodeState of this.getNodesByState(GraphExecutionNodeState.NotStarted)) {
            const inputs = this.getInputsIfFinished(nodeState.node);
            if (inputs) {
                nodeState.input = inputs;
                const handler = this.functions[nodeState.node.type];
                if (DEBUG) {
                    console.log("Started  " + JSON.stringify(nodeState.node.type));
                }
                handler(...inputs)
                    .then((result) => {
                        // console.log("====> RESULT: " + JSON.stringify(nodeState.operation), result);
                        // if we return a thing.
                        // mark self and any ancestors finished
                        nodeState.output = result;
                        if (DEBUG) {
                            console.log("STATE", [...this.nodes.values()].map(o => JSON.stringify(o.node).slice(0, 100) + " ... -> " + o.state));
                            console.log("Finished " + JSON.stringify(nodeState.node.type));
                        }
                        this.executeFrame(finished, error);
                    }, (e) => {
                        if (DEBUG) {
                            console.log("====> ERROR: " + JSON.stringify(nodeState.node.type), e);
                        }
                        nodeState.error = e;
                        error(e);
                    })
            }
        }
    }

}
