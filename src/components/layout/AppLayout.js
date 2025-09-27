/**
 * Main application layout component with clean white background, black text, and blockchain grid
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-white text-black blockchain-grid">
      <div className="flex flex-col min-h-screen">{children}</div>
    </div>
  );
}
