import { Check, Clock, X } from "lucide-react";

/**
 * Status indicator component with clean icons and minimal color coding
 * @param {Object} props
 * @param {'success'|'pending'|'failed'} props.status - Status type
 * @param {'sm'|'md'|'lg'} [props.size] - Icon size
 * @param {boolean} [props.showText] - Whether to show status text
 * @param {string} [props.className] - Additional CSS classes
 */
export default function StatusIndicator({
  status,
  size = "md",
  showText = false,
  className = "",
}) {
  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 14,
      text: "text-xs",
      container: "gap-1",
    },
    md: {
      icon: 16,
      text: "text-sm",
      container: "gap-1.5",
    },
    lg: {
      icon: 20,
      text: "text-base",
      container: "gap-2",
    },
  };

  // Status configurations with muted colors
  const statusConfig = {
    success: {
      icon: Check,
      color: "text-green-600", // Muted green #7ED321 equivalent
      bgColor: "bg-green-50",
      text: "Success",
      description: "Completed successfully",
    },
    pending: {
      icon: Clock,
      color: "text-gray-500", // Soft gray #9B9B9B equivalent
      bgColor: "bg-gray-50",
      text: "Pending",
      description: "In progress",
    },
    failed: {
      icon: X,
      color: "text-red-600", // Subtle red #D0021B equivalent
      bgColor: "bg-red-50",
      text: "Failed",
      description: "Operation failed",
    },
  };

  const config = statusConfig[status];
  const sizeConf = sizeConfig[size];
  const IconComponent = config.icon;

  if (!config) {
    console.warn(
      `Invalid status: ${status}. Must be 'success', 'pending', or 'failed'.`
    );
    return null;
  }

  return (
    <div
      className={`inline-flex items-center ${sizeConf.container} ${className}`}
    >
      {/* Icon with background circle */}
      <div
        className={`
        flex items-center justify-center rounded-full p-1
        ${config.bgColor} ${config.color}
      `}
      >
        <IconComponent
          size={sizeConf.icon}
          className={status === "pending" ? "animate-spin" : ""}
        />
      </div>

      {/* Optional text */}
      {showText && (
        <span className={`font-medium ${config.color} ${sizeConf.text}`}>
          {config.text}
        </span>
      )}
    </div>
  );
}

/**
 * Status badge component for more prominent display
 * @param {Object} props
 * @param {'success'|'pending'|'failed'} props.status - Status type
 * @param {string} [props.text] - Custom text to display
 * @param {'sm'|'md'|'lg'} [props.size] - Badge size
 * @param {string} [props.className] - Additional CSS classes
 */
export function StatusBadge({ status, text, size = "md", className = "" }) {
  const statusConfig = {
    success: {
      icon: Check,
      color: "text-green-700",
      bgColor: "bg-green-100",
      borderColor: "border-green-200",
      defaultText: "Success",
    },
    pending: {
      icon: Clock,
      color: "text-gray-700",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-200",
      defaultText: "Pending",
    },
    failed: {
      icon: X,
      color: "text-red-700",
      bgColor: "bg-red-100",
      borderColor: "border-red-200",
      defaultText: "Failed",
    },
  };

  const sizeConfig = {
    sm: {
      icon: 12,
      text: "text-xs",
      padding: "px-2 py-1",
    },
    md: {
      icon: 14,
      text: "text-sm",
      padding: "px-3 py-1.5",
    },
    lg: {
      icon: 16,
      text: "text-base",
      padding: "px-4 py-2",
    },
  };

  const config = statusConfig[status];
  const sizeConf = sizeConfig[size];
  const IconComponent = config.icon;
  const displayText = text || config.defaultText;

  if (!config) {
    console.warn(
      `Invalid status: ${status}. Must be 'success', 'pending', or 'failed'.`
    );
    return null;
  }

  return (
    <div
      className={`
      inline-flex items-center gap-1.5 rounded-md border
      ${config.bgColor} ${config.borderColor} ${config.color}
      ${sizeConf.padding} ${className}
    `}
    >
      <IconComponent
        size={sizeConf.icon}
        className={status === "pending" ? "animate-spin" : ""}
      />
      <span className={`font-medium ${sizeConf.text}`}>{displayText}</span>
    </div>
  );
}
