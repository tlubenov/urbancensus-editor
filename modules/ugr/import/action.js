// Adds every imported point in one graph change, so one undo removes the whole import.
export function ugrActionImportPoints(nodes) {
    return graph => nodes.reduce((g, node) => g.replace(node), graph);
}
