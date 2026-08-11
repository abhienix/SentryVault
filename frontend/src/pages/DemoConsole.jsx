import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, ShieldAlert, Database, Code, KeyRound, FolderSearch, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const DemoConsole = () => {
  const [demoStatus, setDemoStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('sqli');

  // Test Inputs & Results State
  const [sqliQuery, setSqliQuery] = useState("' OR '1'='1");
  const [sqliResult, setSqliResult] = useState(null);

  const [xssQuery, setXssQuery] = useState("<script>alert('XSS-Sentry-Demo')</script>");
  const [xssResult, setXssResult] = useState(null);

  const [bruteUser, setBruteUser] = useState('admin');
  const [brutePass, setBrutePass] = useState('wrongpassword');
  const [bruteResult, setBruteResult] = useState(null);

  const [pathFile, setPathFile] = useState('../../../etc/passwd');
  const [pathResult, setPathResult] = useState(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/demo/status')
      .then(res => setDemoStatus(res.data))
      .catch(err => setDemoStatus({ demo_mode: false, message: "Demo mode inactive or not found." }));
  }, []);

  const runSqliTest = async () => {
    setLoading(true);
    setSqliResult(null);
    try {
      const res = await axios.get(`/demo/search?q=${encodeURIComponent(sqliQuery)}`);
      setSqliResult({ status: res.status, data: res.data });
    } catch (err) {
      setSqliResult({ status: err.response?.status || 500, data: err.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  const runXssTest = async () => {
    setLoading(true);
    setXssResult(null);
    try {
      const res = await axios.get(`/demo/search-xss?q=${encodeURIComponent(xssQuery)}`);
      setXssResult({ status: res.status, rawHtml: res.data });
    } catch (err) {
      setXssResult({ status: err.response?.status || 500, data: err.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  const runBruteTest = async () => {
    setLoading(true);
    setBruteResult(null);
    try {
      const res = await axios.post('/demo/login', { username: bruteUser, password: brutePass });
      setBruteResult({ status: res.status, data: res.data });
    } catch (err) {
      setBruteResult({ status: err.response?.status || 401, data: err.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  const runPathTest = async () => {
    setLoading(true);
    setPathResult(null);
    try {
      const res = await axios.get(`/demo/statement?file=${encodeURIComponent(pathFile)}`);
      setPathResult({ status: res.status, data: res.data });
    } catch (err) {
      setPathResult({ status: err.response?.status || 500, data: err.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-bank-navy to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-bold tracking-tight">Sentry Security Demo Console</h2>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Intentionally vulnerable endpoints exposed under <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">/demo/*</code> namespace for Coraza WAF / Wazuh rule testing.
          </p>
        </div>

        <div className="shrink-0">
          {demoStatus?.demo_mode ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              DEMO_MODE=true ACTIVE
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-400" />
              DEMO_MODE=false (404 NOT FOUND)
            </span>
          )}
        </div>
      </div>

      {!demoStatus?.demo_mode && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Demo mode is currently set to <strong>false</strong> in application config. Requesting these endpoints will return strict 404 HTTP responses as per production security specification.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-bank-border gap-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('sqli')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'sqli'
              ? 'border-bank-blue text-bank-blue font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          SQL Injection
        </button>
        <button
          onClick={() => setActiveTab('xss')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'xss'
              ? 'border-bank-blue text-bank-blue font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code className="w-4 h-4" />
          Reflected XSS
        </button>
        <button
          onClick={() => setActiveTab('brute')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'brute'
              ? 'border-bank-blue text-bank-blue font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Brute Force Login
        </button>
        <button
          onClick={() => setActiveTab('path')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'path'
              ? 'border-bank-blue text-bank-blue font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderSearch className="w-4 h-4" />
          Path Traversal
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white p-6 rounded-2xl border border-bank-border shadow-sm space-y-5">
        {/* SQLi Tab */}
        {activeTab === 'sqli' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">SQL Injection Test (GET /demo/search?q=)</h3>
              <p className="text-xs text-slate-500">Executes raw SQL concatenation against MySQL without parameterized binding.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sqliQuery}
                onChange={(e) => setSqliQuery(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-bank-border rounded-xl font-mono text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-bank-accent"
              />
              <button
                onClick={runSqliTest}
                disabled={loading}
                className="px-4 py-2 bg-bank-blue hover:bg-bank-hover text-white text-xs font-semibold rounded-xl shrink-0 transition"
              >
                Send Request
              </button>
            </div>

            <div className="flex gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Presets:</span>
              <button onClick={() => setSqliQuery("' OR '1'='1")} className="text-bank-accent underline">
                ' OR '1'='1
              </button>
              <button onClick={() => setSqliQuery("' UNION SELECT 1, 'hacked', 'admin@hack.com', 'Hacker', 'ADMIN' -- ")} className="text-bank-accent underline">
                UNION Injection
              </button>
            </div>

            {sqliResult && (
              <div className="bg-slate-900 p-4 rounded-xl text-slate-200 font-mono text-xs overflow-x-auto space-y-2">
                <div className="text-amber-400 font-bold">HTTP Status: {sqliResult.status}</div>
                <pre>{JSON.stringify(sqliResult.data, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Reflected XSS Tab */}
        {activeTab === 'xss' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Reflected XSS Test (GET /demo/search-xss?q=)</h3>
              <p className="text-xs text-slate-500">Reflects parameter q directly into response body without HTML sanitization.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={xssQuery}
                onChange={(e) => setXssQuery(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-bank-border rounded-xl font-mono text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-bank-accent"
              />
              <button
                onClick={runXssTest}
                disabled={loading}
                className="px-4 py-2 bg-bank-blue hover:bg-bank-hover text-white text-xs font-semibold rounded-xl shrink-0 transition"
              >
                Send Request
              </button>
            </div>

            {xssResult && (
              <div className="space-y-2">
                <div className="bg-slate-900 p-4 rounded-xl text-slate-200 font-mono text-xs overflow-x-auto">
                  <div className="text-amber-400 font-bold mb-2">HTTP Status: {xssResult.status}</div>
                  <pre>{xssResult.rawHtml || JSON.stringify(xssResult.data, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Brute Force Tab */}
        {activeTab === 'brute' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Brute Force Test (POST /demo/login)</h3>
              <p className="text-xs text-slate-500">Fast authentication endpoint with no rate-limiting or IP lockout logic.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Username</label>
                <input
                  type="text"
                  value={bruteUser}
                  onChange={(e) => setBruteUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-bank-border rounded-xl font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password Candidate</label>
                <input
                  type="text"
                  value={brutePass}
                  onChange={(e) => setBrutePass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-bank-border rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            <button
              onClick={runBruteTest}
              disabled={loading}
              className="px-4 py-2 bg-bank-blue hover:bg-bank-hover text-white text-xs font-semibold rounded-xl transition"
            >
              Attempt Login Request
            </button>

            {bruteResult && (
              <div className="bg-slate-900 p-4 rounded-xl text-slate-200 font-mono text-xs overflow-x-auto">
                <div className={`font-bold mb-2 ${bruteResult.status === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  HTTP Status: {bruteResult.status}
                </div>
                <pre>{JSON.stringify(bruteResult.data, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Path Traversal Tab */}
        {activeTab === 'path' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Path Traversal Test (GET /demo/statement?file=)</h3>
              <p className="text-xs text-slate-500">Unsafely reads local file content based on query parameter without directory restriction.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={pathFile}
                onChange={(e) => setPathFile(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-bank-border rounded-xl font-mono text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-bank-accent"
              />
              <button
                onClick={runPathTest}
                disabled={loading}
                className="px-4 py-2 bg-bank-blue hover:bg-bank-hover text-white text-xs font-semibold rounded-xl shrink-0 transition"
              >
                Send Request
              </button>
            </div>

            <div className="flex gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Presets:</span>
              <button onClick={() => setPathFile('../../../etc/passwd')} className="text-bank-accent underline font-mono">
                ../../../etc/passwd
              </button>
              <button onClick={() => setPathFile('application.log')} className="text-bank-accent underline font-mono">
                application.log
              </button>
            </div>

            {pathResult && (
              <div className="bg-slate-900 p-4 rounded-xl text-slate-200 font-mono text-xs overflow-x-auto space-y-2">
                <div className="text-amber-400 font-bold">HTTP Status: {pathResult.status}</div>
                <pre>{JSON.stringify(pathResult.data, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
