export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Loading Admin Dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">Please wait while we verify your access...</p>
        </div>
      </div>
    </div>
  );
}
