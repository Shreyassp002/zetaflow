/**
 * Responsive container component with minimal aesthetic
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] - Additional CSS classes
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [props.maxWidth] - Maximum width constraint
 */
export default function Container({
  children,
  className = "",
  maxWidth = "xl",
}) {
  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    full: "max-w-full",
  };

  return (
    <div
      className={`container mx-auto px-4 ${maxWidthClasses[maxWidth]} ${className}`}
    >
      {children}
    </div>
  );
}
