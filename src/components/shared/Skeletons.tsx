// src/components/shared/Skeletons.tsx
import React from 'react';

const SkeletonBase = ({ className }: { className?: string }) => (
    <div className={`skeleton ${className}`}></div>
);

export const StatCardSkeleton = () => (
    <div className="glass-card flex items-center p-5 rounded-2xl">
        <SkeletonBase className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="ml-4 w-full">
            <SkeletonBase className="h-4 w-1/3 mb-2" />
            <SkeletonBase className="h-6 w-2/3" />
        </div>
    </div>
);

export const StatCardsSkeleton = () => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
);

export const PerformanceSummarySkeleton = () => (
    <div className="glass-card rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
            <SkeletonBase className="h-6 w-1/3" />
            <SkeletonBase className="h-8 w-1/4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <SkeletonBase className="h-4 w-1/2 mx-auto mb-2" />
                <SkeletonBase className="h-8 w-2/3 mx-auto" />
            </div>
            <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <SkeletonBase className="h-4 w-1/2 mx-auto mb-2" />
                <SkeletonBase className="h-8 w-2/3 mx-auto" />
            </div>
        </div>
    </div>
);

export const RecentBetsSkeleton = () => (
    <div className="glass-card rounded-2xl p-6 h-full">
        <div className="flex justify-between items-center mb-4">
            <SkeletonBase className="h-6 w-1/3" />
            <SkeletonBase className="h-4 w-1/6" />
        </div>
        <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-800/30 p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                        <SkeletonBase className="h-4 w-1/2 mb-1.5" />
                        <SkeletonBase className="h-3 w-3/4" />
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                        <SkeletonBase className="h-4 w-12 mb-1.5" />
                        <SkeletonBase className="h-4 w-16" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const BetCardSkeleton = () => (
    <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                    <SkeletonBase className="h-10 w-10 rounded-full" />
                    <div>
                        <SkeletonBase className="h-6 w-24 mb-1" />
                        <SkeletonBase className="h-4 w-16" />
                    </div>
                </div>
                <SkeletonBase className="h-6 w-20 rounded-full" />
            </div>
            <div className="bg-gray-800 bg-opacity-30 rounded-lg p-3">
                <SkeletonBase className="h-4 w-full mb-2" />
                <SkeletonBase className="h-4 w-2/3" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SkeletonBase className="h-10 w-full" />
                <SkeletonBase className="h-10 w-full" />
                <SkeletonBase className="h-10 w-full" />
                <SkeletonBase className="h-10 w-full" />
            </div>
        </div>
    </div>
);

export const TransactionCardSkeleton = () => (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <SkeletonBase className="h-12 w-12 rounded-full" />
            <div className="w-40">
                <SkeletonBase className="h-5 w-3/4 mb-2" />
                <SkeletonBase className="h-4 w-1/2" />
            </div>
        </div>
        <div className="flex items-center space-x-4">
            <SkeletonBase className="h-6 w-24" />
        </div>
    </div>
);

export const SpecialOddCardSkeleton = () => (
    <div className="glass-card rounded-2xl flex flex-col">
        <div className="p-4 flex-grow">
            <div className="flex justify-between items-start mb-2">
                <SkeletonBase className="h-6 w-1/3" />
                <SkeletonBase className="h-6 w-1/4 rounded-full" />
            </div>
            <div className="space-y-2 mb-4">
                <SkeletonBase className="h-4 w-full" />
                <SkeletonBase className="h-4 w-5/6" />
            </div>
            <SkeletonBase className="h-10 w-full rounded-lg" />
        </div>
        <div className="p-4 border-t border-gray-600/50">
            <SkeletonBase className="h-10 w-full rounded-lg" />
        </div>
    </div>
);

export const SponsorCardSkeleton = () => (
    <div className="glass-card rounded-2xl p-4">
        <SkeletonBase className="h-40 w-full rounded-xl mb-4" />
        <SkeletonBase className="h-6 w-3/4 mx-auto" />
    </div>
);

export const HistorySummaryStatsSkeleton = () => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card p-4 rounded-xl text-center">
                    <SkeletonBase className="h-4 w-1/2 mx-auto mb-2" />
                    <SkeletonBase className="h-6 w-3/4 mx-auto" />
                </div>
            ))}
        </div>
    );
};