import type { LogicNodeType, LogicPortDefinition } from "@/types/workflow";

export const WORKFLOW_STORAGE_KEY = "node-logic-workflows";
export const NODE_WIDTH = 240;
export const NODE_HEADER_HEIGHT = 44;
export const NODE_PORT_SPACING = 28;
export const NODE_PORT_START = 62;

export const NODE_PORTS: Record<
    LogicNodeType,
    {
        inputs: LogicPortDefinition[];
        outputs: LogicPortDefinition[];
        accent: string;
        description: string;
    }
> = {
    input: {
        inputs: [],
        outputs: [{ id: "out", label: "Value" }],
        accent: "#66d9ef",
        description: "Boolean source",
    },
    and: {
        inputs: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#7ee787",
        description: "A && B",
    },
    or: {
        inputs: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#ffb86c",
        description: "A || B",
    },
    output: {
        inputs: [{ id: "in", label: "Input" }],
        outputs: [],
        accent: "#ff79c6",
        description: "Result sink",
    },
};
