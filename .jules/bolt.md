## 2025-05-27 - Event Listener Stability
**Learning:** In React components wrapping imperative libraries (like Cytoscape), passing callback props directly to event binding logic in `useEffect` can cause expensive detach/reattach cycles if the parent component passes unstable function references (e.g. arrow functions).
**Action:** Use the "Mutable Ref" pattern: store the latest callback in a `useRef`, update it in a separate effect, and bind the event listener once on mount to call `ref.current()`. This keeps the expensive imperative setup stable while allowing the callbacks to update.
