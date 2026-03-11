'use client';

type RenderSettingsSectionProps = {
    isShort: boolean;
    onIsShortChange: (value: boolean) => void;
    disableIsShort?: boolean;
    useLowerFps: boolean;
    onUseLowerFpsChange: (value: boolean) => void;
    useLowerResolution: boolean;
    onUseLowerResolutionChange: (value: boolean) => void;
    addSubtitles: boolean;
    onAddSubtitlesChange: (value: boolean) => void;
};

export function RenderSettingsSection({
    isShort,
    onIsShortChange,
    disableIsShort = false,
    useLowerFps,
    onUseLowerFpsChange,
    useLowerResolution,
    onUseLowerResolutionChange,
    addSubtitles,
    onAddSubtitlesChange,
}: RenderSettingsSectionProps) {
    return (
        <div className="px-6 pb-5 pt-5 border-t border-gray-200 bg-linear-to-br from-gray-50 to-white">
            <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                    <div className="absolute inset-0 bg-linear-to-br from-indigo-400 to-purple-500 blur-md opacity-40 rounded-xl"></div>
                    <div className="relative p-2.5 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                        <svg
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                            />
                        </svg>
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold bg-linear-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                        Render Configuration
                    </h3>
                    <p className="text-sm text-gray-600">Fine-tune quality and performance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Is Short Option */}
                <label
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${isShort
                            ? 'border-indigo-400 shadow-lg shadow-indigo-100'
                            : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    } ${disableIsShort ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                    <div className="relative mt-0.5">
                        <input
                            type="checkbox"
                            className="peer h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-indigo-500"
                            checked={isShort}
                            disabled={disableIsShort}
                            onChange={(e) => onIsShortChange(e.target.checked)}
                        />
                        <div
                            className={`absolute inset-0 rounded bg-indigo-500 opacity-0 transition-opacity duration-300 pointer-events-none ${isShort ? 'animate-ping' : ''
                                }`}
                            style={{ animationIterationCount: 1, animationDuration: '0.5s' }}
                        ></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                Is Short
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                Aspect ratio
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">On: 9:16 (Shorts). Off: 16:9 (Regular)</p>
                    </div>
                </label>
                {/* Add Subtitles Option */}
                <label
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${addSubtitles
                            ? 'border-indigo-400 shadow-lg shadow-indigo-100'
                            : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                        }`}
                >
                    <div className="relative mt-0.5">
                        <input
                            type="checkbox"
                            className="peer h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-indigo-500"
                            checked={addSubtitles}
                            onChange={(e) => onAddSubtitlesChange(e.target.checked)}
                        />
                        <div
                            className={`absolute inset-0 rounded bg-indigo-500 opacity-0 transition-opacity duration-300 pointer-events-none ${addSubtitles ? 'animate-ping' : ''
                                }`}
                            style={{ animationIterationCount: 1, animationDuration: '0.5s' }}
                        ></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                Add Subtitles
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                                Text overlay
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Reveal subtitle words progressively at the bottom of each scene</p>
                    </div>
                </label>
                {/* Lower FPS Option */}
                <label
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${useLowerFps
                            ? 'border-indigo-400 shadow-lg shadow-indigo-100'
                            : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                        }`}
                >
                    <div className="relative mt-0.5">
                        <input
                            type="checkbox"
                            className="peer h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-indigo-500"
                            checked={useLowerFps}
                            onChange={(e) => onUseLowerFpsChange(e.target.checked)}
                        />
                        <div
                            className={`absolute inset-0 rounded bg-indigo-500 opacity-0 transition-opacity duration-300 pointer-events-none ${useLowerFps ? 'animate-ping' : ''
                                }`}
                            style={{ animationIterationCount: 1, animationDuration: '0.5s' }}
                        ></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                Lower FPS
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                Faster
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">24 fps instead of 30 fps (~20% faster)</p>
                    </div>
                </label>

                {/* Lower Resolution Option */}
                <label
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${useLowerResolution
                            ? 'border-indigo-400 shadow-lg shadow-indigo-100'
                            : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                        }`}
                >
                    <div className="relative mt-0.5">
                        <input
                            type="checkbox"
                            className="peer h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-indigo-500"
                            checked={useLowerResolution}
                            onChange={(e) => onUseLowerResolutionChange(e.target.checked)}
                        />
                        <div
                            className={`absolute inset-0 rounded bg-indigo-500 opacity-0 transition-opacity duration-300 pointer-events-none ${useLowerResolution ? 'animate-ping' : ''
                                }`}
                            style={{ animationIterationCount: 1, animationDuration: '0.5s' }}
                        ></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                720p Resolution
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                Faster
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Use 720p instead of 1080p (~50% faster)</p>
                    </div>
                </label>


            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                    <svg
                        className="h-4 w-4 text-blue-600 mt-0.5 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <p className="text-xs text-blue-800 leading-relaxed">
                        <span className="font-semibold">Tip:</span> Enable performance options for faster previews,
                        disable them for final high-quality exports.
                    </p>
                </div>
            </div>
        </div>
    );
}
