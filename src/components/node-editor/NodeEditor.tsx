"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { NODE_PORTS } from "@/lib/node-logic/constants";
import { evaluateWorkflow } from "@/lib/node-logic/logic";
import { loadWorkflowStore, saveWorkflowStore } from "@/lib/node-logic/storage";
import {
    createId,
    createNode,
    createWorkflow,
    getNodeBounds,
    getPortPosition,
} from "@/lib/node-logic/utils";
import type {
    LogicNode,
    LogicPortDefinition,
    LogicPortKind,
    LogicWorkflow,
    WorkflowStore,
} from "@/types/workflow";
import styles from "./NodeEditor.module.css";

type PendingConnection = {
    nodeId: string;
    portId: string;
};

type DragState = {
    nodeId: string;
    offsetX: number;
    offsetY: number;
};

const NODE_TYPE_ORDER = ["input", "and", "or", "output"] as const;

function formatValue(value: boolean | null) {
    if (value === null) {
        return "UNSET";
    }

    return value ? "TRUE" : "FALSE";
}

function getPortClassName(kind: LogicPortKind, isActive: boolean) {
    const base =
        kind === "input"
            ? `${styles.port} ${styles.portInput}`
            : `${styles.port} ${styles.portOutput}`;

    return isActive ? `${base} ${styles.portActive}` : base;
}

export function NodeEditor() {
    const [store, setStore] = useState<WorkflowStore | null>(null);
    const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);

    useEffect(() => {
        setStore(loadWorkflowStore());
    }, []);

    const persistStore = useEffectEvent((nextStore: WorkflowStore) => {
        saveWorkflowStore(nextStore);
    });

    useEffect(() => {
        if (store) {
            persistStore(store);
        }
    }, [persistStore, store]);

    const activeWorkflow = useMemo(() => {
        if (!store) {
            return null;
        }

        return (
            store.workflows.find((workflow) => workflow.id === store.activeWorkflowId) ??
            store.workflows[0] ??
            null
        );
    }, [store]);

    const evaluation = useMemo(() => {
        return activeWorkflow ? evaluateWorkflow(activeWorkflow) : {};
    }, [activeWorkflow]);

    useEffect(() => {
        if (!dragState) {
            return;
        }

        const activeDrag = dragState;

        function handlePointerMove(event: PointerEvent) {
            setStore((currentStore) => {
                if (!currentStore) {
                    return currentStore;
                }

                return {
                    ...currentStore,
                    workflows: currentStore.workflows.map((workflow) =>
                        workflow.id !== currentStore.activeWorkflowId
                            ? workflow
                            : {
                                  ...workflow,
                                  updatedAt: new Date().toISOString(),
                                  nodes: workflow.nodes.map((node) =>
                                      node.id !== activeDrag.nodeId
                                          ? node
                                          : {
                                                ...node,
                                                position: {
                                                    x: event.clientX - activeDrag.offsetX,
                                                    y: event.clientY - activeDrag.offsetY,
                                                },
                                            },
                                  ),
                              },
                    ),
                };
            });
        }

        function handlePointerUp() {
            setDragState(null);
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [dragState]);

    if (!store || !activeWorkflow) {
        return <div className={styles.loading}>Loading editor...</div>;
    }

    const currentStore = store;

    function updateWorkflow(updater: (workflow: LogicWorkflow) => LogicWorkflow) {
        setStore((currentStore) => {
            if (!currentStore) {
                return currentStore;
            }

            return {
                ...currentStore,
                workflows: currentStore.workflows.map((workflow) =>
                    workflow.id === currentStore.activeWorkflowId ? updater(workflow) : workflow,
                ),
            };
        });
    }

    function addNode(type: (typeof NODE_TYPE_ORDER)[number]) {
        updateWorkflow((workflow) => ({
            ...workflow,
            updatedAt: new Date().toISOString(),
            nodes: [...workflow.nodes, createNode(type, workflow.nodes.length)],
        }));
    }

    function createNewWorkflow() {
        const workflow = createWorkflow(`Workflow ${currentStore.workflows.length + 1}`);
        setStore({
            activeWorkflowId: workflow.id,
            workflows: [...currentStore.workflows, workflow],
        });
        setPendingConnection(null);
    }

    function deleteCurrentWorkflow() {
        if (currentStore.workflows.length === 1) {
            const workflow = createWorkflow("Workflow 1");
            setStore({
                activeWorkflowId: workflow.id,
                workflows: [workflow],
            });
            setPendingConnection(null);
            return;
        }

        const remaining = currentStore.workflows.filter(
            (workflow) => workflow.id !== currentStore.activeWorkflowId,
        );
        setStore({
            activeWorkflowId: remaining[0].id,
            workflows: remaining,
        });
        setPendingConnection(null);
    }

    function toggleInputNode(nodeId: string) {
        updateWorkflow((workflow) => ({
            ...workflow,
            updatedAt: new Date().toISOString(),
            nodes: workflow.nodes.map((node) =>
                node.id === nodeId && node.type === "input"
                    ? { ...node, value: !node.value }
                    : node,
            ),
        }));
    }

    function removeNode(nodeId: string) {
        updateWorkflow((workflow) => ({
            ...workflow,
            updatedAt: new Date().toISOString(),
            nodes: workflow.nodes.filter((node) => node.id !== nodeId),
            edges: workflow.edges.filter(
                (edge) => edge.from.nodeId !== nodeId && edge.to.nodeId !== nodeId,
            ),
        }));
        setPendingConnection((current) => (current?.nodeId === nodeId ? null : current));
    }

    function startDrag(event: React.PointerEvent<HTMLDivElement>, node: LogicNode) {
        const target = event.target as HTMLElement;
        if (target.closest(`button, input, [data-port="true"]`)) {
            return;
        }

        setDragState({
            nodeId: node.id,
            offsetX: event.clientX - node.position.x,
            offsetY: event.clientY - node.position.y,
        });
    }

    function connectToInput(nodeId: string, portId: string) {
        if (!pendingConnection || pendingConnection.nodeId === nodeId) {
            return;
        }

        updateWorkflow((workflow) => ({
            ...workflow,
            updatedAt: new Date().toISOString(),
            edges: [
                ...workflow.edges.filter(
                    (edge) => !(edge.to.nodeId === nodeId && edge.to.portId === portId),
                ),
                {
                    id: createId("edge"),
                    from: pendingConnection,
                    to: { nodeId, portId },
                },
            ],
        }));
        setPendingConnection(null);
    }

    function updateNodeLabel(nodeId: string, label: string) {
        updateWorkflow((workflow) => ({
            ...workflow,
            updatedAt: new Date().toISOString(),
            nodes: workflow.nodes.map((node) =>
                node.id === nodeId ? { ...node, label } : node,
            ),
        }));
    }

    function updateWorkflowName(name: string) {
        updateWorkflow((workflow) => ({
            ...workflow,
            name,
            updatedAt: new Date().toISOString(),
        }));
    }

    function removeEdge(edgeId: string) {
        updateWorkflow((workflow) => ({
            ...workflow,
            updatedAt: new Date().toISOString(),
            edges: workflow.edges.filter((edge) => edge.id !== edgeId),
        }));
    }

    function renderPort(
        node: LogicNode,
        port: LogicPortDefinition,
        kind: LogicPortKind,
        value: boolean | null,
    ) {
        const isSelected =
            kind === "output" &&
            pendingConnection?.nodeId === node.id &&
            pendingConnection.portId === port.id;

        const onClick =
            kind === "output"
                ? () =>
                      setPendingConnection((current) =>
                          current?.nodeId === node.id && current.portId === port.id
                              ? null
                              : { nodeId: node.id, portId: port.id },
                      )
                : () => connectToInput(node.id, port.id);

        return (
            <button
                key={port.id}
                type="button"
                data-port="true"
                className={styles.portRow}
                onClick={onClick}
            >
                <span className={kind === "input" ? styles.portMetaLeft : styles.portMetaRight}>
                    {kind === "input" ? (
                        <>
                            <span className={getPortClassName(kind, isSelected)} />
                            <span>{port.label}</span>
                        </>
                    ) : (
                        <>
                            <span>{port.label}</span>
                            <span className={getPortClassName(kind, isSelected)} />
                        </>
                    )}
                </span>
                <span className={value === null ? styles.portValueMuted : styles.portValue}>
                    {formatValue(value)}
                </span>
            </button>
        );
    }

    return (
        <main className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.panel}>
                    <p className={styles.eyebrow}>Workflow</p>
                    <input
                        className={styles.workflowName}
                        value={activeWorkflow.name}
                        onChange={(event) => updateWorkflowName(event.target.value)}
                        placeholder="Workflow name"
                    />
                    <div className={styles.workflowActions}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={createNewWorkflow}
                        >
                            New
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={deleteCurrentWorkflow}
                        >
                            Delete
                        </button>
                    </div>
                </div>

                <div className={styles.panel}>
                    <p className={styles.eyebrow}>Saved Workflows</p>
                    <div className={styles.workflowList}>
                        {currentStore.workflows.map((workflow) => (
                            <button
                                key={workflow.id}
                                type="button"
                                className={
                                    workflow.id === activeWorkflow.id
                                        ? `${styles.workflowCard} ${styles.workflowCardActive}`
                                        : styles.workflowCard
                                }
                                onClick={() => {
                                    setStore({
                                        ...currentStore,
                                        activeWorkflowId: workflow.id,
                                    });
                                    setPendingConnection(null);
                                }}
                            >
                                <span>{workflow.name}</span>
                                <span className={styles.workflowMeta}>
                                    {workflow.nodes.length} nodes / {workflow.edges.length} edges
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.panel}>
                    <p className={styles.eyebrow}>Add Node</p>
                    <div className={styles.nodeTypeGrid}>
                        {NODE_TYPE_ORDER.map((type) => (
                            <button
                                key={type}
                                type="button"
                                className={styles.addNodeButton}
                                onClick={() => addNode(type)}
                            >
                                <span>{type.toUpperCase()}</span>
                                <span className={styles.buttonMeta}>
                                    {NODE_PORTS[type].description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            <section className={styles.workspaceSection}>
                <div className={styles.workspaceHeader}>
                    <div>
                        <h1>Node Logic Builder</h1>
                        <p>
                            왼쪽 포트는 INPUT, 오른쪽 포트는 OUTPUT이다. OUTPUT을 누른 뒤
                            INPUT을 눌러 연결한다.
                        </p>
                    </div>
                    <div className={styles.legend}>
                        <span>Autosave: localStorage</span>
                        <span>Double click wire to delete</span>
                    </div>
                </div>

                <div className={styles.workspace}>
                    <svg
                        className={styles.edges}
                        viewBox="0 0 1600 900"
                        preserveAspectRatio="none"
                    >
                        {activeWorkflow.edges.map((edge) => {
                            const sourceNode = activeWorkflow.nodes.find(
                                (node) => node.id === edge.from.nodeId,
                            );
                            const targetNode = activeWorkflow.nodes.find(
                                (node) => node.id === edge.to.nodeId,
                            );

                            if (!sourceNode || !targetNode) {
                                return null;
                            }

                            const source = getPortPosition(sourceNode, edge.from.portId, "output");
                            const target = getPortPosition(targetNode, edge.to.portId, "input");
                            const controlOffset = Math.max(
                                80,
                                (target.x - source.x) * 0.45,
                            );
                            const path = `M ${source.x} ${source.y} C ${source.x + controlOffset} ${source.y}, ${target.x - controlOffset} ${target.y}, ${target.x} ${target.y}`;
                            const isHot =
                                evaluation[sourceNode.id]?.outputValues[edge.from.portId] === true;

                            return (
                                <path
                                    key={edge.id}
                                    d={path}
                                    className={isHot ? styles.edgeHot : styles.edge}
                                    onDoubleClick={() => removeEdge(edge.id)}
                                />
                            );
                        })}
                    </svg>

                    {activeWorkflow.nodes.map((node) => {
                        const nodeState = evaluation[node.id];
                        const bounds = getNodeBounds(node);

                        return (
                            <div
                                key={node.id}
                                className={styles.node}
                                onPointerDown={(event) => startDrag(event, node)}
                                style={{
                                    left: node.position.x,
                                    top: node.position.y,
                                    width: bounds.width,
                                    minHeight: bounds.height,
                                    borderColor: NODE_PORTS[node.type].accent,
                                }}
                            >
                                <div className={styles.nodeHeader}>
                                    <div>
                                        <p className={styles.nodeType}>{node.type.toUpperCase()}</p>
                                        <input
                                            className={styles.nodeLabel}
                                            value={node.label}
                                            onChange={(event) =>
                                                updateNodeLabel(node.id, event.target.value)
                                            }
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.iconButton}
                                        onClick={() => removeNode(node.id)}
                                    >
                                        x
                                    </button>
                                </div>

                                <div className={styles.nodeBody}>
                                    <div className={styles.portColumn}>
                                        {NODE_PORTS[node.type].inputs.length ? (
                                            NODE_PORTS[node.type].inputs.map((port) =>
                                                renderPort(
                                                    node,
                                                    port,
                                                    "input",
                                                    nodeState?.inputValues[port.id] ?? null,
                                                ),
                                            )
                                        ) : (
                                            <div className={styles.emptyPorts}>No INPUT</div>
                                        )}
                                    </div>

                                    <div className={styles.nodeCenter}>
                                        <span className={styles.resultPill}>
                                            {formatValue(nodeState?.value ?? null)}
                                        </span>
                                        {node.type === "input" ? (
                                            <button
                                                type="button"
                                                className={
                                                    node.value
                                                        ? `${styles.valueToggle} ${styles.valueToggleActive}`
                                                        : styles.valueToggle
                                                }
                                                onClick={() => toggleInputNode(node.id)}
                                            >
                                                {node.value ? "TRUE" : "FALSE"}
                                            </button>
                                        ) : (
                                            <p className={styles.nodeDescription}>
                                                {NODE_PORTS[node.type].description}
                                            </p>
                                        )}
                                    </div>

                                    <div className={styles.portColumn}>
                                        {NODE_PORTS[node.type].outputs.length ? (
                                            NODE_PORTS[node.type].outputs.map((port) =>
                                                renderPort(
                                                    node,
                                                    port,
                                                    "output",
                                                    nodeState?.outputValues[port.id] ?? null,
                                                ),
                                            )
                                        ) : (
                                            <div className={styles.emptyPorts}>No OUTPUT</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
