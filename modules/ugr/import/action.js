// Adds every imported point in one graph change, so one undo removes the whole import.
// One `update` copies the graph once; replacing on the frozen graph point by point would copy it per point.
export function ugrActionImportPoints(nodes) {
    return graph => graph.update(g => {
        for (const node of nodes) g.replace(node);
    });
}
