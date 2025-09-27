"use client";

/**
 * Reusable Button component with subtle 3D displacement effects
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'primary'|'secondary'|'success'|'outline'|'ghost'} [props.variant] - Button style variant
 * @param {'sm'|'md'|'lg'} [props.size] - Button size
 * @param {boolean} [props.disabled] - Disabled state
 * @param {function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.type] - Button type attribute
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  className = "",
  type = "button",
  ...props
}) {
  // Base styles with 3D displacement effect
  const baseStyles = `
    relative inline-flex items-center justify-center font-medium 
    transition-all duration-200 ease-in-out
    border border-black
    shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
    hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
    hover:translate-x-[1px] hover:translate-y-[1px]
    active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]
    active:translate-x-[2px] active:translate-y-[2px]
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
    disabled:hover:translate-x-0 disabled:hover:translate-y-0
  `;

  // Variant styles
  const variantStyles = {
    primary: `
      bg-white text-black
      hover:bg-gray-50
      active:bg-gray-100
    `,
    secondary: `
      bg-gray-100 text-black
      hover:bg-gray-200
      active:bg-gray-300
    `,
    success: `
      bg-green-100 text-black border-green-600
      shadow-[2px_2px_0px_0px_rgba(22,163,74,1)]
      hover:shadow-[1px_1px_0px_0px_rgba(22,163,74,1)]
      hover:bg-green-200
      active:shadow-[0px_0px_0px_0px_rgba(22,163,74,1)]
      active:bg-green-300
    `,
    outline: `
      bg-white text-black border-black
      hover:bg-gray-50
      active:bg-gray-100
    `,
    ghost: `
      bg-transparent text-black border-transparent
      shadow-none
      hover:bg-gray-100 hover:border-black
      hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
      active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
    `,
  };

  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-sm rounded-md",
    lg: "px-6 py-3 text-base rounded-lg",
  };

  // Combine all styles
  const buttonClasses = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `
    .replace(/\s+/g, " ")
    .trim();

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
