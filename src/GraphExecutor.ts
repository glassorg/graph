import { Graph, GraphFunctions, GraphNode, GraphNodeID, GraphNodeInput, GraphNodeOutput, isGraphReference, StringKeyOf } from "./GraphTypes";

export enum GraphExecutionNodeState {
    NotStarted = "NotStarted",
    Started = "Started",
    Finished = "Finished",
    Error = "Error",
}

export class GraphExecutionNode<GFS extends GraphFunctions, Type extends StringKeyOf<GFS> = StringKeyOf<GFS>> {
    public id: GraphNodeID;
    public node: GraphNode<GFS, Type>;
    public input?: GraphNodeInput<GFS[Type]>;
    public output?: GraphNodeOutput<GFS[Type]>;
    public error?: Error;
    public state = GraphExecutionNodeState.NotStarted;
    public dependents = new Set<GraphExecutionNode<GFS>>();

    constructor(id: GraphNodeID, node: GraphNode<GFS, Type>) {
        this.id = id;
        this.node = node;
    }
}

/**
 * @returns true if this node is not dependent upon other nodes outputs.
 */
function isIndependent<GFS extends GraphFunctions, Type extends StringKeyOf<GFS> = StringKeyOf<GFS>>(node: GraphNode<GFS,Type>) {
    for (const arg of node.input) {
        if (isGraphReference(arg)) {
            return false;
        }
    }
    return true;
}

export class GraphExecutor<GFS extends GraphFunctions> {

    private readonly nodes = new Map<GraphNodeID, GraphExecutionNode<GFS>>();

    constructor(private readonly functions: GFS, graph: Graph<GFS>) {
        // convert each element in the graph into an execution node
        for (const [id, node] of Object.entries(graph)) {
            this.nodes.set(id, new GraphExecutionNode(id, node));
        }
    }

    /**
     * Updates the execution graph while retaining all previous calculations.
     * This allows a second execution to take place much more quickly.
     */
    public update(graph: Graph<GFS>) {
        //  update or add all new nodes
        for (const [id, node] of Object.entries(graph)) {
            const previous = this.nodes.get(id);
            if (previous) {
                if (JSON.stringify(node) !== JSON.stringify(previous.node)) {
                    previous.node = node;
                    // hard reset this node by deleting the previous inputs.
                    previous.input = undefined;
                }
                previous.state = GraphExecutionNodeState.NotStarted
                previous.dependents.clear();
            }
            else {
                this.nodes.set(id, new GraphExecutionNode(id, node));
            }
        }
        //  delete any missing nodes
        for (const id of this.nodes.keys()) {
            if (!graph[id]) {
                this.nodes.delete(id);
            }
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

    private calculateDependents() {
        for (const [id, node] of this.nodes) {
            for (const arg of node.node.input) {
                if (isGraphReference(arg)) {
                    this.getNode(arg.ref).dependents.add(node);
                }
            }
        }
    }

    /**
     * Returns a promise that will resolve when the entire graph is executed or reject if any node throws.
     */
    public async execute() {
        this.calculateDependents();
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
        for (let node of this.getNodesByState(GraphExecutionNodeState.NotStarted)) {
            const inputs = this.getInputsIfFinished(node.node);
            if (inputs) {
                if (node.input) {
                    // this node did not need to be recalculated.
                    node.state = GraphExecutionNodeState.Finished;
                    continue;
                }

                node.input = inputs;
                node.state = GraphExecutionNodeState.Started;
                const handler = this.functions[node.node.type];
                if (DEBUG) {
                    console.log("Started  " + JSON.stringify(node.node.type));
                }
                handler(...inputs)
                    .then((result) => {
                        // console.log("====> RESULT: " + JSON.stringify(nodeState.operation), result);
                        // if we return a thing.
                        // mark self and any ancestors finished
                        node.output = result;
                        node.state = GraphExecutionNodeState.Finished;
                        // update dependents (only necessary when re-executing an updated graph)
                        for (const dependent of node.dependents) {
                            dependent.node.input.forEach((arg, index) => {
                                if (dependent.input) {
                                    if (isGraphReference(arg) && arg.ref === node.id) {
                                        const changed = JSON.stringify(dependent.input[index]) !== JSON.stringify(node.output);
                                        if (changed) {
                                            // delete the dependent input which forces a new execution since input has changed.
                                            dependent.input = undefined;
                                        }
                                    }
                                }
                            });
                        }
                        if (DEBUG) {
                            console.log("STATE", [...this.nodes.values()].map(o => JSON.stringify(o.node).slice(0, 100) + " ... -> " + o.state));
                            console.log("Finished " + JSON.stringify(node.node.type));
                        }
                        this.executeFrame(finished, error);
                    }, (e) => {
                        if (DEBUG) {
                            console.log("====> ERROR: " + JSON.stringify(node.node.type), e);
                        }
                        node.error = e;
                        node.state = GraphExecutionNodeState.Error;
                        error(e);
                    })
            }
        }
    }

}
