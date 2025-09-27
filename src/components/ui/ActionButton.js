"use client";

/**
 * Action Button component with subtle aesthetic colors for key actions
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'blue'|'green'|'default'} [props.color] - Action color theme
 * @param {'sm'|'md'|'lg'} [props.size] - Button size
 * @param {boolean} [props.disabled] - Disabled state
 * @param {function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 */
export default function ActionButton({
  children,
  color = "default",
  size = "md",
  disabled = false,
  onClick,
  className = "",
  ...props
}) {
  // Base 3D styles
  const baseStyles = `
    relative inline-flex items-center justify-center font-medium 
    transition-all duration-200 ease-in-out
    border-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  // Color-specific styles with subtle aesthetic colors
  const colorStyles = {
    default: `
      bg-white text-black border-black
      shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
      hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
      hover:translate-x-[1px] hover:translate-y-[1px]
      hover:bg-gray-50
      active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]
      active:translate-x-[2px] active:translate-y-[2px]
      active:bg-gray-100
    `,
    blue: `
      bg-blue-50 text-black border-blue-400
      shadow-[2px_2px_0px_0px_rgba(74,144,226,1)]
      hover:shadow-[1px_1px_0px_0px_rgba(74,144,226,1)]
      hover:translate-x-[1px] hover:translate-y-[1px]
      hover:bg-blue-100
      active:shadow-[0px_0px_0px_0px_rgba(74,144,226,1)]
      active:translate-x-[2px] active:translate-y-[2px]
      active:bg-blue-200
    `,
    green: `
      bg-green-50 text-black border-green-400
      shadow-[2px_2px_0px_0px_rgba(126,211,33,1)]
      hover:shadow-[1px_1px_0px_0px_rgba(126,211,33,1)]
      hover:translate-x-[1px] hover:translate-y-[1px]
      hover:bg-green-100
      active:shadow-[0px_0px_0px_0px_rgba(126,211,33,1)]
      active:translate-x-[2px] active:translate-y-[2px]
      active:bg-green-200
    `,
  };

  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-sm rounded-md",
    lg: "px-6 py-3 text-base rounded-lg",
  };

  // Disabled styles override
  const disabledStyles = disabled
    ? `
    hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]
    hover:translate-x-0 hover:translate-y-0
    active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]
    active:translate-x-0 active:translate-y-0
  `
    : "";

  // Combine all styles
  const buttonClasses = `
    ${baseStyles}
    ${colorStyles[color]}
    ${sizeStyles[size]}
    ${disabledStyles}
    ${className}
  `
    .replace(/\s+/g, " ")
    .trim();

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
