import React, { useState, useEffect } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { CommentBox } from './components/DashboardComponents'

// Use relative path so Vite proxy can handle it (bypasses CORS/Antivirus issues)
const API_BASE = '/api'

function App() {
    const [profile, setProfile] = useState(null)
    const [activeTab, setActiveTab] = useState('search')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedJob, setSelectedJob] = useState(null)
    const [generatedLetter, setGeneratedLetter] = useState('')
    const [generatedEmail, setGeneratedEmail] = useState('')
    const [history, setHistory] = useState([])
    const [currentStep, setCurrentStep] = useState(0) // 0: Results, 1: Email, 2: Letter, 3: CV
    const [stats, setStats] = useState(null)
    const [choice, setChoice] = useState('Erfarenhetsmatch')
    const [cvMatchData, setCvMatchData] = useState(null)

    const choices = ["Tillväxt", "Samhällsnytta", "Teknik", "Ledarskap", "Erfarenhetsmatch", "Innovation", "Karriärbyte"]

    useEffect(() => {
        console.log("Hämtar från:", `${API_BASE}/cv`);
        fetch(`${API_BASE}/cv`)
            .then(res => {
                console.log("Svar status:", res.status);
                return res.json();
            })
            .then(data => {
                console.log("Profil laddad!");
                setProfile(data);
            })
            .catch(err => console.error("Backend error:", err))

        fetch(`${API_BASE}/history-stats`)
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Stats error:", err))

        setActiveTab('search')
    }, [])

    const startSearch = () => {
        setIsSearching(true)
        fetch(`${API_BASE}/search`)
            .then(res => res.json())
            .then(data => {
                setSearchResults(data)
                setIsSearching(false)
                setCurrentStep(0)
            })
    }

    const selectJob = (job) => {
        setSelectedJob(job)
        requestGeneration(job, 'Erfarenhetsmatch')
    }

    const requestGeneration = (job, selectedChoice) => {
        setChoice(selectedChoice)
        fetch(`${API_BASE}/generate-letter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: job.title,
                company: job.company,
                choice: selectedChoice,
                type: job.type,
                lead_job: job.lead_job
            })
        })
            .then(res => res.json())
            .then(data => {
                setGeneratedLetter(data.letter)
                setGeneratedEmail(data.email)
                setActiveTab('editor')
                setCurrentStep(1) // Move to Email step
            })
    }

    const fetchCvMatch = (job) => {
        fetch(`${API_BASE}/match-cv`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: job.title,
                company: job.company
            })
        })
            .then(res => {
                if (!res.ok) throw new Error(`Server svarade med status ${res.status}`);
                return res.json();
            })
            .then(data => {
                setCvMatchData(data)
                setCurrentStep(3)
            })
            .catch(err => {
                console.error("Match error:", err);
                alert("Kunde inte generera CV-matchning. Kontrollera att backend är uppdaterad.");
            });
    }

    const downloadPdf = () => {
        fetch(`${API_BASE}/download-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ letter: generatedLetter })
        })
            .then(res => res.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ansokan_${selectedJob.company}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
    }

    if (!profile) return <div className="loading">Synkar med Molnet... 🚀</div>

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="card profile-summary">
                    <div className="profile-placeholder" style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%)',
                        borderRadius: '50%',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)'
                    }}>
                        {profile?.kontakt_info?.namn?.charAt(0) || '?'}
                    </div>
                    <h1 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{profile?.kontakt_info?.namn}</h1>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{profile?.kontakt_info?.titel}</p>
                </div>

                <nav className="card">
                    <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
                        🚀 Big Search
                    </div>
                    <div className={`nav-item ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
                        ✍️ Generator
                    </div>
                    <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                        📄 Mitt CV
                    </div>
                </nav>

                {stats && (
                    <div className="card stats-card" style={{ marginTop: '1rem', padding: '1.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, margin: 0 }}>Statistik (Notion)</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem' }}>
                                <span className="pulse-dot"></span>
                                <span style={{ color: 'var(--accent-secondary)' }}>Live</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Totalt sökta</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                                    {stats.by_status['Sökt'] || 0}
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Aktiva</div>
                            </div>
                        </div>

                        {stats.last_sync && (
                            <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '1rem', fontStyle: 'italic' }}>
                                Senast synkad: {stats.last_sync}
                            </div>
                        )}

                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                            <label className="upload-btn" style={{
                                display: 'block',
                                textAlign: 'center',
                                padding: '0.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                            }}>
                                📁 Uppdatera från Notion (.zip)
                                <input
                                    type="file"
                                    accept=".zip"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            fetch(`${API_BASE}/upload-notion`, {
                                                method: 'POST',
                                                body: formData
                                            })
                                                .then(res => res.json())
                                                .then(data => {
                                                    alert(`Klart! Laddade upp ${data.count} jobb frän din CSV.`);
                                                    window.location.reload(); // Refresh to show new stats
                                                })
                                                .catch(err => alert("Fel vid uppladdning: " + err));
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                )}
            </aside>

            <main className="main-content">
                {activeTab === 'search' && (
                    <section>
                        <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '3rem' }}>
                            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Sök nästa utmaning</h2>
                            <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                                Starta motorn för att hitta 6 strategiskt matchade tjänster.
                            </p>
                            <button
                                className="big-button"
                                onClick={startSearch}
                                disabled={isSearching}
                            >
                                {isSearching ? 'Söker & Matchar...' : 'STARTA BIG SEARCH'}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="job-grid">
                                {searchResults.map((job) => (
                                    <div key={job.id} className="card job-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <span className={`badge ${job.type === 'spontaneous' ? 'badge-info' : 'badge-success'}`}>
                                                {job.type === 'spontaneous' ? 'Spontan' : 'Ledig tjänst'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)' }}>{job.commute}</span>
                                        </div>
                                        <h3 style={{ marginBottom: '0.25rem' }}>{job.title}</h3>
                                        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>{job.company} • {job.location}</p>

                                        {job.deadline && (
                                            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                                📅 Senaste ansökningsdag: <span style={{ color: 'var(--text-primary)' }}>{job.deadline}</span>
                                            </p>
                                        )}

                                        {job.history && (
                                            <div className="history-badge" style={{
                                                marginTop: '1rem',
                                                padding: '0.5rem',
                                                background: 'rgba(255, 107, 107, 0.1)',
                                                border: '1px solid rgba(255, 107, 107, 0.2)',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem'
                                            }}>
                                                <div style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: '2px' }}>
                                                    ⚠️ Tidigare kontakt
                                                </div>
                                                <div className="text-secondary">
                                                    Senast sökt: {job.history.last_applied} ({job.history.last_status})
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {job.type !== 'spontaneous' && job.link && (
                                                <a
                                                    href={job.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none' }}
                                                >
                                                    🔗 Visa annons
                                                </a>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                                            <button
                                                style={{ width: '100%' }}
                                                onClick={() => selectJob(job)}
                                            >
                                                Starta Workflow
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'editor' && selectedJob && (
                    <section>
                        <div className="card workflow-stepper" style={{ marginBottom: '1.5rem' }}>
                            <div className="stepper">
                                <div className={`step-item ${currentStep >= 1 ? 'active' : ''}`} onClick={() => setCurrentStep(1)}>Mejl</div>
                                {selectedJob.type !== 'spontaneous' && (
                                    <div className={`step-item ${currentStep >= 2 ? 'active' : ''}`} onClick={() => setCurrentStep(2)}>Brev</div>
                                )}
                                <div className={`step-item ${currentStep >= 3 ? 'active' : ''}`} onClick={() => setCurrentStep(3)}>CV</div>
                            </div>
                        </div>

                        {currentStep === 1 && (
                            <div className="card animate-fade">
                                <h3>Automatisk Mailtext</h3>
                                <p className="text-secondary" style={{ marginBottom: '1rem' }}>Kort intro till rekryteraren.</p>
                                <textarea
                                    className="textarea-minimal"
                                    value={generatedEmail}
                                    onChange={(e) => setGeneratedEmail(e.target.value)}
                                    style={{ minHeight: '120px' }}
                                />
                                <button style={{ marginTop: '1rem' }} onClick={() => {
                                    if (selectedJob.type === 'spontaneous') {
                                        fetchCvMatch(selectedJob);
                                    } else {
                                        setCurrentStep(2);
                                    }
                                }}>
                                    {selectedJob.type === 'spontaneous' ? 'Nästa: CV-Highlight' : 'Nästa: Skriv Brev'}
                                </button>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="card animate-fade">
                                <h3>Personligt Brev</h3>
                                <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                                    Välj en vinkel för varför du vill ha tjänsten:
                                </p>
                                <div className="choice-grid">
                                    {choices.map(c => (
                                        <button
                                            key={c}
                                            className={`choice-btn ${choice === c ? 'active' : ''}`}
                                            onClick={() => requestGeneration(selectedJob, c)}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    className="textarea-minimal"
                                    value={generatedLetter}
                                    onChange={(e) => setGeneratedLetter(e.target.value)}
                                    style={{ marginTop: '1.5rem', minHeight: '300px' }}
                                />
                                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                    <button onClick={downloadPdf}>Spara som PDF</button>
                                    <button style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => fetchCvMatch(selectedJob)}>Generera CV-Dokument</button>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && cvMatchData && (
                            <div className="card animate-fade">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
                                    <button style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => {
                                        if (selectedJob.type === 'spontaneous') {
                                            setCurrentStep(1);
                                        } else {
                                            setCurrentStep(2);
                                        }
                                    }}>← Tillbaka</button>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button onClick={() => window.print()} style={{ background: 'var(--accent-secondary)' }}>🖨️ Skriv ut</button>
                                        <button
                                            onClick={() => {
                                                const contact = cvMatchData.profile.kontakt_info;
                                                const exp = cvMatchData.profile.erfarenhet.map(e => `• ${e.roll} @ ${e.foretag} (${e.period})\n  ${e.beskrivning}`).join('\n\n');
                                                const edu = cvMatchData.profile.utbildning.map(u => `• ${u.program}, ${u.skola} (${u.period})`).join('\n');
                                                const matches = cvMatchData.matches.map(m => `[MATCH] ${m}`).join('\n');

                                                const text = `
${contact.namn.toUpperCase()} - ${contact.titel}
${contact.e_post} | ${contact.telefon} | ${contact.plats}

INTRODUKTION
${cvMatchData.summary}

TOPP 5 MATCHNINGAR FÖR ${selectedJob.company.toUpperCase()}
${matches}

ARBETSLIVSERFARENHET (URVAL)
${exp}

UTBILDNING
${edu}
`.trim();
                                                navigator.clipboard.writeText(text);
                                                alert('CV kopierat med fullständig information!');
                                            }}
                                            style={{ background: 'rgba(255,255,255,0.1)' }}
                                        >
                                            📋 Kopiera som text
                                        </button>
                                    </div>
                                </div>

                                <div className="document-view">
                                    <div className="document-header">
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <h2>{cvMatchData?.profile?.kontakt_info?.namn}</h2>
                                                <p style={{ color: '#666', fontSize: '0.9rem' }}>{cvMatchData?.profile?.kontakt_info?.titel}</p>
                                            </div>
                                            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
                                                <p>{cvMatchData?.profile?.kontakt_info?.e_post}</p>
                                                <p>{cvMatchData?.profile?.kontakt_info?.telefon}</p>
                                                <p>{cvMatchData?.profile?.kontakt_info?.plats}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="document-section">
                                        <h3>Introduktion</h3>
                                        <p style={{ fontSize: '1.05rem', fontStyle: 'italic', color: '#2c3e50' }}>
                                            {cvMatchData?.summary}
                                        </p>
                                    </div>

                                    <div className="document-section">
                                        <h3>Topp 5 Matchningar för {selectedJob.company}</h3>
                                        <ul className="match-list">
                                            {cvMatchData?.matches?.map((m, i) => (
                                                <li key={i} style={{ fontWeight: 600 }}>{m}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="document-section">
                                        <h3>Arbetslivserfarenhet (Urval)</h3>
                                        {cvMatchData?.profile?.erfarenhet?.map((e, i) => (
                                            <div key={i} style={{ marginBottom: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <strong>{e.roll} @ {e.foretag}</strong>
                                                    <span style={{ color: '#666', fontSize: '0.85rem' }}>{e.period}</span>
                                                </div>
                                                <p style={{ fontSize: '0.9rem', color: '#444' }}>{e.beskrivning}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="document-section">
                                        <h3>Utbildning</h3>
                                        {cvMatchData?.profile?.utbildning?.map((u, i) => (
                                            <div key={i}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <strong>{u.program}</strong>
                                                    <span style={{ color: '#666', fontSize: '0.85rem' }}>{u.period}</span>
                                                </div>
                                                <p style={{ fontSize: '0.9rem', color: '#444' }}>{u.skola}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', textAlign: 'center' }} className="no-print">
                                    <button onClick={() => setActiveTab('search')}>Klar! Sök nästa</button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'profile' && (
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>Min Profil & Historik</h2>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label className="choice-btn" style={{ cursor: 'pointer', margin: 0 }}>
                                    📥 Importera Notion (JSON)
                                    <input
                                        type="file"
                                        accept=".json"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    try {
                                                        const jsonData = JSON.parse(event.target.result);
                                                        fetch(`${API_BASE}/update-notion`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify(jsonData)
                                                        })
                                                            .then(res => res.json())
                                                            .then(data => {
                                                                alert(`Uppdaterat! Importerade ${data.count} jobb från Notion.`);
                                                                window.location.reload();
                                                            });
                                                    } catch (err) {
                                                        alert("Fel vid läsning av fil.");
                                                    }
                                                };
                                                reader.readAsText(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="profile-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Arbetslivserfarenhet</h3>
                                {profile.erfarenhet.map((e, i) => (
                                    <div key={i} style={{ marginBottom: '1.5rem', borderLeft: '2px solid var(--accent-primary)', paddingLeft: '1rem' }}>
                                        <div style={{ fontWeight: 'bold' }}>{e.roll}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{e.foretag} • {e.period}</div>
                                        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{e.beskrivning}</p>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Utbildning</h3>
                                {profile.utbildning.map((u, i) => (
                                    <div key={i} style={{ marginBottom: '1.5rem', borderLeft: '2px solid var(--accent-secondary)', paddingLeft: '1rem' }}>
                                        <div style={{ fontWeight: 'bold' }}>{u.program}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{u.skola} • {u.period}</div>
                                    </div>
                                ))}
                                <div style={{ marginTop: '2rem' }}>
                                    <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Publikationer</h3>
                                    {profile.publikationer.map((p, i) => <a key={i} href={p} target="_blank" className="text-secondary" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>{p}</a>)}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>
            <SpeedInsights />
        </div>
    )
}

export default App
