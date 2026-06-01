import { NODE_PORTS } from "@/lib/node-logic/constants";
import type { LogicEdge, LogicNode, LogicWorkflow } from "@/types/workflow";

type PortValueMap = Record<string, boolean | null>;

export type EvaluatedNodeState = {
    value: boolean | null;
    inputValues: PortValueMap;
    outputValues: PortValueMap;
};

export type EvaluationMap = Record<string, EvaluatedNodeState>;

function buildIncomingMap(edges: LogicEdge[]) {
    const map = new Map<string, LogicEdge>();

    for (const edge of edges) {
        map.set(`${edge.to.nodeId}:${edge.to.portId}`, edge);
    }

    return map;
}

export function evaluateWorkflow(workflow: LogicWorkflow): EvaluationMap {
    const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
    const incomingEdges = buildIncomingMap(workflow.edges);
    const memo = new Map<string, EvaluatedNodeState>();
    const visiting = new Set<string>();

    function readNodeOutput(node: LogicNode, portId: string): boolean | null {
        const state = resolveNode(node.id);
        return state.outputValues[portId] ?? null;
    }

    function readInput(nodeId: string, portId: string): boolean | null {
        const edge = incomingEdges.get(`${nodeId}:${portId}`);

        if (!edge) {
            return null;
        }

        const sourceNode = nodes.get(edge.from.nodeId);
        if (!sourceNode) {
            return null;
        }

        return readNodeOutput(sourceNode, edge.from.portId);
    }

    function resolveNode(nodeId: string): EvaluatedNodeState {
        const cached = memo.get(nodeId);
        if (cached) {
            return cached;
        }

        const node = nodes.get(nodeId);
        if (!node) {
            return {
                value: null,
                inputValues: {},
                outputValues: {},
            };
        }

        if (visiting.has(nodeId)) {
            return {
                value: null,
                inputValues: {},
                outputValues: {},
            };
        }

        visiting.add(nodeId);

        const inputValues = Object.fromEntries(
            NODE_PORTS[node.type].inputs.map((port) => [port.id, readInput(node.id, port.id)]),
        );

        let value: boolean | null = null;

        switch (node.type) {
            case "input":
                value = Boolean(node.value);
                break;
            case "and":
                value =
                    inputValues.a === null || inputValues.b === null
                        ? null
                        : Boolean(inputValues.a && inputValues.b);
                break;
            case "or":
                value =
                    inputValues.a === null || inputValues.b === null
                        ? null
                        : Boolean(inputValues.a || inputValues.b);
                break;
            case "xor":
                value =
                    inputValues.a === null || inputValues.b === null
                        ? null
                        : Boolean(inputValues.a !== inputValues.b);
                break;
            case "not":
                value = inputValues.in === null ? null : !inputValues.in;
                break;
            case "nand":
                value =
                    inputValues.a === null || inputValues.b === null
                        ? null
                        : !(inputValues.a && inputValues.b);
                break;
            case "nor":
                value =
                    inputValues.a === null || inputValues.b === null
                        ? null
                        : !(inputValues.a || inputValues.b);
                break;
            case "xnor":
                value =
                    inputValues.a === null || inputValues.b === null
                        ? null
                        : inputValues.a === inputValues.b;
                break;
            case "output":
                value = inputValues.in ?? null;
                break;
        }

        const outputValues = Object.fromEntries(
            NODE_PORTS[node.type].outputs.map((port) => [port.id, value]),
        );

        const resolved = {
            value,
            inputValues,
            outputValues,
        };

        visiting.delete(nodeId);
        memo.set(nodeId, resolved);

        return resolved;
    }

    return Object.fromEntries(workflow.nodes.map((node) => [node.id, resolveNode(node.id)]));
}
