import type { LogicNodeType, LogicPortDefinition } from "@/types/workflow";

export const WORKFLOW_STORAGE_KEY = "node-logic-workflows";
export const NODE_WIDTH = 240;
export const NODE_HEADER_HEIGHT = 56;
export const NODE_BODY_PADDING_Y = 16;
export const NODE_PORT_ROW_HEIGHT = 28;
export const NODE_PORT_ROW_GAP = 10;
export const NODE_PORT_SPACING = NODE_PORT_ROW_HEIGHT + NODE_PORT_ROW_GAP;
export const NODE_PORT_START =
    NODE_HEADER_HEIGHT + NODE_BODY_PADDING_Y + NODE_PORT_ROW_HEIGHT / 2;
export const PORT_HANDLE_OFFSET = 10;

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
        outputs: [{ id: "out", label: "Output" }],
        accent: "#d0d0d0",
        description: "Switch source",
    },
    and: {
        inputs: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#bdbdbd",
        description: "A && B",
    },
    or: {
        inputs: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#b3b3b3",
        description: "A || B",
    },
    xor: {
        inputs: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#ababab",
        description: "A !== B",
    },
    not: {
        inputs: [{ id: "in", label: "In" }],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#a3a3a3",
        description: "!A",
    },
    nand: {
        inputs: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#9c9c9c",
        description: "!(A && B)",
    },
    nor: {
        inputs: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#949494",
        description: "!(A || B)",
    },
    xnor: {
        inputs: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ],
        outputs: [{ id: "out", label: "Result" }],
        accent: "#8c8c8c",
        description: "A === B",
    },
    output: {
        inputs: [{ id: "in", label: "Input" }],
        outputs: [{ id: "out", label: "Output" }],
        accent: "#848484",
        description: "Show input state",
    },
};
