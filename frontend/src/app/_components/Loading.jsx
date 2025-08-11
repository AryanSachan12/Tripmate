"use client";

export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingCard({ className = "" }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}

export function LoadingGrid({ count = 6, className = "" }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

export function LoadingPage({ message = "Loading..." }) {
  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}

export function LoadingButton({ children, isLoading, ...props }) {
  return (
    <button 
      {...props}
      disabled={isLoading || props.disabled}
      className={`${props.className} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner size="sm" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
