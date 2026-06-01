"use client";

import { NODE_PORTS, WORKFLOW_STORAGE_KEY } from "@/lib/node-logic/constants";
import { createWorkflow } from "@/lib/node-logic/utils";
import type { LogicNode, LogicWorkflow, WorkflowStore } from "@/types/workflow";

function createDefaultStore(): WorkflowStore {
    return {
        workflow: createWorkflow("Workflow 1"),
    };
}

function sanitizeWorkflow(workflow: LogicWorkflow): LogicWorkflow {
    const nodes = workflow.nodes.filter((node): node is LogicNode => node.type in NODE_PORTS);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = workflow.edges.filter((edge) => {
        if (!nodeIds.has(edge.from.nodeId) || !nodeIds.has(edge.to.nodeId)) {
            return false;
        }

        const sourceNode = nodes.find((node) => node.id === edge.from.nodeId);
        const targetNode = nodes.find((node) => node.id === edge.to.nodeId);

        if (!sourceNode || !targetNode) {
            return false;
        }

        const hasSourcePort = NODE_PORTS[sourceNode.type].outputs.some(
            (port) => port.id === edge.from.portId,
        );
        const hasTargetPort = NODE_PORTS[targetNode.type].inputs.some(
            (port) => port.id === edge.to.portId,
        );

        return hasSourcePort && hasTargetPort;
    });

    return {
        ...workflow,
        nodes,
        edges,
    };
}

export function loadWorkflowStore(): WorkflowStore {
    if (typeof window === "undefined") {
        return createDefaultStore();
    }

    const stored = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!stored) {
        return createDefaultStore();
    }

    try {
        const parsed = JSON.parse(stored) as WorkflowStore;
        if ("workflow" in parsed && parsed.workflow) {
            return {
                workflow: sanitizeWorkflow(parsed.workflow),
            };
        }

        return {
            workflow: createDefaultStore().workflow,
        };
    } catch {
        return createDefaultStore();
    }
}

export function saveWorkflowStore(store: WorkflowStore) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(store));
}
