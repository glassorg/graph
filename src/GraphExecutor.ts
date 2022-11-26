import { graphRegistry } from "./GraphRegistry";
import { GraphOperation, GraphOperationDescriptor, GraphOperationID, GraphTypeMap, isGraphReference } from "./GraphTypes";

export enum GraphExecutionState {
    NotStarted,
    Started,
    Finished,
    Error
}

interface GraphOperationState<GOD extends GraphOperationDescriptor = GraphOperationDescriptor> {
    operation: GraphOperation<GOD>;
    status: GraphExecutionState;
    output?: GraphTypeMap[GOD["output"]];
    error?: any;
}

export class GraphExecutor {

    public readonly operations = new Map<GraphOperationID, GraphOperationState>();

    get(id: GraphOperationID, create: true): GraphOperationState
    get(id: GraphOperationID, create?: false): GraphOperationState | undefined
    get(id: GraphOperationID, create = false): GraphOperationState | undefined {
        let state = this.operations.get(id);
        if (create && state === undefined) {
            state = this.add(JSON.parse(id));
        }
        return state;
    }

    has(id: GraphOperationID) {
        return this.get(id) !== undefined;
    }

    add(operation: GraphOperation): GraphOperationState {
        const id = JSON.stringify(operation);
        let state = this.operations.get(id);
        if (state === undefined) {
            this.operations.set(id, state = { operation, status: GraphExecutionState.NotStarted });
        }
        return state;
    }

    private areAllFinished() {
        return [...this.getOperationsByState(GraphExecutionState.Finished)].length === this.operations.size;
    }

    private getPredecessors(operation: GraphOperation): GraphOperationState[] {
        let result: GraphOperationState[] = [];
        for (let name in operation.inputs) {
            let input = operation.inputs[name];
            if (isGraphReference(input)) {
                result.push(this.get(input.reference, true));
            }
        }
        return result;
    }

    private *getOperationsByState(state: GraphExecutionState, opstates = this.operations.values()) {
        for (let opstate of opstates) {
            if (opstate.status === state) {
                yield opstate;
            }
        }
    }

    getInputsIfFinished(operation: GraphOperation) {
        let inputs: { [name: string]: any } = {};
        for (let name in operation.inputs) {
            let input = operation.inputs[name];
            if (isGraphReference(input)) {
                debugger;
                let state = this.get(input.reference, true);
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
            const inputs = this.getInputsIfFinished(opstate.operation);
            if (inputs) {
                opstate.status = GraphExecutionState.Started;
                console.log("Starting: ", { id: JSON.stringify(opstate.operation) });
                const handler = graphRegistry.getOperationHandler(opstate.operation.type);
                handler(inputs, this)
                    .catch(e => {
                        opstate.status = GraphExecutionState.Error;
                        opstate.error = e;
                        error(e);
                    })
                    .then(result => {
                        console.log("Finished: ", { id: JSON.stringify(opstate.operation), result });
                        opstate.status = GraphExecutionState.Finished;
                        opstate.output = result!;
                        this.executeFrame(finished, error);
                    })
            }
        }
    }

}