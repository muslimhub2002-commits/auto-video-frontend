export function GeneratePageSkeleton() {
  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Sidebar Skeleton */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar Skeleton */}
        <div className="h-16 border-b border-gray-200 flex items-center px-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Content Area Skeleton */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Skeleton */}
            <div className="text-center py-12 relative">
              <div className="inline-block relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-blue-200 rounded-2xl animate-pulse"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded-lg w-96 mx-auto mb-3 animate-pulse"></div>
              <div className="h-6 bg-gray-100 rounded-lg w-2/3 mx-auto animate-pulse"></div>
            </div>

            {/* Generate Form Skeleton */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="p-6 space-y-6">
                {/* Script Section Skeleton */}
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
                  </div>
                </div>

                {/* Sentences Section Skeleton */}
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4 p-4 border border-gray-200 rounded-xl">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                          <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
                        </div>
                        <div className="w-40 h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice Section Skeleton */}
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-36 animate-pulse"></div>
                  <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
                </div>

                {/* Generate Button Skeleton */}
                <div className="pt-4">
                  <div className="h-12 bg-gradient-to-r from-purple-200 to-blue-200 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Video Section Skeleton */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              <div className="aspect-video bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
