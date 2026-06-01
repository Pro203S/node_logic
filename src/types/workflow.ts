export type LogicNodeType = "input" | "and" | "or" | "output";

export type LogicPortKind = "input" | "output";

export type LogicPortDefinition = {
    id: string;
    label: string;
};

export type LogicNode = {
    id: string;
    type: LogicNodeType;
    label: string;
    position: {
        x: number;
        y: number;
    };
    value?: boolean;
};

export type LogicEdge = {
    id: string;
    from: {
        nodeId: string;
        portId: string;
    };
    to: {
        nodeId: string;
        portId: string;
    };
};

export type LogicWorkflow = {
    id: string;
    name: string;
    nodes: LogicNode[];
    edges: LogicEdge[];
    updatedAt: string;
};

export type WorkflowStore = {
    activeWorkflowId: string;
    workflows: LogicWorkflow[];
};
