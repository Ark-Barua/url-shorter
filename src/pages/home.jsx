import React, { useState, useEffect } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate } from "react-router-dom";

// ⭐ Deployment fix: API base from Vercel env
const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function Home() {
  const navigate = useNavigate();

  const [longUrl, setLongUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const isValidUrl = (u) => {
    if (!u) return false;
    try {
      const url = u.match(/^https?:\/\//i) ? u : `https://${u}`;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleReset = () => {
    setLongUrl("");
    setAlias("");
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!isValidUrl(longUrl)) {
      setError("Enter a valid URL (e.g. https://example.com)");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        originalUrl: longUrl.match(/^https?:\/\//i)
          ? longUrl
          : `https://${longUrl}`,
      };
      if (alias.trim()) payload.customAlias = alias.trim();

      // ⭐ Deployment safe API call
      const res = await axios.post(`${API_BASE}/api/shorten`, payload);

      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Shortening failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Copy failed — try manual copy");
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById("qr-canvas");
    if (!canvas) return setError("QR not ready");
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "tinyhawk-qr.png";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0b1220] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <nav className="flex items-center justify-between mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/8 backdrop-blur-sm shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white opacity-90">
                <path d="M4 12c0-4.418 3-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 12h2a6 6 0 006 6v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">TinyHawk</div>
              <div className="text-xs text-slate-400 -mt-0.5">Short links • Analytics • QR</div>
            </div>
          </div>

          <div className="text-sm text-slate-400 hidden md:block">Designed for speed • Built for privacy</div>
        </nav>

        <section className="relative rounded-3xl bg-white/5 backdrop-blur-md border border-white/6 shadow-xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-6">
            
            <div className="p-8 md:p-12 flex flex-col justify-center gap-6">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight" style={{letterSpacing: '-0.02em'}}>
                Shorten links in <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#9b8cff] to-[#6ee7b7]">seconds</span>, analyze clicks in <span className="text-indigo-300">real-time</span>.
              </h2>
              <p className="text-slate-300 max-w-xl">
                Create concise, brandable links with QR codes and per-link analytics. Perfect for social posts, campaigns, or developer tools.
              </p>

              <div className="flex flex-wrap gap-3 mt-2">
                <div className="flex items-center gap-2 bg-white/6 rounded-full px-4 py-2 text-xs text-slate-300">Instant creation</div>
                <div className="flex items-center gap-2 bg-white/6 rounded-full px-4 py-2 text-xs text-slate-300">QR & analytics</div>
                <div className="flex items-center gap-2 bg-white/6 rounded-full px-4 py-2 text-xs text-slate-300">Vanity aliases</div>
              </div>
            </div>

            <div className="p-6 md:p-10 border-l md:border-l-transparent">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                <label htmlFor="url" className="text-xs text-slate-300 font-medium">Paste your URL</label>
                <input
                  id="url"
                  type="text"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  placeholder="https://example.com/very/long/link"
                  className="w-full rounded-xl px-4 py-3 bg-white/6 border border-transparent placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 transition"
                />

                <label htmlFor="alias" className="text-xs text-slate-300 font-medium mt-2">Custom alias (optional)</label>
                <input
                  id="alias"
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="campaign-aug"
                  className="w-full rounded-xl px-4 py-3 bg-white/6 border border-transparent placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#34d399]/30 transition"
                />

                <div className="flex items-center gap-3 mt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-3 rounded-xl px-5 py-3 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] hover:scale-[1.01] transform transition shadow-lg"
                  >
                    {loading ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
                        <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="rgba(255,255,255,0.9)"/>
                      </svg>
                    ) : " "}
                    <span className="text-sm font-semibold">Create short link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl px-4 py-3 bg-white/6 text-sm border border-white/6 hover:bg-white/8 transition"
                  >
                    Reset
                  </button>

                  <div className="ml-auto text-xs text-slate-400">No account required</div>
                </div>

                <div className="text-xs text-slate-500 mt-2">
                  Tip: You can use a custom alias …
                </div>

                <div className="mt-4">
                  {!result && !error ? null : error ? (
                    <div className="rounded-lg bg-red-600/10 border border-red-600/20 p-3 text-sm text-red-200">
                      {error}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white/6 p-4 flex flex-col gap-3">
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-slate-300">Short link</div>
                          <a
                            href={result.shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm font-medium text-white truncate mt-1"
                          >
                            {result.shortUrl}
                          </a>
                          <div className="text-xs text-slate-400 mt-1">
                            {result.createdAt
                              ? `Created: ${new Date(result.createdAt).toLocaleString()}`
                              : ""}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => copyText(result.shortUrl)}
                            className="rounded-md px-3 py-2 bg-white/8 hover:bg-white/10 text-xs"
                          >
                            {copied ? "Copied ✓" : "Copy"}
                          </button>
                          <a
                            href={result.shortUrl}
                            className="rounded-md px-3 py-2 bg-white/8 hover:bg-white/10 text-xs"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-2 border-t border-white/6">
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-slate-300">Clicks</div>
                          <div className="text-sm font-medium text-white">
                            {result.clickCount ?? "-"}
                          </div>
                        </div>

                        {result.shortCode && (
                          <button
                            onClick={() => navigate(`/dashboard/${result.shortCode}`)}
                            className="text-xs text-slate-300 underline"
                          >
                            View analytics
                          </button>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="bg-white/8 p-2 rounded-md">
                          <QRCodeCanvas id="qr-canvas" value={result.shortUrl} size={92} />
                        </div>
                        <div className="flex gap-2 ml-auto">
                          <button
                            onClick={downloadQR}
                            className="rounded-md px-3 py-2 bg-white/8 hover:bg-white/10 text-xs"
                          >
                            Download QR
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </form>
            </div>
          </div>
        </section>

        <div className="mt-6 text-center text-xs text-slate-500">
          Built responsibly • Rate-limited • No tracking outside analytics for links you create
        </div>
      </div>
    </div>
  );
}
