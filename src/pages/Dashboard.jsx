// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

function smallDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function Dashboard() {
  const { shortCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`/api/stats/${shortCode}`);
        setStats(res.data);
      } catch (err) {
        console.error(err);
        const msg = err?.response?.data?.message || err.message || "Failed to load stats";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shortCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin mb-3 inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          <div className="text-sm text-slate-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg bg-red-50 border border-red-200 p-6">
            <h3 className="text-lg font-semibold text-red-700">Could not load analytics</h3>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <div className="mt-4">
              <button onClick={() => navigate(-1)} className="rounded px-4 py-2 bg-red-600 text-white">Go back</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Destructure the response shapes we expect
  const { summary, timeseries = [], geo = [], topReferrers = [], recentClicks = [] } = stats;

  // Prepare chart data: timeseries is already {date, count}
  const lineData = timeseries.map((t) => ({ date: t.date, count: t.count }));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics — <span className="text-indigo-600 font-medium">{summary?.shortCode}</span></h1>
            <p className="text-sm text-slate-500 mt-1">Overview for <a href={summary?.shortUrl} target="_blank" rel="noreferrer" className="underline">{summary?.shortUrl}</a></p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-slate-600 hover:underline">← Back</Link>
            <a href={summary?.shortUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-sm">Open</a>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: summary + geo + referrers */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Created</div>
                  <div className="text-sm font-medium">{summary?.createdAt ? new Date(summary.createdAt).toLocaleString() : "-"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Total clicks</div>
                  <div className="text-xl font-semibold">{summary?.clickCount ?? 0}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">Short code: <span className="font-mono">{summary?.shortCode}</span></div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="text-sm font-medium mb-2">Top countries</h3>
              <div className="space-y-2">
                {geo.length === 0 ? (
                  <div className="text-sm text-slate-400">No geo data yet</div>
                ) : geo.map((g) => (
                  <div key={g.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-xs font-semibold">
                        {String(g.country || "UNK").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{g.country || "Unknown"}</div>
                        <div className="text-xs text-slate-400">{g.count} clicks</div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">{Math.round((g.count / (summary?.clickCount || 1)) * 100)}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="text-sm font-medium mb-2">Top referrers</h3>
              {topReferrers.length === 0 ? (
                <div className="text-sm text-slate-400">No referrers recorded</div>
              ) : (
                <ul className="space-y-2">
                  {topReferrers.map((r, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center justify-between">
                        <div className="truncate pr-4">{r.referrer}</div>
                        <div className="text-slate-500 text-sm ml-2">{r.count}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Middle / Right: charts and recent clicks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="text-sm font-medium mb-3">Clicks (last {lineData.length} days)</h3>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={(v) => v} formatter={(val) => [val, "Clicks"]} />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="text-sm font-medium mb-3">Recent clicks</h3>
              {recentClicks.length === 0 ? (
                <div className="text-sm text-slate-400">No clicks recorded yet — open the short link to generate activity.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="pb-2 pr-4">When</th>
                        <th className="pb-2 pr-4">IP</th>
                        <th className="pb-2 pr-4">Location</th>
                        <th className="pb-2 pr-4">UA (truncated)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentClicks.slice(0, 100).map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="py-3 pr-4 align-top">{new Date(c.createdAt).toLocaleString()}</td>
                          <td className="py-3 pr-4 align-top">{c.ip || "—"}</td>
                          <td className="py-3 pr-4 align-top">{(c.city ? `${c.city}, ` : "") + (c.region ? `${c.region}, ` : "") + (c.country || "—")}</td>
                          <td className="py-3 pr-4 align-top"><div className="truncate max-w-[38ch]">{c.ua || "—"}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
