"use client";

import { useEffect, useMemo, useState } from "react";

type ResetRequest = {
  id: string;
  email: string;
  status: string;
  requestedAt: string;
};

export default function ResetRequestsPanel() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function fetchRequests() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reset-requests", {
        cache: "no-store",
      });
      const data = await res.json();
      setRequests(data.requests || []);
    } finally {
      setLoading(false);
    }
  }

  async function resolveRequest(id: string) {
    try {
      setResolvingId(id);
      await fetch(`/api/admin/reset-requests/${id}`, {
        method: "PATCH",
      });
      await fetchRequests();
    } finally {
      setResolvingId(null);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "PENDING"),
    [requests]
  );

  function formatDate(value: string) {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Password Reset Requests
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Users waiting for administrator assistance
          </p>
        </div>

        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
          {pendingRequests.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Loading requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-500">
            No pending reset requests.
          </div>
        ) : (
          pendingRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border border-gray-200 bg-gray-50/70 p-4"
            >
              <div className="break-all text-sm font-medium text-gray-900">
                {request.email}
              </div>

              <div className="mt-1 text-xs text-gray-500">
                Requested {formatDate(request.requestedAt)}
              </div>
              <div className="mt-3 space-y-2">
                <span className="inline-flex w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Pending
                </span>

                <button
                    onClick={() => resolveRequest(request.id)}
                    disabled={resolvingId === request.id}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                    {resolvingId === request.id ? "Resolving..." : "Mark Resolved"}
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}