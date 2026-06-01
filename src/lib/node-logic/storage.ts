"use client";

import { WORKFLOW_STORAGE_KEY } from "@/lib/node-logic/constants";
import { createWorkflow } from "@/lib/node-logic/utils";
import type { WorkflowStore } from "@/types/workflow";

function createDefaultStore(): WorkflowStore {
    const initialWorkflow = createWorkflow("Workflow 1");

    return {
        activeWorkflowId: initialWorkflow.id,
        workflows: [initialWorkflow],
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
        if (!parsed.workflows.length) {
            return createDefaultStore();
        }

        return parsed;
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
