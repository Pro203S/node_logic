import {
    NODE_HEADER_HEIGHT,
    NODE_PORT_SPACING,
    NODE_PORT_START,
    NODE_PORTS,
    NODE_WIDTH,
} from "@/lib/node-logic/constants";
import type { LogicNode, LogicNodeType, LogicPortKind, LogicWorkflow } from "@/types/workflow";

export function createId(prefix: string) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getNodeHeight(nodeType: LogicNodeType) {
    const portCount = Math.max(
        NODE_PORTS[nodeType].inputs.length,
        NODE_PORTS[nodeType].outputs.length,
        1,
    );
    return NODE_PORT_START + NODE_PORT_SPACING * portCount + 26;
}

export function createNode(type: LogicNodeType, nodeCount: number): LogicNode {
    const baseX = 340 + (nodeCount % 4) * 280;
    const baseY = 120 + Math.floor(nodeCount / 4) * 180;

    return {
        id: createId("node"),
        type,
        label: `${type.toUpperCase()} ${nodeCount + 1}`,
        position: {
            x: baseX,
            y: baseY,
        },
        value: type === "input" ? false : undefined,
    };
}

export function createWorkflow(name: string): LogicWorkflow {
    return {
        id: createId("workflow"),
        name,
        nodes: [
            {
                id: createId("node"),
                type: "input",
                label: "INPUT 1",
                position: { x: 360, y: 160 },
                value: false,
            },
            {
                id: createId("node"),
                type: "output",
                label: "OUTPUT 1",
                position: { x: 920, y: 220 },
            },
        ],
        edges: [],
        updatedAt: new Date().toISOString(),
    };
}

export function getPortPosition(node: LogicNode, portId: string, kind: LogicPortKind) {
    const ports =
        kind === "input" ? NODE_PORTS[node.type].inputs : NODE_PORTS[node.type].outputs;
    const portIndex = ports.findIndex((port) => port.id === portId);
    const index = portIndex >= 0 ? portIndex : 0;

    return {
        x: node.position.x + (kind === "input" ? 0 : NODE_WIDTH),
        y: node.position.y + NODE_PORT_START + index * NODE_PORT_SPACING,
    };
}

export function getNodeBounds(node: LogicNode) {
    return {
        x: node.position.x,
        y: node.position.y,
        width: NODE_WIDTH,
        height: getNodeHeight(node.type),
        headerHeight: NODE_HEADER_HEIGHT,
    };
}
