"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, X, AlertCircle } from "lucide-react";
import Button from "../ui/Button.js";
import ActionButton from "../ui/ActionButton.js";

/**
 * @typedef {'txid'|'address'|'invalid'|'empty'} InputType
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether input is valid
 * @property {InputType} type - Detected input type
 * @property {string} [error] - Error message if invalid
 */

/**
 * Search input component with real-time TxID and address validation
 * @param {Object} props
 * @param {function} props.onSearch - Search handler (query, type) => void
 * @param {boolean} [props.isLoading] - Loading state
 * @param {string} [props.placeholder] - Input placeholder text
 * @param {string} [props.value] - Controlled input value
 * @param {function} [props.onChange] - Input change handler
 * @param {string} [props.error] - External error message
 * @param {boolean} [props.disabled] - Disabled state
 * @param {string} [props.className] - Additional CSS classes
 * @param {function} [props.getSuggestions] - Function to get search suggestions
 * @param {boolean} [props.showSuggestions] - Whether to show suggestions
 */
export default function SearchInput({
  onSearch,
  isLoading = false,
  placeholder = "Enter transaction hash or wallet address...",
  value: controlledValue,
  onChange: controlledOnChange,
  error: externalError,
  disabled = false,
  className = "",
  getSuggestions,
  showSuggestions = true,
}) {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Use controlled or uncontrolled value
  const inputValue =
    controlledValue !== undefined ? controlledValue : internalValue;
  const handleInputChange = controlledOnChange || setInternalValue;

  /**
   * Validate input and detect type
   * @param {string} input - Input string to validate
   * @returns {ValidationResult} Validation result
   */
  const validateInput = useCallback((input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      return {
        isValid: false,
        type: "empty",
        error: null,
      };
    }

    // Transaction hash validation (64 hex characters, optionally prefixed with 0x)
    const txHashRegex = /^(0x)?[a-fA-F0-9]{64}$/;
    if (txHashRegex.test(trimmed)) {
      return {
        isValid: true,
        type: "txid",
        error: null,
      };
    }

    // Ethereum address validation (40 hex characters, optionally prefixed with 0x)
    const addressRegex = /^(0x)?[a-fA-F0-9]{40}$/;
    if (addressRegex.test(trimmed)) {
      return {
        isValid: true,
        type: "address",
        error: null,
      };
    }

    // Check for common input patterns to provide helpful error messages
    if (trimmed.length < 40) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Input too short. Enter a valid transaction hash (64 chars) or address (40 chars).",
      };
    }

    if (trimmed.length > 66) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Input too long. Transaction hashes are 64 characters, addresses are 40 characters.",
      };
    }

    if (!/^(0x)?[a-fA-F0-9]+$/.test(trimmed)) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Invalid characters. Only hexadecimal characters (0-9, a-f) are allowed.",
      };
    }

    return {
      isValid: false,
      type: "invalid",
      error:
        "Invalid format. Enter a valid transaction hash or wallet address.",
    };
  }, []);

  // Memoized validation result
  const validation = useMemo(
    () => validateInput(inputValue),
    [inputValue, validateInput]
  );

  // Determine error message to display
  const errorMessage = externalError || validation.error;
  const showError = !isFocused && errorMessage && inputValue.trim();

  /**
   * Handle input change with validation
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      handleInputChange(newValue);

      // Update suggestions
      if (showSuggestions && getSuggestions && newValue.length >= 2) {
        const newSuggestions = getSuggestions(newValue, 5);
        setSuggestions(newSuggestions);
        setShowSuggestionsList(newSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestionsList(false);
      }
      setSelectedSuggestionIndex(-1);
    },
    [handleInputChange, showSuggestions, getSuggestions]
  );

  /**
   * Handle search submission
   */
  const handleSearch = useCallback(() => {
    if (!validation.isValid || isLoading || disabled) {
      return;
    }

    const trimmedValue = inputValue.trim();
    // Ensure 0x prefix for consistency
    const normalizedValue = trimmedValue.startsWith("0x")
      ? trimmedValue
      : `0x${trimmedValue}`;

    onSearch(normalizedValue, validation.type);
  }, [validation, inputValue, onSearch, isLoading, disabled]);

  /**
   * Handle keyboard navigation and search
   * @param {React.KeyboardEvent<HTMLInputElement>} e - Keyboard event
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (!showSuggestionsList || suggestions.length === 0) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSearch();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            const selectedSuggestion = suggestions[selectedSuggestionIndex];
            handleInputChange(selectedSuggestion.query);
            setShowSuggestionsList(false);
            setSelectedSuggestionIndex(-1);
            // Trigger search with selected suggestion
            setTimeout(() => {
              const validation = validateInput(selectedSuggestion.query);
              if (validation.isValid) {
                const normalizedValue = selectedSuggestion.query.startsWith(
                  "0x"
                )
                  ? selectedSuggestion.query
                  : `0x${selectedSuggestion.query}`;
                onSearch(normalizedValue, validation.type);
              }
            }, 0);
          } else {
            handleSearch();
          }
          break;
        case "Escape":
          setShowSuggestionsList(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    },
    [
      showSuggestionsList,
      suggestions,
      selectedSuggestionIndex,
      handleSearch,
      handleInputChange,
      validateInput,
      onSearch,
    ]
  );

  /**
   * Clear input
   */
  const handleClear = useCallback(() => {
    handleInputChange("");
    setSuggestions([]);
    setShowSuggestionsList(false);
    setSelectedSuggestionIndex(-1);
  }, [handleInputChange]);

  /**
   * Handle suggestion selection
   * @param {Object} suggestion - Selected suggestion
   */
  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      handleInputChange(suggestion.query);
      setShowSuggestionsList(false);
      setSelectedSuggestionIndex(-1);

      // Trigger search with selected suggestion
      setTimeout(() => {
        const validation = validateInput(suggestion.query);
        if (validation.isValid) {
          const normalizedValue = suggestion.query.startsWith("0x")
            ? suggestion.query
            : `0x${suggestion.query}`;
          onSearch(normalizedValue, validation.type);
        }
      }, 0);
    },
    [handleInputChange, validateInput, onSearch]
  );

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (suggestions.length > 0) {
      setShowSuggestionsList(true);
    }
  }, [suggestions.length]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestionsList(false);
      setSelectedSuggestionIndex(-1);
    }, 200);
  }, []);

  /**
   * Get input type indicator text
   */
  const getTypeIndicator = () => {
    if (!inputValue.trim()) return null;

    switch (validation.type) {
      case "txid":
        return "Transaction Hash";
      case "address":
        return "Wallet Address";
      case "invalid":
        return "Invalid Format";
      default:
        return null;
    }
  };

  const typeIndicator = getTypeIndicator();

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      {/* Search Input Container */}
      <div className="relative">
        {/* Input Field */}
        <div
          className={`
            relative flex items-center
            bg-white border-2 border-black
            shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
            transition-all duration-200 ease-in-out
            ${
              isFocused
                ? "shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]"
                : ""
            }
            ${
              showError
                ? "border-red-500 shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]"
                : ""
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            rounded-md overflow-hidden
          `}
        >
          {/* Search Icon */}
          <div className="flex items-center justify-center w-12 h-12 text-gray-500">
            <Search size={18} />
          </div>

          {/* Input */}
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={`
              flex-1 h-12 px-2 py-3
              bg-transparent border-none outline-none
              text-black placeholder-gray-400
              text-sm font-medium
              disabled:cursor-not-allowed
            `}
          />

          {/* Type Indicator */}
          {typeIndicator && (
            <div
              className={`
                px-2 py-1 mx-2 text-xs font-medium rounded
                ${
                  validation.isValid
                    ? validation.type === "txid"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }
              `}
            >
              {typeIndicator}
            </div>
          )}

          {/* Clear Button */}
          {inputValue && !isLoading && (
            <button
              onClick={handleClear}
              disabled={disabled}
              className="flex items-center justify-center w-8 h-8 mr-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear input"
            >
              <X size={16} />
            </button>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center w-8 h-8 mr-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          )}

          {/* Search Button */}
          <div className="mr-2">
            <ActionButton
              color={validation.isValid ? "blue" : "default"}
              size="sm"
              onClick={handleSearch}
              disabled={!validation.isValid || isLoading || disabled}
              className="h-8"
            >
              {isLoading ? (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Searching...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Search size={14} />
                  <span className="text-xs">Search</span>
                </div>
              )}
            </ActionButton>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestionsList && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md overflow-hidden z-50">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.query}-${suggestion.type}-${suggestion.timestamp}`}
                onClick={() => handleSuggestionSelect(suggestion)}
                className={`
                  w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
                  ${
                    index === selectedSuggestionIndex
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : ""
                  }
                  ${index > 0 ? "border-t border-gray-200" : ""}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-gray-800 truncate">
                      {suggestion.query}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`
                          px-2 py-0.5 text-xs font-medium rounded
                          ${
                            suggestion.type === "txid"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }
                        `}
                      >
                        {suggestion.type === "txid" ? "Transaction" : "Address"}
                      </span>
                      {suggestion.successful && (
                        <span className="text-xs text-gray-500">
                          {suggestion.resultCount} result
                          {suggestion.resultCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 ml-2">
                    {new Date(suggestion.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}


      </div>

      {/* Error Message */}
      {showError && (
        <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle
            size={16}
            className="text-red-600 mt-0.5 flex-shrink-0"
          />
          <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Help Text */}
      {!showError && !inputValue && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <p>
            Enter a <span className="font-medium">transaction hash</span> (64
            hex characters) or{" "}
            <span className="font-medium">wallet address</span> (40 hex
            characters)
          </p>
          <p className="mt-1">
            Examples: 0x1234... or 1234... (0x prefix is optional)
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing search input state and validation
 * @param {Object} [options] - Hook options
 * @param {string} [options.initialValue] - Initial input value
 * @param {function} [options.onValidationChange] - Validation change callback
 * @returns {Object} Search input state and handlers
 */
export function useSearchInput(options = {}) {
  const { initialValue = "", onValidationChange } = options;

  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateInput = useCallback((input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      return { isValid: false, type: "empty", error: null };
    }

    const txHashRegex = /^(0x)?[a-fA-F0-9]{64}$/;
    if (txHashRegex.test(trimmed)) {
      return { isValid: true, type: "txid", error: null };
    }

    const addressRegex = /^(0x)?[a-fA-F0-9]{40}$/;
    if (addressRegex.test(trimmed)) {
      return { isValid: true, type: "address", error: null };
    }

    if (trimmed.length < 40) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Input too short. Enter a valid transaction hash (64 chars) or address (40 chars).",
      };
    }

    if (trimmed.length > 66) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Input too long. Transaction hashes are 64 characters, addresses are 40 characters.",
      };
    }

    if (!/^(0x)?[a-fA-F0-9]+$/.test(trimmed)) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Invalid characters. Only hexadecimal characters (0-9, a-f) are allowed.",
      };
    }

    return {
      isValid: false,
      type: "invalid",
      error:
        "Invalid format. Enter a valid transaction hash or wallet address.",
    };
  }, []);

  const validation = useMemo(() => {
    const result = validateInput(value);
    if (onValidationChange) {
      onValidationChange(result);
    }
    return result;
  }, [value, validateInput, onValidationChange]);

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    setError(null); // Clear error when user types
  }, []);

  const reset = useCallback(() => {
    setValue("");
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    value,
    setValue: handleChange,
    validation,
    isLoading,
    setIsLoading,
    error,
    setError,
    reset,
  };
}
