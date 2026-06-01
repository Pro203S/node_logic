"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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
    LogicNodeType,
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

const NODE_TYPE_ORDER: LogicNodeType[] = [
    "input",
    "output",
    "and",
    "or",
    "xor",
    "not",
    "nand",
    "nor",
    "xnor",
];

const CANVAS_WIDTH = 2200;
const CANVAS_HEIGHT = 1400;
const CANVAS_PADDING = 240;

function formatValue(value: boolean | null) {
    if (value === null) {
        return "UNSET";
    }

    return value ? "TRUE" : "FALSE";
}

function getPortClassName(kind: LogicPortKind, isActive: boolean) {
    const base =
        kind === "input"
            ? `${styles.portHandle} ${styles.portHandleInput}`
            : `${styles.portHandle} ${styles.portHandleOutput}`;

    return isActive ? `${base} ${styles.portHandleActive}` : base;
}

export function NodeEditor() {
    const [store, setStore] = useState<WorkflowStore | null>(null);
    const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);
    const importInputRef = useRef<HTMLInputElement | null>(null);

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

    const activeWorkflow = useMemo(() => store?.workflow ?? null, [store]);

    const evaluation = useMemo(() => {
        return activeWorkflow ? evaluateWorkflow(activeWorkflow) : {};
    }, [activeWorkflow]);

    const canvasSize = useMemo(() => {
        if (!activeWorkflow) {
            return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
        }

        const maxWidth = activeWorkflow.nodes.reduce((currentMax, node) => {
            const bounds = getNodeBounds(node);
            return Math.max(currentMax, node.position.x + bounds.width + CANVAS_PADDING);
        }, CANVAS_WIDTH);

        const maxHeight = activeWorkflow.nodes.reduce((currentMax, node) => {
            const bounds = getNodeBounds(node);
            return Math.max(currentMax, node.position.y + bounds.height + CANVAS_PADDING);
        }, CANVAS_HEIGHT);

        return {
            width: maxWidth,
            height: maxHeight,
        };
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
                    workflow: {
                        ...currentStore.workflow,
                        updatedAt: new Date().toISOString(),
                        nodes: currentStore.workflow.nodes.map((node) =>
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

    const currentWorkflow = activeWorkflow;

    function updateWorkflow(updater: (workflow: LogicWorkflow) => LogicWorkflow) {
        setStore((nextStore) => {
            if (!nextStore) {
                return nextStore;
            }

            return {
                ...nextStore,
                workflow: updater(nextStore.workflow),
            };
        });
    }

    function addNode(type: LogicNodeType) {
        updateWorkflow((workflow) => ({
            ...workflow,
            updatedAt: new Date().toISOString(),
            nodes: [...workflow.nodes, createNode(type, workflow.nodes.length)],
        }));
    }

    function createNewWorkflow() {
        setStore({
            workflow: createWorkflow(currentWorkflow.name),
        });
        setPendingConnection(null);
    }

    function deleteCurrentWorkflow() {
        setStore({
            workflow: createWorkflow(currentWorkflow.name),
        });
        setPendingConnection(null);
    }

    function updateWorkflowName(name: string) {
        updateWorkflow((workflow) => ({
            ...workflow,
            name,
            updatedAt: new Date().toISOString(),
        }));
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

    function removeEdge(edgeId: string) {
        updateWorkflow((workflow) => ({
            ...workflow,
            updatedAt: new Date().toISOString(),
            edges: workflow.edges.filter((edge) => edge.id !== edgeId),
        }));
    }

    function exportWorkflow() {
        const payload = JSON.stringify(activeWorkflow, null, 2);
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${currentWorkflow.name || "workflow"}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function importWorkflow(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result)) as LogicWorkflow;
                setStore({
                    workflow: {
                        ...createWorkflow(parsed.name || "Workflow 1"),
                        ...parsed,
                    },
                });
                setPendingConnection(null);
            } catch {
                window.alert("Invalid workflow JSON");
            } finally {
                event.target.value = "";
            }
        };
        reader.readAsText(file);
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
                className={
                    kind === "input"
                        ? `${styles.portRow} ${styles.portRowInput}`
                        : `${styles.portRow} ${styles.portRowOutput}`
                }
                onClick={onClick}
            >
                <span className={getPortClassName(kind, isSelected)} />
                <span className={styles.portLabel}>{port.label}</span>
                <span className={value === null ? styles.portValueMuted : styles.portValue}>
                    {formatValue(value)}
                </span>
            </button>
        );
    }

    return (
        <main className={styles.shell}>
            <div className={styles.toolbar}>
                <input
                    className={styles.workflowName}
                    value={currentWorkflow.name}
                    onChange={(event) => updateWorkflowName(event.target.value)}
                    placeholder="Workflow name"
                />
                <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={createNewWorkflow}
                >
                    New Workflow
                </button>
                <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={deleteCurrentWorkflow}
                >
                    Delete Workflow
                </button>
                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setIsDrawerOpen((open) => !open)}
                >
                    {isDrawerOpen ? "Drawer ->" : "Drawer <-"}
                </button>
            </div>

            <section className={styles.workspace}>
                <div
                    className={styles.canvas}
                    style={{ width: canvasSize.width, height: canvasSize.height }}
                >
                    <svg
                        className={styles.edges}
                        viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
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
                            const controlOffset = Math.max(72, (target.x - source.x) * 0.45);
                            const path = `M ${source.x} ${source.y} C ${source.x + controlOffset} ${source.y}, ${target.x - controlOffset} ${target.y}, ${target.x} ${target.y}`;
                            const isHot =
                                evaluation[sourceNode.id]?.outputValues[edge.from.portId] === true;

                            return (
                                <path
                                    key={edge.id}
                                    d={path}
                                    className={isHot ? styles.edgeHot : styles.edge}
                                    onContextMenu={(event) => {
                                        event.preventDefault();
                                        removeEdge(edge.id);
                                    }}
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
                                        <p className={styles.nodeLabel}>{node.label}</p>
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
                                            <div className={styles.emptyPorts}>No input</div>
                                        )}
                                    </div>

                                    <div className={styles.nodeCenter}>
                                        {node.type === "input" ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className={
                                                        node.value
                                                            ? `${styles.switchButton} ${styles.switchButtonOn}`
                                                            : styles.switchButton
                                                    }
                                                    onClick={() => toggleInputNode(node.id)}
                                                >
                                                    <span className={styles.switchTrack}>
                                                        <span className={styles.switchThumb} />
                                                    </span>
                                                    <span>{node.value ? "TRUE" : "FALSE"}</span>
                                                </button>
                                                <span className={styles.resultPill}>
                                                    {formatValue(nodeState?.outputValues.out ?? null)}
                                                </span>
                                            </>
                                        ) : node.type === "output" ? (
                                            <>
                                                <span className={styles.resultPill}>
                                                    {formatValue(nodeState?.value ?? null)}
                                                </span>
                                                <p className={styles.nodeDescription}>
                                                    INPUT STATUS
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <span className={styles.resultPill}>
                                                    {formatValue(nodeState?.value ?? null)}
                                                </span>
                                                <p className={styles.nodeDescription}>
                                                    {NODE_PORTS[node.type].description}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className={styles.portColumn}>
                                        {NODE_PORTS[node.type].outputs.map((port) =>
                                            renderPort(
                                                node,
                                                port,
                                                "output",
                                                nodeState?.outputValues[port.id] ?? null,
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <aside
                className={
                    isDrawerOpen
                        ? `${styles.drawer} ${styles.drawerOpen}`
                        : styles.drawer
                }
            >
                <div className={styles.drawerHeader}>
                    <p className={styles.drawerLabel}>Drawer</p>
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => setIsDrawerOpen(false)}
                    >
                        x
                    </button>
                </div>

                <div className={styles.drawerSection}>
                    <p className={styles.drawerSectionTitle}>Workflow</p>
                    <div className={styles.workflowCard}>
                        <span>{activeWorkflow.name}</span>
                        <span className={styles.workflowMeta}>
                            {currentWorkflow.nodes.length} nodes / {currentWorkflow.edges.length} edges
                        </span>
                    </div>
                    <div className={styles.workflowActions}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={exportWorkflow}
                        >
                            Export
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => importInputRef.current?.click()}
                        >
                            Import
                        </button>
                    </div>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept="application/json"
                        className={styles.hiddenInput}
                        onChange={importWorkflow}
                    />
                </div>

                <div className={styles.drawerSection}>
                    <p className={styles.drawerSectionTitle}>Nodes</p>
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
        </main>
    );
}
